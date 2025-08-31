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
    const { p_user_id, p_email, p_full_name, p_phone_number, p_meter_number } = await req.json();

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

    if (existingProfile) {
      // Profile exists, return it
      return new Response(JSON.stringify([existingProfile]), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Profile does not exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: p_user_id,
          email: p_email,
          full_name: p_full_name,
          phone_number: p_phone_number,
          meter_number: p_meter_number,
          energy_provider: "",
        })
        .select();

      if (createError) {
        console.error("Error creating profile:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify(newProfile), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
