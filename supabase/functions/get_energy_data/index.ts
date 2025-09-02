import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Enable CORS
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const days = url.searchParams.get('days') || '7';

    if (!userId) {
      return new Response(JSON.stringify({
        error: "user_id parameter is required",
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

    // Get energy data using the improved function
    const { data, error } = await supabase
      .rpc('get_latest_energy_data_improved', {
        p_user_id: userId
      });

    if (error) {
      console.error("Error fetching energy data:", {
        error: error.message,
        code: error.code,
        user_id: userId
      });

      return new Response(JSON.stringify({
        error: error.message,
        code: error.code || "ENERGY_DATA_ERROR"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get additional readings for the specified period
    const daysParam = parseInt(days);
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .eq('user_id', userId)
      .gte('reading_date', new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString())
      .order('reading_date', { ascending: false });

    if (readingsError) {
      console.error("Error fetching energy readings:", readingsError);
    }

    // Enhance the response with additional metadata and readings
    const enhancedResponse = {
      summary: data,
      readings: readings || [],
      metadata: {
        user_id: userId,
        days: daysParam,
        timestamp: new Date().toISOString(),
        readings_count: readings ? readings.length : 0
      }
    };

    return new Response(JSON.stringify(enhancedResponse), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in get_energy_data:", {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while fetching energy data.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
