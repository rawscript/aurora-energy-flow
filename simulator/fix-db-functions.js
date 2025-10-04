// Script to fix database function conflicts
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rcthtxwzsqvwivritzln.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNotificationFunction() {
  try {
    console.log('Fixing get_notification_preferences function...');
    
    // First, let's try to drop the existing function
    const dropSql = `
      DROP FUNCTION IF EXISTS public.get_notification_preferences(UUID);
    `;
    
    const { error: dropError } = await supabase.rpc('execute_sql', { sql: dropSql });
    
    if (dropError) {
      console.log('Warning: Could not drop existing function:', dropError.message);
    } else {
      console.log('Successfully dropped existing function');
    }
    
    // Now create the new function
    const createSql = `
      CREATE OR REPLACE FUNCTION public.get_notification_preferences(
        p_user_id UUID
      )
      RETURNS TABLE (
        user_id UUID,
        token_low BOOLEAN,
        token_depleted BOOLEAN,
        power_restored BOOLEAN,
        energy_alert BOOLEAN,
        low_balance_alert BOOLEAN
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Return the notification preferences for the user
        RETURN QUERY
        SELECT
          id as user_id,
          COALESCE((notification_preferences->>'token_low')::BOOLEAN, TRUE) AS token_low,
          COALESCE((notification_preferences->>'token_depleted')::BOOLEAN, TRUE) AS token_depleted,
          COALESCE((notification_preferences->>'power_restored')::BOOLEAN, TRUE) AS power_restored,
          COALESCE((notification_preferences->>'energy_alert')::BOOLEAN, TRUE) AS energy_alert,
          COALESCE((notification_preferences->>'low_balance_alert')::BOOLEAN, TRUE) AS low_balance_alert
        FROM profiles
        WHERE id = p_user_id;
      END;
      $$;
    `;
    
    const { error: createError } = await supabase.rpc('execute_sql', { sql: createSql });
    
    if (createError) {
      console.error('Error creating new function:', createError);
    } else {
      console.log('Successfully created new function');
    }
    
  } catch (error) {
    console.error('Error fixing notification function:', error);
  }
}

async function fixEnergyFunctions() {
  try {
    console.log('Fixing energy reading functions...');
    
    // Drop the insert_energy_reading_improved function if it exists
    const dropInsertSql = `
      DROP FUNCTION IF EXISTS public.insert_energy_reading_improved(UUID, TEXT, NUMERIC, NUMERIC);
    `;
    
    const { error: dropInsertError } = await supabase.rpc('execute_sql', { sql: dropInsertSql });
    
    if (dropInsertError) {
      console.log('Warning: Could not drop insert_energy_reading_improved:', dropInsertError.message);
    } else {
      console.log('Successfully dropped insert_energy_reading_improved function');
    }
    
    // Drop the update_token_balance_improved function if it exists
    const dropUpdateSql = `
      DROP FUNCTION IF EXISTS public.update_token_balance_improved(UUID, TEXT, DECIMAL, TEXT, BOOLEAN, TEXT, TEXT, TEXT);
    `;
    
    const { error: dropUpdateError } = await supabase.rpc('execute_sql', { sql: dropUpdateSql });
    
    if (dropUpdateError) {
      console.log('Warning: Could not drop update_token_balance_improved:', dropUpdateError.message);
    } else {
      console.log('Successfully dropped update_token_balance_improved function');
    }
    
  } catch (error) {
    console.error('Error fixing energy functions:', error);
  }
}

async function main() {
  console.log('Fixing database function conflicts...');
  
  await fixNotificationFunction();
  await fixEnergyFunctions();
  
  console.log('Function fixes complete. Now try deploying the migrations again.');
}

main();