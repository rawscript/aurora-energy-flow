import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Enable CORS
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      const action = url.searchParams.get('action');
      const days = url.searchParams.get('days') || '7';
      const limit = url.searchParams.get('limit') || '50';

      if (action === 'recent') {
        // Get recent errors
        const daysParam = parseInt(days);
        const limitParam = parseInt(limit);

        const { data, error } = await supabase
          .from('error_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(limitParam);

        if (error) {
          console.error("Error fetching recent errors:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "FETCH_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          errors: data,
          metadata: {
            days: daysParam,
            limit: limitParam,
            count: data.length,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });

      } else if (action === 'stats') {
        // Get error statistics
        const daysParam = parseInt(days);

        const { data, error } = await supabase
          .from('error_logs')
          .select('function_name, count(*)')
          .gte('created_at', new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString())
          .group('function_name')
          .order('count', { ascending: false });

        if (error) {
          console.error("Error fetching error stats:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "STATS_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          stats: data,
          metadata: {
            days: daysParam,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });

      } else if (action === 'cleanup') {
        // Clean up old error logs
        const daysParam = parseInt(days) || 30;

        const { data, error } = await supabase
          .rpc('cleanup_old_error_logs', {
            p_days: daysParam
          });

        if (error) {
          console.error("Error cleaning up error logs:", error);
          return new Response(JSON.stringify({
            error: error.message,
            code: error.code || "CLEANUP_ERROR"
          }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          deleted_count: data,
          metadata: {
            days: daysParam,
            timestamp: new Date().toISOString()
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });

      } else {
        return new Response(JSON.stringify({
          error: "Invalid action parameter",
          code: "INVALID_ACTION"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    if (req.method === "POST") {
      // Log a new error
      const body = await req.json();

      const { function_name, error_message, error_detail, user_id, context, stack_trace } = body;

      if (!function_name || !error_message) {
        return new Response(JSON.stringify({
          error: "function_name and error_message are required",
          code: "MISSING_PARAMETERS"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data, error } = await supabase
        .rpc('log_error', {
          p_function_name: function_name,
          p_error_message: error_message,
          p_error_detail: error_detail,
          p_user_id: user_id,
          p_context: context,
          p_stack_trace: stack_trace
        });

      if (error) {
        console.error("Error logging error:", error);
        return new Response(JSON.stringify({
          error: error.message,
          code: error.code || "LOG_ERROR"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Error logged successfully",
        metadata: {
          function_name: function_name,
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
    console.error("Unexpected error in error_monitoring:", {
      message: error.message,
      stack: error.stack
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
