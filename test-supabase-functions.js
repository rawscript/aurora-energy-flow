// Test script to verify that Supabase functions are working correctly
// Run with: node test-supabase-functions.js

// Use dynamic import for CommonJS compatibility
async function testFunctions() {
  console.log('🔍 Testing Supabase functions...\n');
  
  try {
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration - Replace with your actual values
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Test get_or_create_profile function
    console.log('1. Testing get_or_create_profile function...');
    
    // Note: This is a test call - in a real scenario, you would use actual user data
    // and a valid user token for authentication
    const { data, error } = await supabase.rpc('get_or_create_profile', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      p_email: 'test@example.com',
      p_full_name: 'Test User',
      p_phone_number: '1234567890',
      p_meter_number: 'TEST123'
    });
    
    if (error) {
      console.log('❌ Error calling get_or_create_profile:', error.message);
      if (error.message.includes('404')) {
        console.log('   This indicates the function is not deployed to Supabase');
      }
    } else {
      console.log('✅ get_or_create_profile function is working');
      console.log('   Response:', JSON.stringify(data, null, 2));
    }
    
    // Test other functions
    console.log('\n2. Testing other RPC functions...');
    
    // Test get_notification_preferences
    const { data: notificationData, error: notificationError } = await supabase.rpc('get_notification_preferences', {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (notificationError) {
      console.log('❌ Error calling get_notification_preferences:', notificationError.message);
      if (notificationError.message.includes('404')) {
        console.log('   This indicates the function is not deployed to Supabase');
      }
    } else {
      console.log('✅ get_notification_preferences function is working');
    }
    
    // Test get_user_notifications_safe
    const { data: userNotificationsData, error: userNotificationsError } = await supabase.rpc('get_user_notifications_safe', {
      user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (userNotificationsError) {
      console.log('❌ Error calling get_user_notifications_safe:', userNotificationsError.message);
      if (userNotificationsError.message.includes('404')) {
        console.log('   This indicates the function is not deployed to Supabase');
      }
    } else {
      console.log('✅ get_user_notifications_safe function is working');
    }
    
    console.log('\n✅ Function testing completed');
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

// Run the test
testFunctions();