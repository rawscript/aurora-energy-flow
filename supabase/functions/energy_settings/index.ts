import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Enable CORS
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  });

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
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

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const action = url.searchParams.get('action');
      const version = url.searchParams.get('version');

      if (!userId) {
        return new Response(JSON.stringify({
          error: "user_id parameter is required",
          code: "MISSING_USER_ID"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (action === 'history') {
        // Get settings history
        const { data, error } = await supabase
          .rpc('get_energy_settings_history', {
            p_user_id: userId
          });

        if (error) {
          console.error("Error fetching settings history:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "HISTORY_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          history: data,
          metadata: {
            user_id: userId,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });

      } else if (action === 'revert' && version) {
        // Revert to specific version
        const versionNum = parseInt(version);
        if (isNaN(versionNum)) {
          return new Response(JSON.stringify({
            error: "Invalid version number",
            code: "INVALID_VERSION"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        const { data, error } = await supabase
          .rpc('revert_energy_settings', {
            p_user_id: userId,
            p_version: versionNum
          });

        if (error) {
          console.error("Error reverting settings:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "REVERT_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          reverted: data,
          metadata: {
            user_id: userId,
            version: versionNum,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });

      } else {
        // Get current settings
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            energy_provider,
            energy_rate,
            auto_optimize,
            notifications_enabled,
            meter_number,
            kplc_meter_type
          `)
          .eq('id', userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "PROFILE_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          settings: profile,
          metadata: {
            user_id: userId,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, updates } = body;

      if (!user_id || !updates) {
        return new Response(JSON.stringify({
          error: "user_id and updates are required",
          code: "MISSING_PARAMETERS"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Validate updates
      if (updates.energy_provider &&
          !['', 'KPLC', 'Solar', 'IPP', 'Other'].includes(updates.energy_provider)) {
        return new Response(JSON.stringify({
          error: `Invalid energy provider: ${updates.energy_provider}`,
          code: "INVALID_PROVIDER"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (updates.energy_rate !== undefined &&
          (typeof updates.energy_rate !== 'number' || updates.energy_rate < 0)) {
        return new Response(JSON.stringify({
          error: `Invalid energy rate: ${updates.energy_rate}`,
          code: "INVALID_RATE"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Use the safe_update_profile function which handles versioning
      const { data, error } = await supabase
        .rpc('safe_update_profile', {
          p_user_id: user_id,
          p_updates: updates
        });

      if (error) {
        console.error("Error updating energy settings:", error);
        return new Response(JSON.stringify({
          error: error.message,
          code: error.code || "UPDATE_ERROR"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        updated_profile: data,
        metadata: {
          user_id: user_id,
          updated_fields: Object.keys(updates),
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
    console.error("Unexpected error in energy_settings:", {
      message: error.message,
      stack: error.stack,
      method: req.method
    });
    return new Response(JSON.stringify({
      error: error.message || "An unexpected error occurred while processing your request.",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
