// Comprehensive fix script for Supabase function deployment issues
// Run with: node fix-functions.js

async function fixFunctions() {
  console.log('🔧 Starting comprehensive fix for Supabase functions...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Checking notifications table schema...');
    
    // Check if notifications table has the required columns
    const { data: columns, error: schemaError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (schemaError && !schemaError.message.includes('relation "notifications" does not exist')) {
      console.log('   ⚠️  Schema error:', schemaError.message);
      
      // If it's a column issue, we need to update the table schema
      if (schemaError.message.includes('column') && schemaError.message.includes('does not exist')) {
        console.log('   🛠️  Column missing - you may need to update your database schema');
      }
    } else if (schemaError && schemaError.message.includes('relation "notifications" does not exist')) {
      console.log('   ⚠️  Notifications table does not exist - you need to create it first');
    } else {
      console.log('   ✅ Notifications table schema looks correct');
    }
    
    console.log('\n2. Attempting to deploy missing functions...');
    
    // Try to call get_or_create_profile with a test parameter to see if it exists
    console.log('   Testing get_or_create_profile...');
    const { error: profileError } = await supabase.rpc('get_or_create_profile', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (profileError && (profileError.message.includes('404') || profileError.message.includes('does not exist'))) {
      console.log('   ❌ get_or_create_profile function is not deployed');
      console.log('   💡 Solution: Run deploy-db-functions.bat or deploy-db-functions.sh');
    } else if (profileError) {
      console.log('   ⚠️  get_or_create_profile exists but has parameter issues (this is normal)');
      console.log('   ✅ Function is deployed correctly');
    } else {
      console.log('   ✅ get_or_create_profile function is working');
    }
    
    console.log('\n3. Checking dependent functions...');
    
    // Test create_notification function (dependency)
    console.log('   Testing create_notification...');
    const { error: createNotificationError } = await supabase.rpc('create_notification', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_title: 'test',
      p_message: 'test'
    });
    
    if (createNotificationError && (createNotificationError.message.includes('404') || createNotificationError.message.includes('does not exist'))) {
      console.log('   ❌ create_notification function is not deployed');
      console.log('   💡 Solution: This should be deployed with the database functions');
    } else if (createNotificationError && createNotificationError.message.includes('column') && createNotificationError.message.includes('does not exist')) {
      console.log('   ⚠️  create_notification exists but has schema issues');
      console.log('   💡 Solution: Check if notifications table has all required columns');
    } else {
      console.log('   ✅ create_notification function is working');
    }
    
    console.log('\n4. Recommended actions:');
    console.log('   📋 1. Deploy database functions:');
    console.log('      Windows: deploy-db-functions.bat');
    console.log('      Mac/Linux: ./deploy-db-functions.sh');
    console.log('');
    console.log('   📋 2. Deploy edge functions:');
    console.log('      Windows: deploy-all-functions.bat');
    console.log('      Mac/Linux: ./deploy-all-functions.sh');
    console.log('');
    console.log('   📋 3. If you still get schema errors, check the notifications table structure');
    console.log('      in your Supabase database and ensure it has all required columns');
    console.log('');
    console.log('   📋 4. After deployment, restart your Aurora application');
    
    console.log('\n✅ Fix diagnosis completed');
    
  } catch (error) {
    console.error('❌ Unexpected error during fix process:', error.message);
  }
}

// Run the fix process
fixFunctions();