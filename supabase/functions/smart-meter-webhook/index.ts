
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      // Handle incoming smart meter data from Kenya Power
      const { meter_number, kwh_consumed, user_id, timestamp } = await req.json()
      
      const { data, error } = await supabaseClient.rpc('insert_energy_reading', {
        p_user_id: user_id,
        p_meter_number: meter_number,
        p_kwh_consumed: kwh_consumed,
        p_cost_per_kwh: 25.0 // Kenya Power rate per kWh
      })

      if (error) {
        console.error('Error inserting energy reading:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true, reading_id: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // GET endpoint to simulate real-time data for testing
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const userId = url.searchParams.get('user_id')
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Simulate smart meter reading
      const simulatedReading = {
        meter_number: `KP-${Math.random().toString(36).substr(2, 9)}`,
        kwh_consumed: Math.random() * 10 + 2, // 2-12 kWh
        user_id: userId,
        timestamp: new Date().toISOString()
      }

      const { data, error } = await supabaseClient.rpc('insert_energy_reading', {
        p_user_id: userId,
        p_meter_number: simulatedReading.meter_number,
        p_kwh_consumed: simulatedReading.kwh_consumed
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        reading: simulatedReading,
        reading_id: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in smart-meter-webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
