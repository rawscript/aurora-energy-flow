import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'

// Configuration - in production these should be environment variables
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'default-secret-for-dev-only'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
    return new Response(JSON.stringify({
      error: 'Server configuration error',
      message: 'Supabase credentials are not properly configured'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }

  const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    if (req.method === 'POST') {
      // Verify webhook signature
      const signature = req.headers.get('x-signature')
      const body = await req.text()

      if (!signature) {
        return new Response(JSON.stringify({
          error: 'Missing signature',
          message: 'Webhook signature is required'
        }), {
          status: 401,
          headers: corsHeaders
        })
      }

      const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        return new Response(JSON.stringify({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed'
        }), {
          status: 401,
          headers: corsHeaders
        })
      }

      const payload = JSON.parse(body)
      const { meter_number, kwh_consumed, user_id, cost_per_kwh = 25.0 } = payload

      // Validate required fields
      if (!meter_number || !kwh_consumed || !user_id) {
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'meter_number, kwh_consumed, and user_id are required'
        }), {
          status: 400,
          headers: corsHeaders
        })
      }

      // Verify meter belongs to user
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('meter_number')
        .eq('id', user_id)
        .single()

      if (profileError || !profile) {
        return new Response(JSON.stringify({
          error: 'User not found',
          message: 'No profile found for the provided user_id'
        }), {
          status: 404,
          headers: corsHeaders
        })
      }

      if (profile.meter_number !== meter_number) {
        return new Response(JSON.stringify({
          error: 'Meter mismatch',
          message: 'The provided meter_number does not belong to this user'
        }), {
          status: 403,
          headers: corsHeaders
        })
      }

      // Use the improved function to insert energy reading
      const { data, error } = await supabaseClient.rpc('insert_energy_reading_improved', {
        p_user_id: user_id,
        p_meter_number: meter_number,
        p_kwh_consumed: kwh_consumed,
        p_cost_per_kwh: cost_per_kwh
      })

      if (error) {
        console.error('Error inserting energy reading:', {
          error: error.message,
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

      return new Response(JSON.stringify({
        success: true,
        reading_id: data,
        message: 'Energy reading processed successfully'
      }), {
        headers: corsHeaders
      })
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const userId = url.searchParams.get('user_id')
      const days = url.searchParams.get('days') || '7'

      if (!userId) {
        return new Response(JSON.stringify({
          error: 'user_id required',
          message: 'Please provide a user_id parameter'
        }), {
          status: 400,
          headers: corsHeaders
        })
      }

      // Get energy data using the improved function
      const { data, error } = await supabaseClient.rpc('get_latest_energy_data_improved', {
        p_user_id: userId
      })

      if (error) {
        console.error('Error fetching energy data:', error)
        return new Response(JSON.stringify({
          error: error.message,
          code: error.code
        }), {
          status: 500,
          headers: corsHeaders
        })
      }

      return new Response(JSON.stringify({
        success: true,
        data: data
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
    console.error('Error in smart-meter-webhook:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url
    })

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
})
