// Test CORS headers
const fetch = require('node-fetch');

async function testCorsHeaders() {
  const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function';
  const origin = 'https://aurora-smart-meter.onrender.com';
  
  console.log(`🔍 Testing CORS headers for ${proxyUrl}`);
  console.log(`Origin: ${origin}`);
  console.log('=' .repeat(50));
  
  try {
    // Test OPTIONS request (preflight)
    console.log('\n📋 Testing OPTIONS request (CORS preflight)...');
    const optionsResponse = await fetch(proxyUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    });
    
    console.log(`✅ OPTIONS request successful. Status: ${optionsResponse.status}`);
    console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`);
    console.log(`   Access-Control-Allow-Credentials: ${optionsResponse.headers.get('access-control-allow-credentials')}`);
    
    // Test POST request with CORS headers
    console.log('\n📋 Testing POST request with CORS headers...');
    const postResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin
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
  console.log('📝 If CORS headers are missing or incorrect, the browser will block the request.');
}

// Run the test
testCorsHeaders();