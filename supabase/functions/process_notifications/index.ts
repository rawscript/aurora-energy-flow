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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    if (req.method === "POST") {
      const body = await req.json();
      const limit = body.limit || 10;

      // Process notification queue
      const { data, error } = await supabase
        .rpc('process_notification_queue', {
          p_limit: limit
        });

      if (error) {
        console.error("Error processing notification queue:", error);
        return new Response(JSON.stringify({
          error: error.message,
          code: error.code || "PROCESSING_ERROR"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        processed_count: data,
        metadata: {
          limit: limit,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED"
    }), {
      headers: { "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    console.error("Unexpected error in process_notifications:", {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while processing notifications.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
