import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

// CORS headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await req.json();
    const { action, user_id, meter_number, amount, phone_number } = body;

    if (!user_id || !meter_number) {
      return new Response(JSON.stringify({
        error: "user_id and meter_number are required",
        code: "MISSING_PARAMETERS"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    // Get user profile to retrieve ID number
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get user's ID number from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({
        error: "Failed to fetch user profile",
        code: "PROFILE_FETCH_ERROR"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    const id_number = profile.phone_number;

    // Initialize Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ]
    });

    try {
      let result;

      if (action === "fetch_bill_data") {
        result = await fetchBillData(browser, meter_number, id_number);
      } else if (action === "purchase_tokens") {
        if (!amount) {
          return new Response(JSON.stringify({
            error: "amount is required for token purchase",
            code: "MISSING_AMOUNT"
          }), {
            headers: corsHeaders,
            status: 400,
          });
        }
        result = await purchaseTokens(browser, meter_number, id_number, amount, phone_number);
      } else {
        return new Response(JSON.stringify({
          error: "Invalid action. Supported actions: fetch_bill_data, purchase_tokens",
          code: "INVALID_ACTION"
        }), {
          headers: corsHeaders,
          status: 400,
        });
      }

      // Store the result in the database
      if (result.success) {
        if (action === "fetch_bill_data") {
          // Store bill data
          const { error: storeError } = await supabase
            .from('kplc_bills')
            .insert({
              user_id: user_id,
              account_name: result.data.accountName,
              account_number: result.data.accountNumber,
              meter_number: result.data.meterNumber,
              current_reading: result.data.currentReading,
              previous_reading: result.data.previousReading,
              consumption: result.data.consumption,
              bill_amount: result.data.billAmount,
              due_date: result.data.dueDate,
              billing_period: result.data.billingPeriod,
              last_payment_date: result.data.lastPaymentDate,
              last_payment_amount: result.data.lastPaymentAmount,
              outstanding_balance: result.data.outstandingBalance,
              address: result.data.address,
              tariff: result.data.tariff,
              status: result.data.status,
              fetched_at: result.data.fetchedAt
            });

          if (storeError) {
            console.error("Error storing bill data:", storeError);
          }
        } else if (action === "purchase_tokens") {
          // For token purchases, the database functions will handle storage
        }
      }

      return new Response(JSON.stringify({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          user_id: user_id,
          meter_number: meter_number,
          action: action
        }
      }), {
        headers: corsHeaders,
      });
    } finally {
      // Close browser
      await browser.close();
    }
  } catch (error) {
    console.error("Unexpected error in puppeteer_kplc_service:", {
      message: error.message,
      stack: error.stack,
      input: error.input || {}
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while processing your request.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});

async function fetchBillData(browser: any, meterNumber: string, idNumber: string) {
  const page = await browser.newPage();
  
  try {
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set timeout
    page.setDefaultTimeout(30000);
    
    // Navigate to KPLC self-service portal
    await page.goto('https://selfservice.kplc.co.ke/', { waitUntil: 'networkidle2' });
    
    // Wait for login form
    await page.waitForSelector('#meterno', { timeout: 10000 });
    
    // Fill in meter number
    await page.type('#meterno', meterNumber);
    
    // Fill in ID number
    await page.type('#idno', idNumber);
    
    // Submit form
    await Promise.all([
      page.click('#btnlogin'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // Check if login was successful
    const errorElement = await page.$('.alert-danger');
    if (errorElement) {
      const errorMessage = await page.evaluate(el => el.textContent, errorElement);
      if (errorMessage?.includes('Invalid')) {
        throw new Error('Invalid meter number or ID number');
      }
      throw new Error('Login failed');
    }
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-content', { timeout: 15000 });
    
    // Extract bill data
    const billData = await page.evaluate(() => {
      const getText = (selector: string) => {
        const element = document.querySelector(selector);
        return element ? element.textContent?.trim() || '' : '';
      };
      
      const getNumber = (selector: string) => {
        const text = getText(selector);
        const number = text.replace(/[^\d.-]/g, '');
        return number ? parseFloat(number) : 0;
      };
      
      return {
        accountName: getText('#accountName'),
        accountNumber: getText('#accountNumber'),
        meterNumber: getText('#meterNumber'),
        currentReading: getNumber('#currentReading'),
        previousReading: getNumber('#previousReading'),
        consumption: getNumber('#consumption'),
        billAmount: getNumber('#billAmount'),
        dueDate: getText('#dueDate'),
        billingPeriod: getText('#billingPeriod'),
        lastPaymentDate: getText('#lastPaymentDate'),
        lastPaymentAmount: getNumber('#lastPaymentAmount'),
        outstandingBalance: getNumber('#outstandingBalance'),
        address: getText('#address'),
        tariff: getText('#tariff'),
        status: getText('#status').toLowerCase().includes('active') ? 'active' : 'inactive',
        fetchedAt: new Date().toISOString()
      };
    });
    
    // Validate data
    if (!billData.accountNumber || !billData.meterNumber) {
      throw new Error('Could not extract account information');
    }
    
    return { success: true, data: billData };
  } catch (error) {
    console.error('Puppeteer error:', error);
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

async function purchaseTokens(browser: any, meterNumber: string, idNumber: string, amount: number, phoneNumber: string) {
  // This would be the implementation for purchasing tokens via Puppeteer
  // For now, we'll return a simulated response
  const tokenCode = "0".repeat(20 - amount.toString().length) + amount.toString().repeat(20 / amount.toString().length).substring(0, 20);
  const referenceNumber = "TXN" + new Date().toISOString().replace(/[^0-9]/g, "").substring(0, 12);
  
  return {
    success: true,
    data: {
      tokenCode: tokenCode,
      referenceNumber: referenceNumber,
      amount: amount,
      units: amount, // 1 KSh = 1 unit
      timestamp: new Date().toISOString()
    }
  };
}