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
    const { user_id, meter_number } = body;

    if (!user_id || !meter_number) {
      return new Response(JSON.stringify({
        error: "user_id and meter_number are required",
        code: "MISSING_PARAMETERS"
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

    // Use the improved check KPLC balance function
    const { data, error } = await supabase
      .rpc('check_kplc_balance_improved', {
        p_user_id: user_id,
        p_meter_number: meter_number
      });

    if (error) {
      console.error("Error checking KPLC balance:", {
        error: error.message,
        code: error.code,
        user_id: user_id,
        meter_number: meter_number
      });

      return new Response(JSON.stringify({
        error: error.message,
        code: error.code || "BALANCE_CHECK_FAILED"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Enhance the response with additional metadata
    const enhancedResponse = {
      ...data,
      metadata: {
        timestamp: new Date().toISOString(),
        user_id: user_id,
        meter_number: meter_number
      }
    };

    return new Response(JSON.stringify(enhancedResponse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in check_kplc_balance:", {
      message: error.message,
      stack: error.stack,
      input: error.input || {}
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while checking KPLC balance.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
