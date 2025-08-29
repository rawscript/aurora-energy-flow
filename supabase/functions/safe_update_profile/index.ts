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
      return new Response(JSON.stringify({ error: fetchError.message }), {
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
      console.error("Supabase update error:", error);
      return new Response(JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Profile updated successfully:", data);

    return new Response(JSON.stringify({ data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
