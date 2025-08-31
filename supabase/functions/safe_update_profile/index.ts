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
      return new Response(JSON.stringify({ error: "Invalid updates object provided" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Check for valid energy_provider value
    const validProviders = ['KPLC', 'Solar', 'Other'];
    if (p_updates.energy_provider && !validProviders.includes(p_updates.energy_provider)) {
      console.error("Invalid energy_provider value:", p_updates.energy_provider);
      return new Response(JSON.stringify({
        error: "Invalid energy_provider value. Must be one of: KPLC, Solar, Other"
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Check if the user profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", p_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching profile:", fetchError);
      return new Response(JSON.stringify({
        error: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!existingProfile) {
      console.error("Profile not found for user:", p_user_id);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Update the profile
    const { data, error } = await supabase
      .from("profiles")
      .update(p_updates)
      .eq("id", p_user_id)
      .select();

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
      input: { p_user_id, p_updates: body.p_updates }
    });
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      input: { p_user_id: body.p_user_id, p_updates: body.p_updates }
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
