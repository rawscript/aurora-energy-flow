import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Enable CORS
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const body = await req.json();

    // Validate required parameters
    const { user_id, meter_number, amount } = body;

    if (!user_id || !meter_number || amount === undefined) {
      return new Response(JSON.stringify({
        error: "Missing required parameters: user_id, meter_number, and amount are required",
        code: "MISSING_PARAMETERS"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0 || amount < 10 || amount > 10000) {
      return new Response(JSON.stringify({
        error: "Amount must be a number between 10 and 10000",
        code: "INVALID_AMOUNT"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Use the improved purchase tokens function
    const { data, error } = await supabase
      .rpc('purchase_tokens_improved', {
        p_user_id: user_id,
        p_meter_number: meter_number,
        p_amount: amount,
        p_payment_method: body.payment_method || 'M-PESA',
        p_vendor: body.vendor || 'M-PESA',
        p_phone_number: body.phone_number
      });

    if (error) {
      console.error("Token purchase error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        user_id: user_id,
        amount: amount
      });

      return new Response(JSON.stringify({
        error: error.message,
        code: error.code || "PURCHASE_FAILED",
        details: error.details,
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Token purchase successful:", {
      user_id: user_id,
      amount: amount,
      transaction_id: data.transaction_id
    });

    return new Response(JSON.stringify({
      success: true,
      data: data,
      metadata: {
        timestamp: new Date().toISOString(),
        user_id: user_id,
        amount: amount
      }
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in purchase_tokens:", {
      message: error.message,
      stack: error.stack,
      input: error.input || {}
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while processing your token purchase.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
