// Script to deploy specific database functions
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFunction(functionName) {
  try {
    console.log(`Deploying function: ${functionName}`);
    
    // Read the function SQL file
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', '20250902000000_comprehensive_fixes.sql');
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract the specific function
    const functionStart = sqlContent.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
    if (functionStart === -1) {
      console.error(`Function ${functionName} not found in SQL file`);
      return;
    }
    
    // Find the end of the function (END;$$;)
    const functionEndMarker = 'END;$$;';
    const functionEnd = sqlContent.indexOf(functionEndMarker, functionStart);
    if (functionEnd === -1) {
      console.error(`Could not find end of function ${functionName}`);
      return;
    }
    
    // Extract the function SQL
    const functionSql = sqlContent.substring(functionStart, functionEnd + functionEndMarker.length);
    
    console.log('Function SQL:');
    console.log(functionSql);
    
    // Execute the function creation
    const { error } = await supabase.rpc('execute_sql', { sql: functionSql });
    
    if (error) {
      console.error(`Error deploying ${functionName}:`, error);
    } else {
      console.log(`Successfully deployed ${functionName}`);
    }
  } catch (error) {
    console.error(`Error deploying ${functionName}:`, error);
  }
}

async function main() {
  console.log('Deploying specific database functions...');
  
  // Deploy the functions needed for smart meter
  await deployFunction('insert_energy_reading_improved');
  await deployFunction('update_token_balance_improved');
  
  console.log('Deployment complete');
}

main();