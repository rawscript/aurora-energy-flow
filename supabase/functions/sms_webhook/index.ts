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

    // Parse the incoming data from Africa's Talking
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    // Check if this is a delivery report
    const status = params.get('status');
    const messageId = params.get('id');
    const phoneNumber = params.get('phoneNumber');
    const networkCode = params.get('networkCode');
    const retryCount = params.get('retryCount');
    
    // Check if this is an incoming SMS
    const from = params.get('from');
    const to = params.get('to');
    const text = params.get('text');
    const date = params.get('date');
    const linkId = params.get('linkId');

    console.log('Received webhook:', {
      type: status ? 'delivery_report' : 'incoming_sms',
      from,
      to,
      text,
      date,
      messageId,
      status,
      phoneNumber,
      networkCode,
      retryCount,
      linkId
    });

    // Handle delivery reports for Aurora SMS alerts
    if (status && messageId) {
      await handleDeliveryReport(supabase, messageId, status, phoneNumber, {
        networkCode,
        retryCount,
        timestamp: new Date().toISOString()
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: "Delivery report processed successfully",
        timestamp: new Date().toISOString()
      }), {
        headers: corsHeaders,
      });
    }

    // Handle incoming SMS
    if (from && text) {
      // Check if this is from KPLC (95551)
      if (from === '95551' || from === '+25495551') {
        // This is a response from KPLC, store it for processing
        await storeKPLCResponse(supabase, to, text, from, date, messageId);
      } else {
        // This might be a user sending a command, handle accordingly
        await handleUserSMS(supabase, from, text, to, date, messageId);
      }
    } else {
      return new Response(JSON.stringify({
        error: "Invalid webhook data - missing required fields",
        code: "INVALID_WEBHOOK_DATA"
      }), {
        headers: corsHeaders,
        status: 400,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "SMS processed successfully",
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("Error processing SMS webhook:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to process SMS webhook",
      code: "WEBHOOK_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: corsHeaders,
      status: 500,
    });
  }
});

async function storeKPLCResponse(
  supabase: any, 
  phoneNumber: string, 
  message: string, 
  sender: string, 
  date: string | null, 
  messageId: string | null
) {
  try {
    // Determine message type based on content
    let messageType = 'general';
    
    if (message.toLowerCase().includes('balance') || 
        message.toLowerCase().includes('bal') ||
        message.toLowerCase().includes('amount') ||
        message.toLowerCase().includes('bill')) {
      messageType = 'balance';
    } else if (message.toLowerCase().includes('token') ||
               message.toLowerCase().includes('units') ||
               message.toLowerCase().includes('ksh') ||
               message.toLowerCase().includes('purchase')) {
      messageType = 'token';
    }

    // Store the SMS response
    const { error } = await supabase
      .from('sms_responses')
      .insert({
        phone_number: phoneNumber,
        message: message,
        type: messageType,
        sender: sender,
        metadata: {
          received_at: date || new Date().toISOString(),
          message_id: messageId,
          auto_classified: true,
          classification_confidence: messageType !== 'general' ? 'high' : 'low',
          webhook_processed: true
        }
      });

    if (error) {
      console.error('Error storing KPLC SMS response:', error);
      throw error;
    }

    console.log(`Stored KPLC SMS response: ${messageType} message from ${sender} to ${phoneNumber}`);
    
    // If this is a token message, try to extract and store token data
    if (messageType === 'token') {
      await processTokenMessage(supabase, phoneNumber, message);
    }
    
    // If this is a balance message, try to extract and store bill data
    if (messageType === 'balance') {
      await processBalanceMessage(supabase, phoneNumber, message);
    }

  } catch (error) {
    console.error('Error in storeKPLCResponse:', error);
    throw error;
  }
}

async function handleUserSMS(
  supabase: any, 
  from: string, 
  message: string, 
  to: string, 
  date: string | null, 
  messageId: string | null
) {
  try {
    // Log user SMS for debugging/monitoring
    console.log(`User SMS from ${from}: ${message}`);
    
    // You could implement auto-responses or commands here
    // For now, just log it
    
    const { error } = await supabase
      .from('sms_responses')
      .insert({
        phone_number: from,
        message: message,
        type: 'user_command',
        sender: from,
        metadata: {
          received_at: date || new Date().toISOString(),
          message_id: messageId,
          destination: to,
          webhook_processed: true
        }
      });

    if (error) {
      console.error('Error storing user SMS:', error);
    }

  } catch (error) {
    console.error('Error in handleUserSMS:', error);
  }
}

async function processTokenMessage(supabase: any, phoneNumber: string, message: string) {
  try {
    // Extract token information using regex patterns
    const tokenPattern = /token.*?(\d{20})/i;
    const unitsPattern = /units.*?(\d+(?:\.\d+)?)/i;
    const amountPattern = /ksh.*?(\d+(?:\.\d+)?)/i;
    const referencePattern = /ref(?:erence)?.*?([A-Z0-9]+)/i;

    const tokenMatch = message.match(tokenPattern);
    const unitsMatch = message.match(unitsPattern);
    const amountMatch = message.match(amountPattern);
    const referenceMatch = message.match(referencePattern);

    if (tokenMatch) {
      // Find the user associated with this phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, meter_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (profile) {
        // Store the token transaction
        const { error } = await supabase
          .from('token_transactions')
          .insert({
            user_id: profile.id,
            meter_number: profile.meter_number || 'SMS_METER',
            token_code: tokenMatch[1],
            amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
            units: unitsMatch ? parseFloat(unitsMatch[1]) : 0,
            reference_number: referenceMatch ? referenceMatch[1] : `SMS${Date.now()}`,
            status: 'completed',
            transaction_date: new Date().toISOString(),
            source: 'sms'
          });

        if (error) {
          console.error('Error storing token transaction from SMS:', error);
        } else {
          console.log('Successfully stored token transaction from SMS');
        }
      }
    }
  } catch (error) {
    console.error('Error processing token message:', error);
  }
}

async function processBalanceMessage(supabase: any, phoneNumber: string, message: string) {
  try {
    // Extract balance information using regex patterns
    const balancePattern = /balance.*?(\d+(?:\.\d+)?)/i;
    const readingPattern = /reading.*?(\d+)/i;
    const billPattern = /bill.*?(\d+(?:\.\d+)?)/i;
    const accountPattern = /account.*?(\d+)/i;

    const balanceMatch = message.match(balancePattern);
    const readingMatch = message.match(readingPattern);
    const billMatch = message.match(billPattern);
    const accountMatch = message.match(accountPattern);

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
        
        // Store the bill data
        const { error } = await supabase
          .from('kplc_bills')
          .insert({
            user_id: profile.id,
            account_name: 'SMS User',
            account_number: accountMatch ? accountMatch[1] : profile.meter_number,
            meter_number: profile.meter_number || 'SMS_METER',
            current_reading: currentReading,
            previous_reading: previousReading,
            consumption: currentReading - previousReading,
            bill_amount: billMatch ? parseFloat(billMatch[1]) : 0,
            outstanding_balance: balanceMatch ? parseFloat(balanceMatch[1]) : 0,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: balanceMatch && parseFloat(balanceMatch[1]) > 0 ? 'active' : 'inactive',
            fetched_at: new Date().toISOString(),
            source: 'sms'
          });

        if (error) {
          console.error('Error storing bill data from SMS:', error);
        } else {
          console.log('Successfully stored bill data from SMS');
        }
      }
    }
  } catch (error) {
    console.error('Error processing balance message:', error);
  }
}

async function handleDeliveryReport(
  supabase: any, 
  messageId: string, 
  status: string, 
  phoneNumber: string | null, 
  metadata: any = {}
) {
  try {
    // Map Africa's Talking status to our status
    let mappedStatus = 'failed';
    switch (status?.toLowerCase()) {
      case 'success':
      case 'delivered':
        mappedStatus = 'delivered';
        break;
      case 'sent':
        mappedStatus = 'sent';
        break;
      case 'failed':
      case 'rejected':
      case 'expired':
        mappedStatus = 'failed';
        break;
      default:
        mappedStatus = 'failed';
    }

    // Update SMS alert status using the database function
    const { error } = await supabase.rpc('update_sms_alert_status', {
      p_message_id: messageId,
      p_status: mappedStatus,
      p_delivery_metadata: {
        ...metadata,
        original_status: status,
        phone_number: phoneNumber,
        processed_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error('Error updating SMS alert status:', error);
    } else {
      console.log(`Updated SMS alert ${messageId} status to ${mappedStatus}`);
    }

  } catch (error) {
    console.error('Error in handleDeliveryReport:', error);
  }
}