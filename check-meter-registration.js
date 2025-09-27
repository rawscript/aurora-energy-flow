// Check if meter is properly registered in user profile
// Run with: node check-meter-registration.js

async function checkMeterRegistration() {
  try {
    console.log('🔍 Checking meter registration in user profile...\n');
    
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
    
    console.log('1. Checking user profile for meter registration...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('meter_number, full_name, email')
      .eq('id', YOUR_USER_ID)
      .single();
    
    if (profileError) {
      console.log('   ❌ Error fetching profile:', profileError.message);
      return;
    }
    
    console.log('   ✅ Profile found');
    console.log('   📊 Profile details:');
    console.log('      Full Name:', profile.full_name || 'Not set');
    console.log('      Email:', profile.email || 'Not set');
    console.log('      Meter Number:', profile.meter_number || 'Not set');
    
    if (!profile.meter_number) {
      console.log('   ⚠️  No meter registered in your profile');
      console.log('   💡 You need to register your meter in the Aurora dashboard');
      return;
    }
    
    console.log('\n2. Checking if meter number matches what was sent from smart meter...');
    
    // You'll need to replace this with the actual meter number from your smart meter
    const SMART_METER_NUMBER = 'YOUR_SMART_METER_NUMBER'; // Replace with your actual meter number
    
    if (SMART_METER_NUMBER === 'YOUR_SMART_METER_NUMBER') {
      console.log('   ⚠️  Please replace YOUR_SMART_METER_NUMBER with your actual meter number');
    } else {
      if (profile.meter_number === SMART_METER_NUMBER) {
        console.log('   ✅ Meter numbers match');
      } else {
        console.log('   ❌ Meter numbers do not match');
        console.log('      Profile meter:', profile.meter_number);
        console.log('      Smart meter:', SMART_METER_NUMBER);
        console.log('   💡 You need to update your profile to match the smart meter number');
      }
    }
    
    console.log('\n3. Checking recent energy readings for your meter...');
    
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .eq('user_id', YOUR_USER_ID)
      .eq('meter_number', profile.meter_number)
      .order('reading_date', { ascending: false })
      .limit(5);
    
    if (readingsError) {
      console.log('   ❌ Error querying readings:', readingsError.message);
    } else {
      console.log('   ✅ Successfully queried readings');
      console.log('   📊 Found', readings.length, 'recent readings for your meter');
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
    
    console.log('\n✅ Meter registration check completed');
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Make sure the meter number in your profile matches the one in the smart meter simulator');
    console.log('   2. Check that you\'re using the correct user ID in the smart meter simulator');
    console.log('   3. Verify that the smart meter is sending data with the correct user ID');
    
  } catch (error) {
    console.error('❌ Unexpected error during meter registration check:', error.message);
  }
}

// Run the check
checkMeterRegistration();