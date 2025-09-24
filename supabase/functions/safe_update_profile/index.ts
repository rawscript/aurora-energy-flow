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
    const { p_user_id, p_updates } = body;

    console.log("Received request to safe_update_profile");
    console.log("User ID:", p_user_id);

    // Validate p_updates structure
    if (!p_updates || typeof p_updates !== 'object') {
      console.error("Invalid updates object:", p_updates);
      return new Response(JSON.stringify({
        error: "Invalid updates object provided. Please check your input and try again.",
        code: "INVALID_UPDATES"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate specific fields
    if (p_updates.energy_provider &&
        !['', 'KPLC', 'Solar', 'IPP', 'Other'].includes(p_updates.energy_provider)) {
      return new Response(JSON.stringify({
        error: `Invalid energy provider: ${p_updates.energy_provider}`,
        code: "INVALID_PROVIDER"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (p_updates.energy_rate !== undefined &&
        (typeof p_updates.energy_rate !== 'number' || p_updates.energy_rate < 0)) {
      return new Response(JSON.stringify({
        error: `Invalid energy rate: ${p_updates.energy_rate}`,
        code: "INVALID_RATE"
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

    // Use the improved database function
    const { data, error } = await supabase
      .rpc('safe_update_profile', {
        p_user_id: p_user_id,
        p_updates: p_updates
      });

    if (error) {
      console.error("Supabase update error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        updates: p_updates
      });

      // Enhanced error response with more context
      return new Response(JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code || "UPDATE_FAILED",
        providedUpdates: Object.keys(p_updates).length,
        timestamp: new Date().toISOString()
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Profile updated successfully:", {
      user_id: p_user_id,
      updated_fields: Object.keys(p_updates)
    });

    // Enhanced success response
    return new Response(JSON.stringify({
      success: true,
      data: data,
      metadata: {
        timestamp: new Date().toISOString(),
        updated_fields: Object.keys(p_updates),
        user_id: p_user_id
      }
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", {
      message: error.message,
      stack: error.stack,
      input: body ? { p_user_id: body.p_user_id, update_fields: body.p_updates ? Object.keys(body.p_updates) : [] } : null
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while updating your profile.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
