// Complete Smart Meter Test
// This script will create a test user profile, register a meter, and send a reading

async function completeSmartMeterTest() {
  try {
    console.log('🧪 Starting complete smart meter test...\n');
    
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY3MzYyMCwiZXhwIjoyMDY4MjQ5NjIwfQ.kN57N2Jt4A2Y3y5x8b5b5b5b5b5b5b5b5b5b5b5b5b5'; // Service role key for admin access

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create a test user profile
    console.log('1. Creating test user profile...');
    
    // Generate a random user ID for testing
    const testUserId = '12345678-1234-1234-1234-123456789012';
    const testMeterNumber = 'TEST-METER-' + Math.floor(Math.random() * 1000000);
    
    // Check if user already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('   ❌ Error checking for existing profile:', checkError.message);
      return;
    }
    
    if (existingProfile) {
      console.log('   ℹ️  Test user profile already exists');
    } else {
      // Create the test profile
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          email: 'test@example.com',
          full_name: 'Test User',
          meter_number: testMeterNumber,
          energy_provider: 'KPLC',
          notifications_enabled: true,
          auto_optimize: false,
          energy_rate: 0.15,
          kplc_meter_type: 'prepaid',
          notification_preferences: {
            "token_low": true,
            "token_depleted": true,
            "power_restored": true
          }
        });
      
      if (createError) {
        console.log('   ❌ Error creating test profile:', createError.message);
        return;
      }
      
      console.log('   ✅ Test user profile created');
    }
    
    // Update the meter number for the user
    console.log('\n2. Registering meter to user profile...');
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        meter_number: testMeterNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUserId);
    
    if (updateError) {
      console.log('   ❌ Error updating meter number:', updateError.message);
      return;
    }
    
    console.log('   ✅ Meter registered to user profile');
    console.log('   📊 Meter Number:', testMeterNumber);
    console.log('   📊 User ID:', testUserId);
    
    // Test sending a reading through the smart meter webhook
    console.log('\n3. Testing smart meter webhook...');
    
    const testData = {
      url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook',
      meter_number: testMeterNumber,
      kwh_consumed: 15.75,
      user_id: testUserId,
      cost_per_kwh: 25.0
    };
    
    console.log('   📦 Sending test data:', JSON.stringify(testData, null, 2));
    
    // Send through the proxy server
    const response = await fetch('http://localhost:3001/proxy/supabase-function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('   📡 Proxy response status:', response.status);
    
    const responseText = await response.text();
    console.log('   📡 Proxy response body:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('   📊 Parsed response:', JSON.stringify(responseData, null, 2));
      
      if (responseData.success) {
        console.log('   ✅ Smart meter webhook test successful!');
      } else {
        console.log('   ⚠️  Smart meter webhook returned an error:', responseData.error);
      }
    } catch (parseError) {
      console.log('   ⚠️  Could not parse response as JSON');
    }
    
    // Verify the reading was recorded
    console.log('\n4. Verifying energy reading was recorded...');
    
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .eq('user_id', testUserId)
      .eq('meter_number', testMeterNumber)
      .order('reading_date', { ascending: false })
      .limit(1);
    
    if (readingsError) {
      console.log('   ❌ Error querying readings:', readingsError.message);
    } else if (readings && readings.length > 0) {
      console.log('   ✅ Energy reading successfully recorded!');
      console.log('   📊 Reading details:');
      console.log('      ID:', readings[0].id);
      console.log('      kWh Consumed:', readings[0].kwh_consumed);
      console.log('      Total Cost:', readings[0].total_cost);
      console.log('      Reading Date:', new Date(readings[0].reading_date).toLocaleString());
    } else {
      console.log('   ⚠️  No readings found for the test meter');
    }
    
    console.log('\n✅ Complete smart meter test finished');
    
  } catch (error) {
    console.error('❌ Unexpected error during test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
completeSmartMeterTest();