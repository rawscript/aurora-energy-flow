// Check if energy readings are being stored in the database
// Run with: node check-energy-readings.js

async function checkEnergyReadings() {
  try {
    console.log('🔍 Checking if energy readings are stored in the database...\n');
    
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check if we can query the energy_readings table
    console.log('1. Checking energy_readings table...');
    
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .order('reading_date', { ascending: false })
      .limit(5);
    
    if (readingsError) {
      console.log('   ❌ Error querying energy_readings:', readingsError.message);
    } else {
      console.log('   ✅ Successfully queried energy_readings table');
      console.log('   📊 Found', readings.length, 'recent readings');
      if (readings.length > 0) {
        console.log('   📋 Latest readings:');
        readings.forEach((reading, index) => {
          console.log(`      ${index + 1}. ${reading.meter_number} - ${reading.kwh_consumed} kWh at ${reading.reading_date}`);
        });
      } else {
        console.log('   ⚠️  No readings found in table');
      }
    }
    
    console.log('\n2. Checking if your user has a meter registered...');
    
    // You'll need to replace this with your actual user ID
    const YOUR_USER_ID = 'YOUR_ACTUAL_USER_ID'; // Replace with your real user ID
    
    if (YOUR_USER_ID !== 'YOUR_ACTUAL_USER_ID') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('meter_number')
        .eq('id', YOUR_USER_ID)
        .single();
      
      if (profileError) {
        console.log('   ❌ Error fetching profile:', profileError.message);
      } else {
        console.log('   ✅ Profile found');
        if (profile.meter_number) {
          console.log('   📊 Your meter number:', profile.meter_number);
          
          // Check if there are readings for this specific meter
          console.log('\n3. Checking readings for your meter...');
          const { data: meterReadings, error: meterReadingsError } = await supabase
            .from('energy_readings')
            .select('*')
            .eq('user_id', YOUR_USER_ID)
            .eq('meter_number', profile.meter_number)
            .order('reading_date', { ascending: false })
            .limit(5);
          
          if (meterReadingsError) {
            console.log('   ❌ Error querying meter readings:', meterReadingsError.message);
          } else {
            console.log('   ✅ Successfully queried meter readings');
            console.log('   📊 Found', meterReadings.length, 'readings for your meter');
            if (meterReadings.length > 0) {
              console.log('   📋 Your recent readings:');
              meterReadings.forEach((reading, index) => {
                console.log(`      ${index + 1}. ${reading.kwh_consumed} kWh at ${reading.reading_date}`);
              });
            } else {
              console.log('   ⚠️  No readings found for your meter');
            }
          }
        } else {
          console.log('   ⚠️  No meter registered to your account');
        }
      }
    } else {
      console.log('   ⚠️  Please replace YOUR_ACTUAL_USER_ID with your real user ID to check your specific data');
    }
    
    console.log('\n✅ Check completed');
    console.log('\n💡 Next steps:');
    console.log('   1. Replace YOUR_ACTUAL_USER_ID with your real user ID in this script');
    console.log('   2. Run the script again to check your specific data');
    console.log('   3. If data exists but Aurora dashboard is not showing it, check the dashboard code');
    
  } catch (error) {
    console.error('❌ Unexpected error during check:', error.message);
  }
}

// Run the check
checkEnergyReadings();