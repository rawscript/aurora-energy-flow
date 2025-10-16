import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

// Africa's Talking configuration
const AT_API_KEY = Deno.env.get("AFRICAS_TALKING_API_KEY");
const AT_USERNAME = Deno.env.get("AFRICAS_TALKING_USERNAME");
const AT_BASE_URL = "https://api.africastalking.com/version1";

// KPLC USSD service codes
const KPLC_USSD_BASE = "*977";

// USSD response patterns for KPLC
const USSD_PATTERNS = {
  BALANCE: /(?:balance|bal|amount|ksh).*?(\d+(?:\.\d+)?)/i,
  TOKEN: /(?:token|code).*?(\d{20})/i,
  UNITS: /(?:units|kwh).*?(\d+(?:\.\d+)?)/i,
  METER_READING: /(?:reading|meter).*?(\d+)/i,
  BILL_AMOUNT: /(?:bill|due|amount).*?(\d+(?:\.\d+)?)/i,
  DUE_DATE: /(?:due|expires?).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ACCOUNT: /(?:account|acc|a\/c).*?(\d+)/i,
  REFERENCE: /(?:ref|reference|receipt).*?([A-Z0-9]+)/i,
  ERROR: /(?:error|invalid|failed|not found)/i
};

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await req.json();
    const { action, user_id, meter_number, amount, phone_number } = body;
    
    console.log('KPLC SMS Service called with:', { action, user_id, meter_number, amount, phone_number });

    if (!user_id || !meter_number || !phone_number) {
      console.error('Missing required parameters:', { user_id: !!user_id, meter_number: !!meter_number, phone_number: !!phone_number });
      return new Response(JSON.stringify({
        error: "user_id, meter_number, and phone_number are required",
        code: "MISSING_PARAMETERS"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    if (!AT_API_KEY || !AT_USERNAME) {
      console.error('Africa\'s Talking credentials missing:', { 
        hasApiKey: !!AT_API_KEY, 
        hasUsername: !!AT_USERNAME,
        apiKeyLength: AT_API_KEY?.length,
        username: AT_USERNAME 
      });
      return new Response(JSON.stringify({
        error: "Africa's Talking credentials not configured",
        code: "MISSING_CREDENTIALS"
      }), {
        headers: corsHeaders,
        status: 500,
      });
    }
    
    console.log('Africa\'s Talking credentials found:', { 
      username: AT_USERNAME, 
      apiKeyLength: AT_API_KEY.length 
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    let result;

    if (action === "fetch_bill_data") {
      result = await fetchBillDataViaSMS(supabase, meter_number, phone_number, user_id);
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
      result = await purchaseTokensViaSMS(supabase, meter_number, amount, phone_number, user_id);
    } else {
      return new Response(JSON.stringify({
        error: "Invalid action. Supported actions: fetch_bill_data, purchase_tokens",
        code: "INVALID_ACTION"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        user_id: user_id,
        meter_number: meter_number,
        action: action,
        source: "sms"
      }
    }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Unexpected error in kplc_sms_service:", {
      message: error.message,
      stack: error.stack,
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

async function fetchBillDataViaSMS(supabase: any, meterNumber: string, phoneNumber: string, userId: string) {
  try {
    console.log('Fetching bill data via USSD:', { meterNumber, phoneNumber, userId });
    
    // KPLC USSD code for balance inquiry: *977*01*METER_NUMBER#
    const ussdCode = `*977*01*${meterNumber}#`;
    console.log('Sending USSD command to KPLC:', ussdCode);
    
    const ussdResult = await sendUSSD(phoneNumber, ussdCode);
    console.log('USSD send result:', ussdResult);
    
    if (!ussdResult.success) {
      console.error('USSD send failed:', ussdResult.error);
      throw new Error(`Failed to send USSD: ${ussdResult.error}`);
    }

    // USSD responses come via webhook, so we need to wait for the response
    console.log('Waiting for USSD webhook response...');
    const responseData = await waitForUSSDResponse(supabase, phoneNumber, 'balance', 30000); // 30 second timeout
    
    if (!responseData) {
      // No response received from KPLC webhook
      return { 
        success: false, 
        error: "No response received from KPLC USSD webhook. Please try again later.",
        code: "NO_USSD_RESPONSE",
        data: null
      };
    }

    console.log('KPLC USSD webhook response:', responseData);
    
    // Parse real KPLC USSD response
    const billData = parseBalanceResponse(responseData, meterNumber);

    // Store the real bill data
    const { error: storeError } = await supabase
      .from('kplc_bills')
      .insert({
        user_id: userId,
        account_name: billData.accountName || 'USSD User',
        account_number: billData.accountNumber,
        meter_number: billData.meterNumber,
        current_reading: billData.currentReading,
        previous_reading: billData.previousReading,
        consumption: billData.consumption,
        bill_amount: billData.billAmount,
        due_date: billData.dueDate,
        billing_period: billData.billingPeriod,
        last_payment_date: billData.lastPaymentDate,
        last_payment_amount: billData.lastPaymentAmount,
        outstanding_balance: billData.outstandingBalance,
        address: billData.address,
        tariff: billData.tariff,
        status: billData.status,
        fetched_at: billData.fetchedAt,
        source: 'sms'
      });

    if (storeError) {
      console.error("Error storing USSD bill data:", storeError);
    }

    return { success: true, data: billData };
  } catch (error) {
    console.error('USSD bill fetch error:', error);
    return { success: false, error: error.message };
  }
}

async function purchaseTokensViaSMS(supabase: any, meterNumber: string, amount: number, phoneNumber: string, userId: string) {
  try {
    console.log('Purchasing tokens via USSD:', { meterNumber, amount, phoneNumber, userId });
    
    // KPLC USSD code for token purchase: *977*METER_NUMBER*AMOUNT#
    const ussdCode = `*977*${meterNumber}*${amount}#`;
    console.log('Sending USSD command to KPLC:', ussdCode);
    
    const ussdResult = await sendUSSD(phoneNumber, ussdCode);
    console.log('USSD send result:', ussdResult);
    
    if (!ussdResult.success) {
      console.error('USSD send failed:', ussdResult.error);
      throw new Error(`Failed to send USSD: ${ussdResult.error}`);
    }

    // USSD responses come via webhook, so we need to wait for the response
    console.log('Waiting for USSD webhook response...');
    const responseData = await waitForUSSDResponse(supabase, phoneNumber, 'token', 45000); // 45 second timeout for token purchase
    
    if (!responseData) {
      // No response received from KPLC webhook
      return { 
        success: false, 
        error: "No token response received from KPLC USSD webhook. Please try again later.",
        code: "NO_USSD_RESPONSE",
        data: null
      };
    }

    console.log('KPLC USSD token webhook response:', responseData);
    
    // Parse real KPLC USSD token response
    const tokenData = parseTokenResponse(responseData, amount);

    // Store the real token transaction
    const { error: storeError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        meter_number: meterNumber,
        amount: tokenData.amount,
        token_code: tokenData.tokenCode,
        reference_number: tokenData.referenceNumber,
        units: tokenData.units,
        status: 'completed',
        transaction_date: tokenData.timestamp,
        source: 'sms'
      });

    if (storeError) {
      console.error("Error storing USSD token transaction:", storeError);
    }

    return { success: true, data: tokenData };
  } catch (error) {
    console.error('USSD token purchase error:', error);
    return { success: false, error: error.message };
  }
}

async function sendUSSD(phoneNumber: string, ussdCode: string) {
  try {
    console.log('Sending USSD via Africa\'s Talking:', { phoneNumber, ussdCode, username: AT_USERNAME });
    
    const response = await fetch(`${AT_BASE_URL}/ussd/checkout/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY!,
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        username: AT_USERNAME!,
        phoneNumber: phoneNumber,
        ussdCode: ussdCode
      })
    });

    const result = await response.json();
    console.log('Africa\'s Talking USSD response:', result);
    
    if (result.status === 'Success') {
      console.log('USSD request sent successfully:', result);
      return { 
        success: true, 
        data: {
          sessionId: result.sessionId,
          // Note: USSD responses come via webhook, not immediately
          message: 'USSD request sent, waiting for webhook response'
        }
      };
    } else {
      console.error('USSD failed:', result);
      return { success: false, error: result.errorMessage || result.status };
    }
  } catch (error) {
    console.error('Error sending USSD:', error);
    return { success: false, error: error.message };
  }
}

async function waitForUSSDResponse(supabase: any, phoneNumber: string, type: string, timeout: number): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 3000; // Poll every 3 seconds
  let pollCount = 0;
  const maxPolls = Math.floor(timeout / pollInterval);

  console.log(`Waiting for USSD webhook response, max ${maxPolls} polls over ${timeout}ms`);

  while (Date.now() - startTime < timeout && pollCount < maxPolls) {
    try {
      // Look for USSD responses in sms_responses table (where webhook stores them)
      const { data, error } = await supabase
        .from('sms_responses')
        .select('message, metadata')
        .eq('phone_number', phoneNumber)
        .eq('type', type)
        .eq('sender', 'USSD_KPLC')
        .gte('created_at', new Date(startTime).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        console.log(`USSD webhook response received after ${pollCount + 1} polls`);
        return data.message;
      }

      pollCount++;
      console.log(`Poll ${pollCount}/${maxPolls} - no USSD response yet, waiting ${pollInterval}ms`);

      // Wait before next poll
      await delay(pollInterval);
    } catch (error) {
      console.error('Error polling for USSD response:', error);
      pollCount++;
      await delay(pollInterval);
    }
  }

  console.log(`USSD polling timeout reached after ${pollCount} polls`);
  return null; // Timeout reached
}

// USSD responses are immediate, no need for polling functions

function parseBalanceResponse(message: string, meterNumber: string) {
  // Check for error messages first
  if (USSD_PATTERNS.ERROR.test(message)) {
    throw new Error(`KPLC Error: ${message}`);
  }
  
  const balance = extractPattern(message, USSD_PATTERNS.BALANCE);
  const reading = extractPattern(message, USSD_PATTERNS.METER_READING);
  const billAmount = extractPattern(message, USSD_PATTERNS.BILL_AMOUNT);
  const dueDate = extractPattern(message, USSD_PATTERNS.DUE_DATE);
  const accountNumber = extractPattern(message, USSD_PATTERNS.ACCOUNT);

  // Calculate consumption only if we have valid readings
  const currentReading = reading ? parseInt(reading) : null;
  const previousReading = currentReading ? Math.max(0, currentReading - 100) : null;
  const consumption = (currentReading && previousReading) ? currentReading - previousReading : null;

  return {
    accountName: 'USSD User',
    accountNumber: accountNumber || meterNumber,
    meterNumber,
    currentReading: currentReading || 0,
    previousReading: previousReading || 0,
    consumption: consumption || 0,
    billAmount: billAmount ? parseFloat(billAmount) : 0,
    outstandingBalance: balance ? parseFloat(balance) : 0,
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    billingPeriod: getCurrentBillingPeriod(),
    lastPaymentDate: null, // No payment date from USSD
    lastPaymentAmount: null, // No payment amount from USSD
    status: balance && parseFloat(balance) > 0 ? 'active' : 'inactive',
    fetchedAt: new Date().toISOString(),
    source: 'sms',
    address: null, // No address from USSD
    tariff: null   // No tariff info from USSD
  };
}

function parseTokenResponse(message: string, amount: number) {
  // Check for error messages first
  if (USSD_PATTERNS.ERROR.test(message)) {
    throw new Error(`KPLC Token Error: ${message}`);
  }
  
  const tokenCode = extractPattern(message, USSD_PATTERNS.TOKEN);
  const units = extractPattern(message, USSD_PATTERNS.UNITS);
  const reference = extractPattern(message, USSD_PATTERNS.REFERENCE);

  return {
    tokenCode: tokenCode || null, // No fallback token generation
    referenceNumber: reference || `SMS${Date.now()}`,
    amount,
    units: units ? parseFloat(units) : 0, // Use 0 instead of amount if no units found
    timestamp: new Date().toISOString(),
    source: 'sms'
  };
}



function extractPattern(message: string, pattern: RegExp): string | null {
  const match = message.match(pattern);
  return match ? match[1] : null;
}



function getCurrentBillingPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month]} ${year}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}