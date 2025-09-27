// Diagnostic script to check smart meter data flow issues
// Run with: node diagnose-smart-meter-data-flow.js

async function diagnoseSmartMeterDataFlow() {
  try {
    console.log('🔍 Diagnosing Smart Meter Data Flow Issues...\n');
    
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // You'll need to replace this with your actual user ID
    const YOUR_USER_ID = 'YOUR_ACTUAL_USER_ID'; // Replace with your real user ID
    
    if (YOUR_USER_ID === 'YOUR_ACTUAL_USER_ID') {
      console.log('⚠️  Please replace YOUR_ACTUAL_USER_ID with your real user ID in this script');
      return;
    }
    
    console.log('1. Checking user profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', YOUR_USER_ID)
      .single();
    
    if (profileError) {
      console.log('   ❌ Error fetching profile:', profileError.message);
      return;
    }
    
    console.log('   ✅ Profile found');
    console.log('   📊 Profile details:');
    console.log('      ID:', profile.id);
    console.log('      Email:', profile.email || 'Not set');
    console.log('      Full Name:', profile.full_name || 'Not set');
    console.log('      Meter Number:', profile.meter_number || 'Not set');
    console.log('      Energy Provider:', profile.energy_provider || 'Not set');
    
    if (!profile.meter_number) {
      console.log('   ⚠️  No meter registered to your account');
      console.log('   💡 You need to register a meter in the Aurora dashboard or smart meter simulator');
    }
    
    console.log('\n2. Testing insert_energy_reading_improved function...');
    
    // Test the improved function directly
    const testReading = {
      p_user_id: YOUR_USER_ID,
      p_meter_number: profile.meter_number || 'TEST-METER-001',
      p_kwh_consumed: 10.5,
      p_cost_per_kwh: 25.0
    };
    
    console.log('   Testing with:', testReading);
    
    const { data: insertData, error: insertError } = await supabase.rpc('insert_energy_reading_improved', testReading);
    
    if (insertError) {
      console.log('   ❌ Error calling insert_energy_reading_improved:', insertError.message);
      console.log('   💡 This indicates the meter number in your profile does not match the one being sent by the smart meter');
      console.log('   💡 Or the function is not deployed correctly');
    } else {
      console.log('   ✅ insert_energy_reading_improved function is working');
      console.log('   📊 Reading ID:', insertData);
    }
    
    console.log('\n3. Checking energy readings for your meter...');
    
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .eq('user_id', YOUR_USER_ID)
      .eq('meter_number', profile.meter_number)
      .order('reading_date', { ascending: false })
      .limit(10);
    
    if (readingsError) {
      console.log('   ❌ Error querying readings:', readingsError.message);
    } else {
      console.log('   ✅ Successfully queried readings');
      console.log('   📊 Found', readings.length, 'readings for your meter');
      if (readings.length > 0) {
        console.log('   📋 Recent readings:');
        readings.forEach((reading, index) => {
          console.log(`      ${index + 1}. ${reading.kwh_consumed} kWh at ${new Date(reading.reading_date).toLocaleString()}`);
        });
      } else {
        console.log('   ⚠️  No readings found for your meter');
        console.log('   💡 Data may still be processing or there might be an issue with data insertion');
      }
    }
    
    console.log('\n4. Checking latest energy data function...');
    
    const { data: energyData, error: energyError } = await supabase.rpc('get_latest_energy_data', {
      p_user_id: YOUR_USER_ID
    });
    
    if (energyError) {
      console.log('   ❌ Error calling get_latest_energy_data:', energyError.message);
    } else {
      console.log('   ✅ Successfully called get_latest_energy_data');
      console.log('   📊 Energy data response:');
      console.log('      Current Usage:', energyData.current_usage);
      console.log('      Daily Total:', energyData.daily_total);
      console.log('      Daily Cost:', energyData.daily_cost);
      console.log('      Efficiency Score:', energyData.efficiency_score);
    }
    
    console.log('\n📋 SUMMARY AND RECOMMENDATIONS:');
    console.log('   1. Ensure the meter number in your profile matches what the smart meter is sending');
    console.log('   2. Check that the smart meter simulator is using the correct user ID');
    console.log('   3. Verify the smart-meter-webhook function is deployed and working');
    console.log('   4. Make sure the proxy server is running if you\'re using it');
    console.log('   5. Check that the insert_energy_reading_improved function is deployed');
    
    console.log('\n✅ Diagnostic check completed');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnostic check:', error.message);
  }
}

// Run the diagnostic
diagnoseSmartMeterDataFlow();