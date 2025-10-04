// Script to check if required database functions exist
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
  console.log('Checking if required database functions exist...');
  
  try {
    // Test if we can connect to the database
    console.log('Testing database connection...');
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Database connection error:', error);
    } else {
      console.log('Database connection successful');
    }
    
    // Try to call the insert_energy_reading_improved function directly
    console.log('Testing insert_energy_reading_improved function...');
    try {
      const { data: funcData, error: funcError } = await supabase.rpc('insert_energy_reading_improved', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_meter_number: 'test-meter',
        p_kwh_consumed: 10.5,
        p_cost_per_kwh: 25.0
      });
      
      if (funcError) {
        console.log('Error calling insert_energy_reading_improved:', funcError);
      } else {
        console.log('Success calling insert_energy_reading_improved:', funcData);
      }
    } catch (funcCallError) {
      console.log('Exception when calling insert_energy_reading_improved:', funcCallError);
    }
    
    // Try to call the update_token_balance_improved function directly
    console.log('Testing update_token_balance_improved function...');
    try {
      const { data: funcData2, error: funcError2 } = await supabase.rpc('update_token_balance_improved', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_meter_number: 'test-meter',
        p_amount: 100.0,
        p_transaction_type: 'purchase'
      });
      
      if (funcError2) {
        console.log('Error calling update_token_balance_improved:', funcError2);
      } else {
        console.log('Success calling update_token_balance_improved:', funcData2);
      }
    } catch (funcCallError2) {
      console.log('Exception when calling update_token_balance_improved:', funcCallError2);
    }
    
  } catch (error) {
    console.error('Error checking functions:', error);
  }
}

checkFunctions();