// Verification script to check if Supabase cache clearing worked
// Run with: node verify-cache-clear.js

async function verifyCacheClear() {
  console.log('🔍 Verifying Supabase cache clearing...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Testing get_or_create_profile function...');
    
    // Test with a simple call that should work if the function exists
    const { data: profileData, error: profileError } = await supabase.rpc('get_or_create_profile', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      p_email: 'cache-test@example.com',
      p_full_name: 'Cache Test User',
      p_phone_number: '0000000000',
      p_meter_number: 'CACHE001'
    });
    
    if (profileError) {
      if (profileError.message.includes('404')) {
        console.log('   ❌ Function still not found (404 error) - cache may not be cleared');
        console.log('   💡 Try restarting the database from Supabase dashboard');
      } else if (profileError.message.includes('null value') || profileError.message.includes('invalid input')) {
        console.log('   ✅ Function exists and is working (parameter validation error is expected)');
      } else {
        console.log('   ⚠️  Function exists but has other issues:', profileError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working correctly');
      console.log('   📊 Response:', JSON.stringify(profileData, null, 2));
    }
    
    console.log('\n2. Testing initialize_user_notifications function...');
    
    const { data: initData, error: initError } = await supabase.rpc('initialize_user_notifications', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (initError) {
      if (initError.message.includes('404')) {
        console.log('   ❌ Function still not found (404 error)');
      } else if (initError.message.includes('create_notification') && initError.message.includes('does not exist')) {
        console.log('   ⚠️  Function exists but depends on missing create_notification function');
      } else if (initError.message.includes('null value') || initError.message.includes('invalid input')) {
        console.log('   ✅ Function exists and is working (parameter validation error is expected)');
      } else {
        console.log('   ⚠️  Function exists but has other issues:', initError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working correctly');
      console.log('   📊 Response:', JSON.stringify(initData, null, 2));
    }
    
    console.log('\n3. Testing get_user_notifications_safe function...');
    
    const { data: notificationsData, error: notificationsError } = await supabase.rpc('get_user_notifications_safe', {
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (notificationsError) {
      if (notificationsError.message.includes('404')) {
        console.log('   ❌ Function still not found (404 error)');
      } else if (notificationsError.message.includes('null value') || notificationsError.message.includes('invalid input')) {
        console.log('   ✅ Function exists and is working (parameter validation error is expected)');
      } else {
        console.log('   ⚠️  Function exists but has other issues:', notificationsError.message);
      }
    } else {
      console.log('   ✅ Function exists and is working correctly');
      if (notificationsData) {
        console.log('   📊 Found', Array.isArray(notificationsData) ? notificationsData.length : 'some', 'notifications');
      }
    }
    
    console.log('\n✅ Cache verification completed');
    console.log('\n💡 If functions still show 404 errors:');
    console.log('   1. Restart your Supabase database from the dashboard');
    console.log('   2. Redeploy all functions using the redeploy scripts');
    console.log('   3. Check Supabase logs for specific error messages');
    
  } catch (error) {
    console.error('❌ Unexpected error during cache verification:', error.message);
  }
}

// Run the verification
verifyCacheClear();