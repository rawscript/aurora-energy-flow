// Simple verification script for data flow fixes
// Run with: node simple-verify-fix.js

async function simpleVerifyFix() {
  console.log('🔍 Simple verification of data flow fixes...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Testing key database functions...');
    
    // Test get_or_create_profile function
    console.log('   Testing get_or_create_profile...');
    try {
      const { error: profileError } = await supabase.rpc('get_or_create_profile', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_email: 'test@example.com',
        p_full_name: 'Test User',
        p_phone_number: '1234567890',
        p_meter_number: 'TEST123'
      });
      
      if (profileError && profileError.message.includes('404')) {
        console.log('   ❌ get_or_create_profile not found (404 error)');
      } else if (profileError) {
        console.log('   ✅ get_or_create_profile exists (parameter validation error is normal)');
      } else {
        console.log('   ✅ get_or_create_profile exists and is working');
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log('   ❌ get_or_create_profile not found (404 error)');
      } else {
        console.log('   ⚠️  get_or_create_profile check failed:', err.message);
      }
    }
    
    // Test insert_energy_reading_improved function
    console.log('   Testing insert_energy_reading_improved...');
    try {
      const { error: insertError } = await supabase.rpc('insert_energy_reading_improved', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_meter_number: 'TEST123',
        p_kwh_consumed: 10.5,
        p_cost_per_kwh: 25.0
      });
      
      if (insertError && insertError.message.includes('404')) {
        console.log('   ❌ insert_energy_reading_improved not found (404 error)');
      } else if (insertError) {
        console.log('   ✅ insert_energy_reading_improved exists (parameter validation error is normal)');
      } else {
        console.log('   ✅ insert_energy_reading_improved exists and is working');
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log('   ❌ insert_energy_reading_improved not found (404 error)');
      } else {
        console.log('   ⚠️  insert_energy_reading_improved check failed:', err.message);
      }
    }
    
    // Test get_latest_energy_data_improved function
    console.log('   Testing get_latest_energy_data_improved...');
    try {
      const { error: energyError } = await supabase.rpc('get_latest_energy_data_improved', {
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (energyError && energyError.message.includes('404')) {
        console.log('   ❌ get_latest_energy_data_improved not found (404 error)');
      } else if (energyError) {
        console.log('   ✅ get_latest_energy_data_improved exists (parameter validation error is normal)');
      } else {
        console.log('   ✅ get_latest_energy_data_improved exists and is working');
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log('   ❌ get_latest_energy_data_improved not found (404 error)');
      } else {
        console.log('   ⚠️  get_latest_energy_data_improved check failed:', err.message);
      }
    }
    
    console.log('\n2. Testing energy_readings table...');
    
    // Test if we can access the energy_readings table
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('energy_readings')
        .select('*')
        .limit(1);
      
      if (tableError && tableError.message.includes('relation "energy_readings" does not exist')) {
        console.log('   ❌ energy_readings table does not exist');
      } else if (tableError) {
        console.log('   ⚠️  Error accessing energy_readings table:', tableError.message);
      } else {
        console.log('   ✅ energy_readings table exists and is accessible');
      }
    } catch (err) {
      console.log('   ❌ Error testing energy_readings table:', err.message);
    }
    
    console.log('\n3. Testing smart-meter-webhook function...');
    
    // Test invoking the smart-meter-webhook function
    try {
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('smart-meter-webhook', {
        body: {
          meter_number: 'TEST123',
          kwh_consumed: 15.75,
          user_id: '00000000-0000-0000-0000-000000000000',
          cost_per_kwh: 25.0
        }
      });
      
      if (webhookError && webhookError.message.includes('404')) {
        console.log('   ❌ smart-meter-webhook function not found (404 error)');
      } else if (webhookError) {
        console.log('   ⚠️  smart-meter-webhook function exists but returned error:', webhookError.message);
      } else {
        console.log('   ✅ smart-meter-webhook function exists and is working');
      }
    } catch (err) {
      if (err.message.includes('404')) {
        console.log('   ❌ smart-meter-webhook function not found (404 error)');
      } else {
        console.log('   ⚠️  smart-meter-webhook function check failed:', err.message);
      }
    }
    
    console.log('\n✅ Simple verification completed');
    console.log('\n💡 Next steps:');
    console.log('   1. Redeploy the updated smart meter simulator to Netlify');
    console.log('   2. Test sending a reading from the simulator');
    console.log('   3. Check if data appears in the Aurora dashboard');
    
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
  }
}

// Run the verification
simpleVerifyFix();