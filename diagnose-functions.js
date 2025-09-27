// Diagnostic script to check if Supabase functions are properly deployed
// Run with: node diagnose-functions.js

async function diagnoseFunctions() {
  console.log('🔍 Diagnosing Supabase functions...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Test 1: Check if we can list available RPC functions
    console.log('1. Checking available RPC functions...');
    
    // This is a workaround to check if functions exist by trying to call them
    // with invalid parameters and seeing what error we get
    
    // Test get_or_create_profile
    console.log('\n   Testing get_or_create_profile...');
    const { error: profileError } = await supabase.rpc('get_or_create_profile', {
      p_user_id: null // Invalid parameter to trigger a parameter error if function exists
    });
    
    if (profileError) {
      if (profileError.message.includes('404')) {
        console.log('   ❌ Function not found (404 error)');
      } else if (profileError.message.includes('procedure') && profileError.message.includes('does not exist')) {
        console.log('   ❌ Function not deployed to database');
      } else if (profileError.message.includes('null value') || profileError.message.includes('invalid input')) {
        console.log('   ✅ Function exists but requires valid parameters');
      } else {
        console.log('   ⚠️  Function may exist but has issues:', profileError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working');
    }
    
    // Test initialize_user_notifications
    console.log('\n   Testing initialize_user_notifications...');
    const { error: initError } = await supabase.rpc('initialize_user_notifications', {
      p_user_id: null // Invalid parameter
    });
    
    if (initError) {
      if (initError.message.includes('404')) {
        console.log('   ❌ Function not found (404 error)');
      } else if (initError.message.includes('procedure') && initError.message.includes('does not exist')) {
        console.log('   ❌ Function not deployed to database');
      } else if (initError.message.includes('null value') || initError.message.includes('invalid input')) {
        console.log('   ✅ Function exists but requires valid parameters');
      } else if (initError.message.includes('create_notification') && initError.message.includes('does not exist')) {
        console.log('   ⚠️  Function exists but depends on missing create_notification function');
      } else {
        console.log('   ⚠️  Function may exist but has issues:', initError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working');
    }
    
    // Test get_notification_preferences
    console.log('\n   Testing get_notification_preferences...');
    const { error: prefError } = await supabase.rpc('get_notification_preferences', {
      p_user_id: null // Invalid parameter
    });
    
    if (prefError) {
      if (prefError.message.includes('404')) {
        console.log('   ❌ Function not found (404 error)');
      } else if (prefError.message.includes('procedure') && prefError.message.includes('does not exist')) {
        console.log('   ❌ Function not deployed to database');
      } else if (prefError.message.includes('null value') || prefError.message.includes('invalid input')) {
        console.log('   ✅ Function exists but requires valid parameters');
      } else {
        console.log('   ⚠️  Function may exist but has issues:', prefError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working');
    }
    
    // Test get_user_notifications_safe
    console.log('\n   Testing get_user_notifications_safe...');
    const { error: notificationsError } = await supabase.rpc('get_user_notifications_safe', {
      user_id: null // Invalid parameter
    });
    
    if (notificationsError) {
      if (notificationsError.message.includes('404')) {
        console.log('   ❌ Function not found (404 error)');
      } else if (notificationsError.message.includes('procedure') && notificationsError.message.includes('does not exist')) {
        console.log('   ❌ Function not deployed to database');
      } else if (notificationsError.message.includes('null value') || notificationsError.message.includes('invalid input')) {
        console.log('   ✅ Function exists but requires valid parameters');
      } else {
        console.log('   ⚠️  Function may exist but has issues:', notificationsError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working');
    }
    
    // Test create_notification (dependency)
    console.log('\n   Testing create_notification (dependency)...');
    const { error: createNotificationError } = await supabase.rpc('create_notification', {
      p_user_id: null, // Invalid parameter
      p_title: 'test',
      p_message: 'test'
    });
    
    if (createNotificationError) {
      if (createNotificationError.message.includes('404')) {
        console.log('   ❌ Function not found (404 error)');
      } else if (createNotificationError.message.includes('procedure') && createNotificationError.message.includes('does not exist')) {
        console.log('   ❌ Function not deployed to database');
      } else if (createNotificationError.message.includes('null value') || createNotificationError.message.includes('invalid input')) {
        console.log('   ✅ Function exists but requires valid parameters');
      } else {
        console.log('   ⚠️  Function may exist but has issues:', createNotificationError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working');
    }
    
    console.log('\n✅ Function diagnosis completed');
    console.log('\n💡 Next steps:');
    console.log('   1. If functions show "not deployed", run the deployment scripts');
    console.log('   2. If functions show dependency issues, deploy dependent functions first');
    console.log('   3. If functions show parameter issues, they exist and are working');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error.message);
  }
}

// Run the diagnosis
diagnoseFunctions();