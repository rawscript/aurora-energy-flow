// Test script to verify smart meter data flow after fixes
// Run with: node verify-data-flow-fix.js

async function verifyDataFlowFix() {
  console.log('🔍 Verifying smart meter data flow fixes...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Testing smart-meter-webhook function deployment...');
    
    // Test if the smart-meter-webhook function is deployed
    const { data: functions, error: functionsError } = await supabase.functions.list();
    
    if (functionsError) {
      console.log('   ❌ Error listing functions:', functionsError.message);
    } else {
      const webhookFunction = functions.find(f => f.name === 'smart-meter-webhook');
      if (webhookFunction) {
        console.log('   ✅ smart-meter-webhook function is deployed');
        console.log('   📊 Function status:', webhookFunction.status);
      } else {
        console.log('   ❌ smart-meter-webhook function is not deployed');
      }
    }
    
    console.log('\n2. Testing database functions...');
    
    // Test a few key database functions
    const testFunctions = [
      'get_or_create_profile',
      'insert_energy_reading_improved',
      'get_latest_energy_data_improved'
    ];
    
    for (const funcName of testFunctions) {
      console.log(`   Testing ${funcName}...`);
      try {
        const { error } = await supabase.rpc(funcName, {
          // Provide minimal parameters to test if function exists
          p_user_id: '00000000-0000-0000-0000-000000000000'
        });
        
        if (error && error.message.includes('404')) {
          console.log(`   ❌ ${funcName} not found (404 error)`);
        } else if (error) {
          // Function exists but has parameter/validation errors (expected)
          console.log(`   ✅ ${funcName} exists (parameter validation error is normal)`);
        } else {
          console.log(`   ✅ ${funcName} exists and is working`);
        }
      } catch (err) {
        if (err.message.includes('404')) {
          console.log(`   ❌ ${funcName} not found (404 error)`);
        } else {
          console.log(`   ⚠️  ${funcName} check failed:`, err.message);
        }
      }
    }
    
    console.log('\n3. Testing energy_readings table access...');
    
    // Test if we can access the energy_readings table
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
    
    console.log('\n4. Testing direct energy reading insertion...');
    
    // Test inserting a reading directly
    const { data: insertData, error: insertError } = await supabase.rpc('insert_energy_reading_improved', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_meter_number: 'TEST123',
      p_kwh_consumed: 10.5,
      p_cost_per_kwh: 25.0
    });
    
    if (insertError && insertError.message.includes('404')) {
      console.log('   ❌ insert_energy_reading_improved function not found');
    } else if (insertError) {
      console.log('   ⚠️  insert_energy_reading_improved exists but has issues:', insertError.message);
      if (insertError.message.includes('Meter') && insertError.message.includes('does not belong to user')) {
        console.log('   ✅ Function exists and parameter validation works (meter validation is correct)');
      }
    } else {
      console.log('   ✅ insert_energy_reading_improved function is working');
      console.log('   📤 Insert result:', insertData);
    }
    
    console.log('\n✅ Data flow fix verification completed');
    console.log('\n💡 Next steps:');
    console.log('   1. Redeploy the updated smart meter simulator to Netlify');
    console.log('   2. Test sending a reading from the simulator');
    console.log('   3. Check if data appears in the Aurora dashboard');
    console.log('   4. Monitor browser console for any remaining errors');
    
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
  }
}

// Run the verification
verifyDataFlowFix();