/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent",
  "Access-Control-Max-Age": "86400",
};

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse the incoming data from Africa's Talking USSD webhook
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const sessionId = params.get('sessionId');
    const phoneNumber = params.get('phoneNumber');
    const networkCode = params.get('networkCode');
    const serviceCode = params.get('serviceCode');
    const text = params.get('text');
    const status = params.get('status'); // "Success" or "Failed"

    console.log('Received USSD webhook:', {
      sessionId,
      phoneNumber,
      networkCode,
      serviceCode,
      text,
      status,
      timestamp: new Date().toISOString()
    });

    if (!sessionId || !phoneNumber) {
      return new Response(JSON.stringify({
        error: "Invalid USSD webhook data - missing sessionId or phoneNumber",
        code: "INVALID_WEBHOOK_DATA"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    // Store the USSD response for processing
    await storeUSSDResponse(supabase, {
      sessionId,
      phoneNumber,
      networkCode,
      serviceCode,
      text,
      status,
      timestamp: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      message: "USSD response processed successfully",
      sessionId,
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("Error processing USSD webhook:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to process USSD webhook",
      code: "WEBHOOK_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});

async function storeUSSDResponse(supabase: any, data: {
  sessionId: string;
  phoneNumber: string;
  networkCode: string | null;
  serviceCode: string | null;
  text: string | null;
  status: string | null;
  timestamp: string;
}) {
  try {
    // Determine message type based on service code or content
    let messageType = 'general';
    
    if (data.serviceCode?.includes('977') || data.text?.toLowerCase().includes('balance') || 
        data.text?.toLowerCase().includes('bal') || data.text?.toLowerCase().includes('amount')) {
      messageType = 'balance';
    } else if (data.text?.toLowerCase().includes('token') ||
               data.text?.toLowerCase().includes('units') ||
               data.text?.toLowerCase().includes('purchase')) {
      messageType = 'token';
    }

    // Store the USSD response in sms_responses table (reusing existing table)
    const { error } = await supabase
      .from('sms_responses')
      .insert({
        phone_number: data.phoneNumber,
        message: data.text || '',
        type: messageType,
        sender: 'USSD_KPLC',
        metadata: {
          session_id: data.sessionId,
          network_code: data.networkCode,
          service_code: data.serviceCode,
          ussd_status: data.status,
          received_at: data.timestamp,
          source: 'ussd',
          webhook_processed: true
        }
      });

    if (error) {
      console.error('Error storing USSD response:', error);
      throw error;
    }

    console.log(`Stored USSD response: ${messageType} message for ${data.phoneNumber}, session: ${data.sessionId}`);
    
    // Process the response based on type
    if (messageType === 'token' && data.text) {
      await processUSSDTokenMessage(supabase, data.phoneNumber, data.text);
    }
    
    if (messageType === 'balance' && data.text) {
      await processUSSDBalanceMessage(supabase, data.phoneNumber, data.text);
    }

  } catch (error) {
    console.error('Error in storeUSSDResponse:', error);
    throw error;
  }
}

async function processUSSDTokenMessage(supabase: any, phoneNumber: string, message: string) {
  try {
    const tokenMatch = message.match(USSD_PATTERNS.TOKEN);
    const unitsMatch = message.match(USSD_PATTERNS.UNITS);
    const amountMatch = message.match(USSD_PATTERNS.BALANCE);
    const referenceMatch = message.match(USSD_PATTERNS.REFERENCE);

    if (tokenMatch) {
      // Find the user associated with this phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, meter_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        const { error } = await supabase
          .from('token_transactions')
          .insert({
            user_id: profile.id,
            meter_number: profile.meter_number || 'USSD_METER',
            token_code: tokenMatch[1],
            amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
            units: unitsMatch ? parseFloat(unitsMatch[1]) : 0,
            reference_number: referenceMatch ? referenceMatch[1] : `USSD${Date.now()}`,
            status: 'completed',
            transaction_date: new Date().toISOString(),
            source: 'sms'
          });

        if (error) {
          console.error('Error storing USSD token transaction:', error);
        } else {
          console.log('Successfully stored USSD token transaction');
        }
      }
    }
  } catch (error) {
    console.error('Error processing USSD token message:', error);
  }
}

async function processUSSDBalanceMessage(supabase: any, phoneNumber: string, message: string) {
  try {
    const balanceMatch = message.match(USSD_PATTERNS.BALANCE);
    const readingMatch = message.match(USSD_PATTERNS.METER_READING);
    const billMatch = message.match(USSD_PATTERNS.BILL_AMOUNT);
    const accountMatch = message.match(USSD_PATTERNS.ACCOUNT);

    if (balanceMatch || readingMatch || billMatch) {
      // Find the user associated with this phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, meter_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        const currentReading = readingMatch ? parseInt(readingMatch[1]) : 0;
        const previousReading = currentReading > 100 ? currentReading - 100 : 0;
        
        const { error } = await supabase
          .from('kplc_bills')
          .insert({
            user_id: profile.id,
            account_name: 'USSD User',
            account_number: accountMatch ? accountMatch[1] : profile.meter_number,
            meter_number: profile.meter_number || 'USSD_METER',
            current_reading: currentReading,
            previous_reading: previousReading,
            consumption: currentReading - previousReading,
            bill_amount: billMatch ? parseFloat(billMatch[1]) : 0,
            outstanding_balance: balanceMatch ? parseFloat(balanceMatch[1]) : 0,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            billing_period: getCurrentBillingPeriod(),
            status: balanceMatch && parseFloat(balanceMatch[1]) > 0 ? 'active' : 'inactive',
            fetched_at: new Date().toISOString(),
            source: 'sms'
          });

        if (error) {
          console.error('Error storing USSD bill data:', error);
        } else {
          console.log('Successfully stored USSD bill data');
        }
      }
    }
  } catch (error) {
    console.error('Error processing USSD balance message:', error);
  }
}

function getCurrentBillingPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[month]} ${year}`;
}