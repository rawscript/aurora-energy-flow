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

// KPLC SMS number
const KPLC_SMS_NUMBER = "95551";

// SMS response patterns for KPLC
const SMS_PATTERNS = {
  BALANCE: /balance.*?(\d+(?:\.\d+)?)/i,
  TOKEN: /token.*?(\d{20})/i,
  UNITS: /units.*?(\d+(?:\.\d+)?)/i,
  METER_READING: /reading.*?(\d+)/i,
  BILL_AMOUNT: /bill.*?(\d+(?:\.\d+)?)/i,
  DUE_DATE: /due.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ACCOUNT: /account.*?(\d+)/i,
  REFERENCE: /ref(?:erence)?.*?([A-Z0-9]+)/i
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
    console.log('Fetching bill data via SMS:', { meterNumber, phoneNumber, userId });
    
    // Send balance inquiry SMS to KPLC
    const message = `BAL ${meterNumber}`;
    console.log('Sending SMS command to KPLC:', message);
    
    const smsResult = await sendSMS(KPLC_SMS_NUMBER, message, phoneNumber);
    console.log('SMS send result:', smsResult);
    
    if (!smsResult.success) {
      console.error('SMS send failed:', smsResult.error);
      throw new Error(`Failed to send SMS: ${smsResult.error}`);
    }

    // Wait for response - KPLC can take 30-60 seconds to respond
    await delay(45000); // Wait 45 seconds for KPLC response
    
    // Try to get response from SMS responses table
    const responseData = await getLatestSMSResponse(supabase, phoneNumber, 'balance');
    
    if (!responseData) {
      // No response received from KPLC - return empty state
      return { 
        success: false, 
        error: "No response received from KPLC. Please try again later.",
        code: "NO_SMS_RESPONSE",
        data: null
      };
    }

    // Parse real KPLC response
    const billData = parseBalanceResponse(responseData, meterNumber);

    // Store the real bill data
    const { error: storeError } = await supabase
      .from('kplc_bills')
      .insert({
        user_id: userId,
        account_name: billData.accountName || 'SMS User',
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
      console.error("Error storing SMS bill data:", storeError);
    }

    return { success: true, data: billData };
  } catch (error) {
    console.error('SMS bill fetch error:', error);
    return { success: false, error: error.message };
  }
}

async function purchaseTokensViaSMS(supabase: any, meterNumber: string, amount: number, phoneNumber: string, userId: string) {
  try {
    console.log('Purchasing tokens via SMS:', { meterNumber, amount, phoneNumber, userId });
    
    // Send token purchase SMS to KPLC
    const message = `BUY ${meterNumber} ${amount}`;
    console.log('Sending SMS command to KPLC:', message);
    
    const smsResult = await sendSMS(KPLC_SMS_NUMBER, message, phoneNumber);
    console.log('SMS send result:', smsResult);
    
    if (!smsResult.success) {
      console.error('SMS send failed:', smsResult.error);
      throw new Error(`Failed to send SMS: ${smsResult.error}`);
    }

    // Wait for response - Token generation can take longer
    await delay(60000); // Wait 60 seconds for token generation
    
    // Try to get response from SMS responses table
    const responseData = await getLatestSMSResponse(supabase, phoneNumber, 'token');
    
    if (!responseData) {
      // No response received from KPLC - return empty state
      return { 
        success: false, 
        error: "No token response received from KPLC. Please try again later.",
        code: "NO_SMS_RESPONSE",
        data: null
      };
    }

    // Parse real KPLC token response
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
      console.error("Error storing SMS token transaction:", storeError);
    }

    return { success: true, data: tokenData };
  } catch (error) {
    console.error('SMS token purchase error:', error);
    return { success: false, error: error.message };
  }
}

async function sendSMS(to: string, message: string, from: string) {
  try {
    console.log('Sending SMS via Africa\'s Talking:', { to, message, from, username: AT_USERNAME });
    
    const response = await fetch(`${AT_BASE_URL}/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY!,
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        username: AT_USERNAME!,
        to: to,
        message: message,
        from: from
      })
    });

    const result = await response.json();
    console.log('Africa\'s Talking SMS response:', result);
    
    if (result.SMSMessageData && result.SMSMessageData.Recipients) {
      const recipient = result.SMSMessageData.Recipients[0];
      if (recipient.status === 'Success') {
        console.log('SMS sent successfully:', recipient);
        return { success: true, data: recipient };
      } else {
        console.error('SMS failed:', recipient);
        return { success: false, error: recipient.status };
      }
    }
    
    console.error('Invalid SMS response format:', result);
    return { success: false, error: 'Invalid response format' };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
}

async function getLatestSMSResponse(supabase: any, phoneNumber: string, type: string) {
  try {
    const { data, error } = await supabase
      .from('sms_responses')
      .select('message')
      .eq('phone_number', phoneNumber)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching SMS response:', error);
      return null;
    }

    return data?.message || null;
  } catch (error) {
    console.error('Error getting SMS response:', error);
    return null;
  }
}

function parseBalanceResponse(message: string, meterNumber: string) {
  const balance = extractPattern(message, SMS_PATTERNS.BALANCE);
  const reading = extractPattern(message, SMS_PATTERNS.METER_READING);
  const billAmount = extractPattern(message, SMS_PATTERNS.BILL_AMOUNT);
  const dueDate = extractPattern(message, SMS_PATTERNS.DUE_DATE);
  const accountNumber = extractPattern(message, SMS_PATTERNS.ACCOUNT);

  // Calculate consumption only if we have valid readings
  const currentReading = reading ? parseInt(reading) : null;
  const previousReading = currentReading ? Math.max(0, currentReading - 100) : null;
  const consumption = (currentReading && previousReading) ? currentReading - previousReading : null;

  return {
    accountName: 'SMS User',
    accountNumber: accountNumber || meterNumber,
    meterNumber,
    currentReading: currentReading || 0,
    previousReading: previousReading || 0,
    consumption: consumption || 0,
    billAmount: billAmount ? parseFloat(billAmount) : 0,
    outstandingBalance: balance ? parseFloat(balance) : 0,
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    billingPeriod: getCurrentBillingPeriod(),
    status: balance && parseFloat(balance) > 0 ? 'active' : 'inactive',
    fetchedAt: new Date().toISOString(),
    source: 'sms',
    address: null, // No address from SMS
    tariff: null   // No tariff info from SMS
  };
}

function parseTokenResponse(message: string, amount: number) {
  const tokenCode = extractPattern(message, SMS_PATTERNS.TOKEN);
  const units = extractPattern(message, SMS_PATTERNS.UNITS);
  const reference = extractPattern(message, SMS_PATTERNS.REFERENCE);

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