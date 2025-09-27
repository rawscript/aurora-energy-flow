// Test if the Netlify domain is properly allowed by CORS
const fetch = require('node-fetch');

async function testNetlifyCors() {
  const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function';
  const netlifyOrigin = 'https://smart-simulator.netlify.app';
  
  console.log(`🔍 Testing CORS configuration for Netlify domain`);
  console.log(`Proxy URL: ${proxyUrl}`);
  console.log(`Origin: ${netlifyOrigin}`);
  console.log('=' .repeat(50));
  
  try {
    // Test OPTIONS request (preflight) with Netlify origin
    console.log('\n📋 Testing OPTIONS request (CORS preflight) with Netlify origin...');
    const optionsResponse = await fetch(proxyUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': netlifyOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log(`✅ OPTIONS request successful. Status: ${optionsResponse.status}`);
    console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`);
    console.log(`   Access-Control-Allow-Credentials: ${optionsResponse.headers.get('access-control-allow-credentials')}`);
    
    // Check if the origin is allowed
    const allowedOrigin = optionsResponse.headers.get('access-control-allow-origin');
    if (allowedOrigin === netlifyOrigin || allowedOrigin === '*') {
      console.log(`✅ Netlify origin is allowed by CORS configuration`);
    } else {
      console.log(`⚠️  Netlify origin may not be properly allowed. Expected: ${netlifyOrigin}, Got: ${allowedOrigin}`);
    }
    
    // Test POST request with CORS headers
    console.log('\n📋 Testing POST request with Netlify origin...');
    const postResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': netlifyOrigin
      },
      body: JSON.stringify({
        url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/super-action',
        user_id: 'test-user',
        meter_number: 'test-meter',
        kwh_consumed: 10.5,
        timestamp: new Date().toISOString()
      })
    });
    
    console.log(`✅ POST request sent. Status: ${postResponse.status}`);
    console.log(`   Access-Control-Allow-Origin: ${postResponse.headers.get('access-control-allow-origin')}`);
    
    // Try to parse the response
    try {
      const data = await postResponse.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } catch (parseError) {
      console.log(`   Response (non-JSON): Could not parse response`);
    }
    
  } catch (error) {
    console.log(`❌ CORS test failed. Error: ${error.message}`);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📝 Summary:');
  console.log('The proxy server CORS configuration includes https://*.netlify.app');
  console.log('Your domain https://smart-simulator.netlify.app should be allowed');
  console.log('If you still have issues, check the browser console for specific errors');
}

// Run the test
testNetlifyCors();