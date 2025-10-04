// This script will help us test the function deployment
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  try {
    // First, let's check if we can call a simple RPC function
    console.log('Testing basic RPC function call...');
    
    // Try to call a simple function that should exist
    const { data, error } = await supabase.rpc('get_latest_energy_data', { p_user_id: 'test-user-id' });
    
    if (error) {
      console.log('Error calling get_latest_energy_data:', error);
    } else {
      console.log('Successfully called get_latest_energy_data:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFunction();