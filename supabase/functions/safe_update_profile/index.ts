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
    console.log("Updates:", JSON.stringify(p_updates, null, 2));

    // Validate p_updates structure
    if (!p_updates || typeof p_updates !== 'object') {
      console.error("Invalid updates object:", p_updates);
      return new Response(JSON.stringify({ error: "Invalid updates object provided. Please check your input and try again." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key for full access
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Use the database function instead of direct table access
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
      return new Response(JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        providedUpdates: p_updates
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Profile updated successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", {
      message: error.message,
      stack: error.stack,
      input: body ? { p_user_id: body.p_user_id, p_updates: body.p_updates } : { p_user_id: undefined, p_updates: undefined }
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while updating your profile.",
      stack: error.stack,
      input: body ? { p_user_id: body.p_user_id, p_updates: body.p_updates } : { p_user_id: undefined, p_updates: undefined }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
