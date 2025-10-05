import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration - in production these should be environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Server configuration error: Missing Supabase credentials')
    return new Response(JSON.stringify({
      error: 'Server configuration error',
      message: 'Supabase credentials are not properly configured'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }

  try {
    if (req.method === 'POST') {
      // Log the incoming request for debugging
      console.log('Received POST request to smart-meter-webhook')
      
      // Get the request body
      const payload = await req.json();
      console.log('Request body:', JSON.stringify(payload, null, 2));

      const { meter_number, kwh_consumed, user_id, cost_per_kwh = 25.0 } = payload

      // Validate required fields
      if (!meter_number || !kwh_consumed || !user_id) {
        console.error('Missing required fields:', { meter_number, kwh_consumed, user_id })
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'meter_number, kwh_consumed, and user_id are required',
          received: { meter_number, kwh_consumed, user_id }
        }), {
          status: 400,
          headers: corsHeaders
        })
      }

      // Log the validated data
      console.log('Processing energy reading:', { meter_number, kwh_consumed, user_id, cost_per_kwh })

      const supabaseClient = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          global: {
            headers: { Authorization: req.headers.get("Authorization") || '' },
          },
        }
      )

      // First, ensure the user's profile has this meter number
      console.log('Updating user profile with meter number if needed');
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update({ meter_number: meter_number })
        .eq('id', user_id)
        .eq('meter_number', null); // Only update if meter_number is currently null

      if (profileUpdateError && profileUpdateError.code !== 'PGRST116') {
        console.warn('Warning: Could not update user profile with meter number:', profileUpdateError);
      } else {
        console.log('User profile updated with meter number');
      }

      // Use the improved function name - insert_energy_reading_improved
      console.log('Calling insert_energy_reading_improved function')
      const { data, error } = await supabaseClient.rpc('insert_energy_reading_improved', {
        p_user_id: user_id,
        p_meter_number: meter_number,
        p_kwh_consumed: kwh_consumed,
        p_cost_per_kwh: cost_per_kwh
      })

      if (error) {
        console.error('Error inserting energy reading:', {
          error: error.message,
          code: error.code,
          details: error.details,
          payload: { meter_number, kwh_consumed, user_id }
        })

        return new Response(JSON.stringify({
          error: error.message,
          code: error.code,
          details: error.details
        }), {
          status: 500,
          headers: corsHeaders
        })
      }

      console.log('Successfully inserted energy reading:', data)
      return new Response(JSON.stringify({
        success: true,
        reading_id: data,
        message: 'Energy reading processed successfully'
      }), {
        headers: corsHeaders
      })
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: 'Smart Meter Webhook is running'
      }), {
        headers: corsHeaders
      })
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only POST and GET methods are supported'
    }), {
      status: 405,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Unexpected error in smart-meter-webhook:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url
    })

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
})