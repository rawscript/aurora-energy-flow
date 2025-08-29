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
    const { p_user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Check if notification preferences exist
    const { data: preferences, error: fetchError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", p_user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching notification preferences:", fetchError);
    }

    if (!preferences) {
      // Create default notification preferences
      const { data, error } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: p_user_id,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
        })
        .select();

      if (error) {
        console.error("Error initializing notification preferences:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, preferences }), {
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
