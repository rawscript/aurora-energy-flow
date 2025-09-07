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
      const userId = url.searchParams.get('user_id');
      const meterNumber = url.searchParams.get('meter_number');
      const limit = url.searchParams.get('limit') || '50';
      const days = url.searchParams.get('days');

      if (!userId) {
        return new Response(JSON.stringify({
          error: "user_id parameter is required",
          code: "MISSING_USER_ID"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Get token transactions
      let query = supabase
        .from('kplc_token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(parseInt(limit));

      if (meterNumber) {
        query = query.eq('meter_number', meterNumber);
      }

      if (days) {
        const daysParam = parseInt(days);
        query = query.gte('transaction_date', new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching token transactions:", error);
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
        transactions: data,
        metadata: {
          user_id: userId,
          meter_number: meterNumber,
          limit: parseInt(limit),
          days: days ? parseInt(days) : null,
          count: data.length,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { user_id, meter_number, amount, transaction_type = 'consumption' } = body;

      if (!user_id || !meter_number || amount === undefined) {
        return new Response(JSON.stringify({
          error: "user_id, meter_number, and amount are required",
          code: "MISSING_PARAMETERS"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!['purchase', 'consumption', 'refund'].includes(transaction_type)) {
        return new Response(JSON.stringify({
          error: "Invalid transaction_type. Must be 'purchase', 'consumption', or 'refund'",
          code: "INVALID_TRANSACTION_TYPE"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Use the improved update token balance function
      const { data, error } = await supabase
        .rpc('update_token_balance_improved', {
          p_user_id: user_id,
          p_meter_number: meter_number,
          p_amount: amount,
          p_transaction_type: transaction_type,
          p_reference_number: body.reference_number,
          p_vendor: body.vendor,
          p_payment_method: body.payment_method
        });

      if (error) {
        console.error("Error updating token balance:", {
          error: error.message,
          code: error.code,
          user_id: user_id,
          amount: amount,
          transaction_type: transaction_type
        });

        return new Response(JSON.stringify({
          error: error.message,
          code: error.code || "TRANSACTION_ERROR"
        }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        new_balance: data,
        metadata: {
          user_id: user_id,
          meter_number: meter_number,
          amount: amount,
          transaction_type: transaction_type,
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
    console.error("Unexpected error in token_transactions:", {
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
