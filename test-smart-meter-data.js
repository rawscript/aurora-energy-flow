// Test script to verify smart meter data flow to Supabase
// Run with: node test-smart-meter-data.js

async function testSmartMeterData() {
  console.log('🔍 Testing smart meter data flow to Supabase...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Testing if smart meter data table exists...');
    
    // Check if energy_readings table exists by trying to query it
    const { data: readings, error: readingsError } = await supabase
      .from('energy_readings')
      .select('*')
      .limit(1);
    
    if (readingsError && readingsError.message.includes('relation "energy_readings" does not exist')) {
      console.log('   ⚠️  energy_readings table does not exist');
      console.log('   💡 You may need to create this table or check if it has a different name');
      
      // Try common alternative table names
      const alternativeTables = ['meter_readings', 'smart_meter_data', 'energy_data'];
      
      for (const tableName of alternativeTables) {
        const { data: altData, error: altError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!altError) {
          console.log(`   ✅ Found data in ${tableName} table instead`);
          break;
        }
      }
    } else if (readingsError) {
      console.log('   ⚠️  Error accessing energy_readings table:', readingsError.message);
    } else {
      console.log('   ✅ energy_readings table exists and is accessible');
      if (readings && readings.length > 0) {
        console.log('   📊 Sample reading:', JSON.stringify(readings[0], null, 2));
      } else {
        console.log('   📝 No readings found in table');
      }
    }
    
    console.log('\n2. Testing if smart-meter-webhook function exists...');
    
    // Try to call the smart meter webhook function
    const { data: webhookData, error: webhookError } = await supabase.functions.invoke('smart-meter-webhook', {
      body: {
        user_id: 'test-user-123',
        meter_number: 'test-meter-456',
        kwh_consumed: 12.34,
        timestamp: new Date().toISOString()
      }
    });
    
    if (webhookError && webhookError.message.includes('404')) {
      console.log('   ❌ smart-meter-webhook function is not deployed');
      console.log('   💡 Run deploy-all-functions.bat to deploy edge functions');
    } else if (webhookError) {
      console.log('   ⚠️  smart-meter-webhook function exists but returned error:', webhookError.message);
    } else {
      console.log('   ✅ smart-meter-webhook function is working');
      console.log('   📤 Webhook response:', JSON.stringify(webhookData, null, 2));
    }
    
    console.log('\n3. Testing direct database insert (if applicable)...');
    
    // Try to insert a test reading directly
    const testReading = {
      user_id: '00000000-0000-0000-0000-000000000000',
      meter_number: 'TEST123',
      kwh_consumed: 15.75,
      timestamp: new Date().toISOString()
    };
    
    // Try common table names
    const tablesToTry = ['energy_readings', 'meter_readings', 'smart_meter_data'];
    
    for (const tableName of tablesToTry) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from(tableName)
          .insert([testReading]);
        
        if (!insertError) {
          console.log(`   ✅ Successfully inserted test data into ${tableName}`);
          break;
        } else if (!insertError.message.includes('relation') && !insertError.message.includes('does not exist')) {
          // If it's not a table existence error, it might be a permission or constraint error
          console.log(`   ⚠️  ${tableName} exists but insert failed:`, insertError.message);
          break;
        }
      } catch (insertException) {
        // Continue to next table
      }
    }
    
    console.log('\n✅ Smart meter data flow test completed');
    console.log('\n💡 Next steps:');
    console.log('   1. If tables are missing, check your database schema');
    console.log('   2. If functions are missing, deploy them using the deployment scripts');
    console.log('   3. If data is not flowing, check the smart meter simulator configuration');
    
  } catch (error) {
    console.error('❌ Unexpected error during smart meter data test:', error.message);
  }
}

// Run the test
testSmartMeterData();