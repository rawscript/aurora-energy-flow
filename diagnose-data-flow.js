// Diagnostic script to check smart meter data flow issues
// Run with: node diagnose-data-flow.js

async function diagnoseDataFlow() {
  console.log('🔍 Diagnosing smart meter data flow issues...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Checking energy_readings table structure...');
    
    // Check if energy_readings table exists and has the correct structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('energy_readings')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.message.includes('relation "energy_readings" does not exist')) {
      console.log('   ❌ energy_readings table does not exist');
      console.log('   💡 You need to create the energy_readings table');
    } else if (tableError) {
      console.log('   ⚠️  Error accessing energy_readings table:', tableError.message);
    } else {
      console.log('   ✅ energy_readings table exists');
      console.log('   📊 Sample row structure:', Object.keys(tableInfo[0] || {}));
    }
    
    console.log('\n2. Checking if smart-meter-webhook function exists...');
    
    // Try to call the smart meter webhook function
    const { data: webhookData, error: webhookError } = await supabase.functions.invoke('smart-meter-webhook', {
      body: {
        meter_number: 'TEST123',
        kwh_consumed: 12.34,
        user_id: '00000000-0000-0000-0000-000000000000',
        cost_per_kwh: 25.0
      }
    });
    
    if (webhookError && webhookError.message.includes('404')) {
      console.log('   ❌ smart-meter-webhook function is not deployed');
      console.log('   💡 Run deploy-all-functions.bat to deploy edge functions');
    } else if (webhookError) {
      console.log('   ⚠️  smart-meter-webhook function exists but returned error:', webhookError.message);
      if (webhookError.message.includes('signature')) {
        console.log('   💡 This might be a signature verification issue - check WEBHOOK_SECRET');
      } else if (webhookError.message.includes('user not found')) {
        console.log('   💡 This might be a user profile issue - check if user exists');
      }
    } else {
      console.log('   ✅ smart-meter-webhook function is working');
      console.log('   📤 Webhook response:', JSON.stringify(webhookData, null, 2));
    }
    
    console.log('\n3. Checking insert_energy_reading functions...');
    
    // Test the improved function
    console.log('   Testing insert_energy_reading_improved...');
    const { data: insertData, error: insertError } = await supabase.rpc('insert_energy_reading_improved', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_meter_number: 'TEST123',
      p_kwh_consumed: 15.75,
      p_cost_per_kwh: 25.0
    });
    
    if (insertError && insertError.message.includes('404')) {
      console.log('   ❌ insert_energy_reading_improved function is not deployed');
    } else if (insertError) {
      console.log('   ⚠️  insert_energy_reading_improved exists but has issues:', insertError.message);
      if (insertError.message.includes('Meter') && insertError.message.includes('does not belong to user')) {
        console.log('   💡 This is expected - the meter is not registered to this test user');
        console.log('   ✅ Function exists and is working (meter validation is correct)');
      } else if (insertError.message.includes('required')) {
        console.log('   ✅ Function exists and is working (parameter validation is correct)');
      }
    } else {
      console.log('   ✅ insert_energy_reading_improved function is working');
      console.log('   📤 Insert response:', insertData);
    }
    
    console.log('\n4. Checking get_latest_energy_data functions...');
    
    // Test the improved function
    console.log('   Testing get_latest_energy_data_improved...');
    const { data: energyData, error: energyError } = await supabase.rpc('get_latest_energy_data_improved', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (energyError && energyError.message.includes('404')) {
      console.log('   ❌ get_latest_energy_data_improved function is not deployed');
    } else if (energyError) {
      console.log('   ⚠️  get_latest_energy_data_improved exists but has issues:', energyError.message);
    } else {
      console.log('   ✅ get_latest_energy_data_improved function is working');
      console.log('   📊 Energy data response:', JSON.stringify(energyData, null, 2));
    }
    
    console.log('\n5. Checking user profile for meter connection...');
    
    // Check if a test user has a meter connected
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('meter_number, id')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();
    
    if (profileError && profileError.message.includes('row')) {
      console.log('   ⚠️  Test user profile does not exist (this is expected for a test user)');
    } else if (profileError) {
      console.log('   ⚠️  Error accessing user profile:', profileError.message);
    } else {
      console.log('   ✅ User profile exists');
      if (profileData.meter_number) {
        console.log('   📊 User has meter connected:', profileData.meter_number);
      } else {
        console.log('   ⚠️  User does not have a meter connected');
      }
    }
    
    console.log('\n✅ Data flow diagnosis completed');
    console.log('\n💡 Next steps:');
    console.log('   1. If functions show "not deployed", run the deployment scripts');
    console.log('   2. If there are signature errors, check the WEBHOOK_SECRET configuration');
    console.log('   3. If there are user validation errors, ensure meters are properly registered');
    console.log('   4. Check that the smart meter simulator is sending data in the correct format');
    
  } catch (error) {
    console.error('❌ Unexpected error during data flow diagnosis:', error.message);
  }
}

// Run the diagnosis
diagnoseDataFlow();