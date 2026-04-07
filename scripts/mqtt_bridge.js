const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

// Configuration
const MQTT_URL = process.env.MQTT_URL;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Use Service key for bypass RLS

console.log('--- Aurora MQTT-to-Supabase Bridge ---');

if (!MQTT_URL || !MQTT_USERNAME || !MQTT_PASSWORD || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Missing required environment variables in .env.local');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize MQTT Client
const options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: true // Use TLS verification
};

const client = mqtt.connect(MQTT_URL, options);

client.on('connect', () => {
  console.log('Connected to HiveMQ Cloud');
  
  // Subscribe to all meter data topics
  client.subscribe('aurora/meters/+/data', (err) => {
    if (!err) {
      console.log('Subscribed to aurora/meters/+/data');
    } else {
      console.error('Subscription error:', err);
    }
  });

  // Subscribe to status topics
  client.subscribe('aurora/meters/+/status', (err) => {
    if (!err) {
      console.log('Subscribed to aurora/meters/+/status');
    }
  });
});

client.on('message', async (topic, message) => {
  const payloadStr = message.toString();
  console.log(`\nReceived message on topic: ${topic}`);
  
  if (topic.endsWith('/status')) {
    console.log(`Status update: ${payloadStr}`);
    return;
  }

  try {
    const data = JSON.parse(payloadStr);
    
    // Extract info
    const meter_id = data.meter_id;
    const power = data.readings?.power || 0;
    
    if (!meter_id) {
      console.warn('Received message without meter_id, skipping.');
      return;
    }

    // Resolve all users who "own" this meter based on meter_number
    console.log(`Resolving owners for Meter: ${meter_id}...`);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('meter_number', meter_id);

    if (profileError) {
      console.error(`Error fetching owners for Meter ${meter_id}:`, profileError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.warn(`No registered owners found for Meter ${meter_id}. Skipping.`);
      return;
    }

    console.log(`Found ${profiles.length} owner(s) for Meter ${meter_id}. Inserting readings...`);

    // Insert reading for EACH owner (necessary for User RLS visibility)
    for (const profile of profiles) {
      const user_id = profile.id;
      console.log(`- Inserting reading for User: ${user_id}`);

      const { data: result, error } = await supabase.rpc('insert_energy_reading_improved', {
        p_user_id: user_id,
        p_meter_number: meter_id,
        p_kwh_consumed: power, // Mapping power to consumption for POC
        p_cost_per_kwh: 25.0
      });

      if (error) {
        console.error(`  Supabase RPC Error for User ${user_id}:`, error.message);
      } else {
        console.log(`  Supabase insertion successful for User ${user_id}`);
      }
    }
  } catch (err) {
    console.error('Error parsing JSON payload:', err.message);
  }
});

client.on('error', (err) => {
  console.error('MQTT Connection Error:', err);
});

client.on('close', () => {
  console.warn('MQTT connection closed');
});

process.on('SIGINT', () => {
  console.log('Shutting down bridge...');
  client.end();
  process.exit();
});
