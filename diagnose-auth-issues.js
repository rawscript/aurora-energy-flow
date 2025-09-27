// Diagnostic script to check authentication issues
// Run with: node diagnose-auth-issues.js

async function diagnoseAuthIssues() {
  try {
    console.log('🔍 Diagnosing Authentication Issues...\n');
    
    // Dynamically import supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configuration
    const SUPABASE_URL = 'https://rcthtxwzsqvwivritzln.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('1. Checking Supabase connection...');
    
    // Test basic connection
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is OK
        console.log('   ❌ Connection error:', error.message);
        console.log('   💡 Check your network connection and Supabase configuration');
        return;
      }
      
      console.log('   ✅ Supabase connection successful');
    } catch (error) {
      console.log('   ❌ Connection failed:', error.message);
      return;
    }
    
    console.log('\n2. Testing RPC functions...');
    
    // Test key RPC functions
    const testFunctions = [
      'get_or_create_profile',
      'get_notification_preferences',
      'safe_update_profile'
    ];
    
    for (const func of testFunctions) {
      try {
        // We can't test these properly without a user ID, but we can check if they exist
        console.log(`   Testing ${func}...`);
        // This will likely fail with a parameter error, but that's expected
        const { data, error } = await supabase.rpc(func, {});
        
        if (error && error.code === '404') {
          console.log(`   ❌ ${func} not found (404 error)`);
          console.log(`   💡 Deploy the ${func} function to Supabase`);
        } else if (error && (error.code === '400' || error.message.includes('argument'))) {
          console.log(`   ✅ ${func} exists (parameter validation error is normal)`);
        } else {
          console.log(`   ✅ ${func} is working`);
        }
      } catch (error) {
        console.log(`   ❌ Error testing ${func}:`, error.message);
      }
    }
    
    console.log('\n3. Checking rate limiting...');
    
    // Test for rate limiting by making several quick requests
    const startTime = Date.now();
    let successCount = 0;
    let rateLimitCount = 0;
    let otherErrorCount = 0;
    
    console.log('   Making 10 rapid requests to test rate limiting...');
    
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        supabase.from('profiles').select('id').limit(1)
          .then(() => successCount++)
          .catch(error => {
            if (error.status === 429) {
              rateLimitCount++;
            } else {
              otherErrorCount++;
            }
          })
      );
    }
    
    await Promise.all(requests);
    
    const duration = Date.now() - startTime;
    
    console.log(`   Requests completed in ${duration}ms`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Rate limited (429): ${rateLimitCount}`);
    console.log(`   Other errors: ${otherErrorCount}`);
    
    if (rateLimitCount > 0) {
      console.log('   ⚠️  Rate limiting detected');
      console.log('   💡 This may be causing your 429 errors');
    }
    
    console.log('\n4. Checking session management...');
    
    console.log('   Session management is handled client-side in the browser');
    console.log('   To diagnose session issues, check the browser console logs');
    console.log('   Look for patterns like:');
    console.log('   - "Auth state change: SIGNED_IN" appearing multiple times');
    console.log('   - "Session expires in X minutes" messages');
    console.log('   - "Token refreshed" events');
    
    console.log('\n📋 RECOMMENDATIONS:');
    console.log('   1. Check browser console for detailed error messages');
    console.log('   2. Look for network tab entries with 429 or 400 status codes');
    console.log('   3. Verify all Supabase functions are deployed correctly');
    console.log('   4. Check if you\'re making too many requests in a short time');
    console.log('   5. Ensure your Supabase project configuration is correct');
    
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('   1. Clear browser cache and localStorage');
    console.log('   2. Try in an incognito/private browsing window');
    console.log('   3. Check if the issue occurs on all devices/browsers');
    console.log('   4. Verify your internet connection is stable');
    console.log('   5. Check Supabase dashboard for any service issues');
    
    console.log('\n✅ Diagnostic check completed');
    
  } catch (error) {
    console.error('❌ Unexpected error during diagnostic check:', error.message);
  }
}

// Run the diagnostic
diagnoseAuthIssues();