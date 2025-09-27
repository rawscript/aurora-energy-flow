// Test script to verify smart meter data flow from simulator to Aurora dashboard
// Run with: node test-complete-data-flow.js

async function testCompleteDataFlow() {
  console.log('🔍 Testing complete smart meter data flow...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Testing direct energy reading insertion...');
    
    // Test inserting a reading directly
    const testReading = {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
      p_meter_number: 'TEST123',
      p_kwh_consumed: 12.5,
      p_cost_per_kwh: 25.0
    };
    
    const { data: insertData, error: insertError } = await supabase.rpc('insert_energy_reading_improved', testReading);
    
    if (insertError) {
      console.log('   ❌ Direct insertion failed:', insertError.message);
      if (insertError.message.includes('Meter') && insertError.message.includes('does not belong to user')) {
        console.log('   💡 This is expected - test user does not have meter registered');
        console.log('   ✅ Function exists and parameter validation works');
      }
    } else {
      console.log('   ✅ Direct insertion successful');
      console.log('   📤 Reading ID:', insertData);
    }
    
    console.log('\n2. Testing smart-meter-webhook function...');
    
    // Test the webhook function directly
    const { data: webhookData, error: webhookError } = await supabase.functions.invoke('smart-meter-webhook', {
      body: {
        meter_number: 'TEST123',
        kwh_consumed: 15.75,
        user_id: '00000000-0000-0000-0000-000000000000',
        cost_per_kwh: 25.0
      }
    });
    
    if (webhookError) {
      console.log('   ⚠️  Webhook function returned error:', webhookError.message);
      if (webhookError.message.includes('signature')) {
        console.log('   💡 Signature verification might be enabled - check smart-meter-webhook function');
      } else if (webhookError.message.includes('user not found')) {
        console.log('   💡 User profile issue - meter may not be registered');
      }
    } else {
      console.log('   ✅ Webhook function working');
      console.log('   📤 Response:', JSON.stringify(webhookData, null, 2));
    }
    
    console.log('\n3. Checking energy_readings table...');
    
    // Check if we can query the energy_readings table
    const { data: readingsData, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .limit(5);
    
    if (readingsError) {
      console.log('   ❌ Error querying energy_readings:', readingsError.message);
    } else {
      console.log('   ✅ Successfully queried energy_readings table');
      console.log('   📊 Found', readingsData.length, 'readings');
      if (readingsData.length > 0) {
        console.log('   📋 Latest reading:', {
          user_id: readingsData[0].user_id,
          meter_number: readingsData[0].meter_number,
          kwh_consumed: readingsData[0].kwh_consumed,
          reading_date: readingsData[0].reading_date
        });
      }
    }
    
    console.log('\n4. Testing get_latest_energy_data function...');
    
    // Test getting latest energy data
    const { data: energyData, error: energyError } = await supabase.rpc('get_latest_energy_data_improved', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (energyError) {
      console.log('   ⚠️  Error getting energy data:', energyError.message);
    } else {
      console.log('   ✅ Successfully retrieved energy data');
      console.log('   📊 Energy data:', {
        current_usage: energyData.current_usage,
        daily_total: energyData.daily_total,
        daily_cost: energyData.daily_cost
      });
    }
    
    console.log('\n5. Checking user profile and meter registration...');
    
    // Check if test user has a meter registered
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('meter_number, id')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (profileError && profileError.message.includes('row')) {
      console.log('   ⚠️  Test user profile does not exist (expected for test user)');
    } else if (profileError) {
      console.log('   ❌ Error accessing user profile:', profileError.message);
    } else {
      console.log('   ✅ User profile exists');
      if (profileData.meter_number) {
        console.log('   📊 User has meter registered:', profileData.meter_number);
      } else {
        console.log('   ⚠️  User does not have a meter registered');
      }
    }
    
    console.log('\n✅ Complete data flow test completed');
    console.log('\n💡 Recommendations:');
    console.log('   1. If direct insertion works but webhook fails, check signature verification');
    console.log('   2. If user profile issues exist, ensure meters are properly registered');
    console.log('   3. If table queries work, data is being stored correctly');
    console.log('   4. Check that the smart meter simulator is sending data in the correct format');
    
  } catch (error) {
    console.error('❌ Unexpected error during complete data flow test:', error.message);
  }
}

// Run the test
testCompleteDataFlow();