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
    const { p_user_id, p_force_refresh = false } = await req.json();

    if (!p_user_id) {
      return new Response(JSON.stringify({
        error: "user_id is required",
        code: "MISSING_USER_ID"
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

    // Use the improved database function with force refresh option
    const { data, error } = await supabase
      .rpc('get_token_analytics_improved', {
        p_user_id: p_user_id,
        p_force_refresh: p_force_refresh
      });

    if (error) {
      console.error("Error fetching token analytics:", {
        error: error.message,
        code: error.code,
        user_id: p_user_id
      });

      return new Response(JSON.stringify({
        error: error.message,
        code: error.code || "ANALYTICS_ERROR"
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
        force_refresh: p_force_refresh,
        status: "success"
      }
    };

    return new Response(JSON.stringify(enhancedResponse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while fetching token analytics.",
      code: "UNEXPECTED_ERROR"
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
