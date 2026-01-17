import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Server configuration error: Missing Supabase credentials');
    return new Response(JSON.stringify({
      error: 'Server configuration error',
      message: 'Supabase credentials are not properly configured'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    if (req.method === 'POST') {
      console.log('Received POST request to /api/smart-meter/data');
      
      // Get the request body
      const payload = await req.json();
      console.log('Smart meter payload:', JSON.stringify(payload, null, 2));

      // Extract data from the smart meter payload
      const {
        meter_id,
        device_name,
        timestamp,
        readings,
        metadata
      } = payload;

      // Validate required fields
      if (!meter_id || !readings) {
        console.error('Missing required fields:', { meter_id, readings });
        return new Response(JSON.stringify({
          error: 'Missing required fields',
          message: 'meter_id and readings are required',
          received: { meter_id, readings }
        }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const {
        voltage_rms,
        current_rms,
        power,
        energy,
        temperature
      } = readings;

      // Log the validated data
      console.log('Processing smart meter reading:', {
        meter_id,
        voltage_rms,
        current_rms,
        power,
        energy,
        temperature,
        timestamp
      });

      const supabaseClient = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          global: {
            headers: { Authorization: req.headers.get("Authorization") || '' },
          },
        }
      );

      // Check if this meter is registered to a user
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, meter_number')
        .eq('meter_number', meter_id)
        .single();

      if (profileError || !userProfile) {
        console.log(`Meter ${meter_id} not registered to any user yet`);
        // Store the reading anyway for future association
        const { error: storeError } = await supabaseClient
          .from('smart_meter_readings')
          .insert({
            meter_id: meter_id,
            voltage_rms: voltage_rms,
            current_rms: current_rms,
            power: power,
            energy: energy,
            temperature: temperature,
            timestamp: new Date().toISOString(),
            raw_payload: payload
          });

        if (storeError) {
          console.error('Error storing unregistered meter reading:', storeError);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Reading stored for unregistered meter',
          meter_registered: false
        }), {
          headers: corsHeaders
        });
      }

      // Meter is registered, store the reading with user association
      const { data, error } = await supabaseClient
        .from('smart_meter_readings')
        .insert({
          user_id: userProfile.id,
          meter_id: meter_id,
          voltage_rms: voltage_rms,
          current_rms: current_rms,
          power: power,
          energy: energy,
          temperature: temperature,
          timestamp: new Date().toISOString(),
          raw_payload: payload
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting smart meter reading:', {
          error: error.message,
          code: error.code,
          details: error.details,
          payload: payload
        });

        return new Response(JSON.stringify({
          error: error.message,
          code: error.code,
          details: error.details
        }), {
          status: 500,
          headers: corsHeaders
        });
      }

      console.log('Successfully inserted smart meter reading:', data.id);
      
      // Also update user's energy data table
      const kwhConsumed = energy; // Assuming energy is in kWh
      const costPerKwh = 25.0; // Default rate, can be customized
      
      try {
        const { data: energyData, error: energyError } = await supabaseClient.rpc('insert_energy_reading_improved', {
          p_user_id: userProfile.id,
          p_meter_number: meter_id,
          p_kwh_consumed: kwhConsumed,
          p_cost_per_kwh: costPerKwh
        });

        if (energyError) {
          console.warn('Warning: Could not update energy data:', energyError.message);
        } else {
          console.log('Energy data updated successfully:', energyData);
        }
      } catch (energyUpdateError) {
        console.warn('Energy data update failed:', energyUpdateError.message);
      }

      return new Response(JSON.stringify({
        success: true,
        reading_id: data.id,
        user_id: userProfile.id,
        message: 'Smart meter reading processed successfully',
        meter_registered: true
      }), {
        headers: corsHeaders
      });
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        message: 'Aurora Smart Meter Data Endpoint',
        version: '1.0',
        supported_methods: ['POST']
      }), {
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed',
      message: 'Only POST and GET methods are supported'
    }), {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Unexpected error in smart-meter-data:', {
      message: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url
    });

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request',
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});