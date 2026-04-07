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
    
    // In our project, user_id is often stored in the metadata or hardcoded during setup.
    // For this bridge, we'll try to find the user associated with this meter or use a default.
    // Ideally, the device includes its assigned user_id.
    const user_id = data.user_id || 'c98883f0-8b2c-454e-a48a-781a939f0072'; // Default POC user

    console.log(`Processing reading for Meter: ${meter_id}, Power: ${power}, User: ${user_id}`);

    // Call Supabase RPC
    const { data: result, error } = await supabase.rpc('insert_energy_reading_improved', {
      p_user_id: user_id,
      p_meter_number: meter_id,
      p_kwh_consumed: power, // Mapping power to consumption for POC
      p_cost_per_kwh: 25.0
    });

    if (error) {
      console.error('Supabase RPC Error:', error.message);
    } else {
      console.log('Supabase insertion successful:', result);
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
