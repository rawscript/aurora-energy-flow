// Simulate a browser request to the proxy server to test CORS
const fetch = require('node-fetch');

async function simulateBrowserRequest() {
  const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function';
  
  console.log(`🔍 Simulating browser request to proxy server`);
  console.log(`Proxy URL: ${proxyUrl}`);
  console.log('=' .repeat(50));
  
  // Test 1: OPTIONS request (preflight)
  console.log('\n📋 Test 1: CORS Preflight (OPTIONS request)');
  try {
    const optionsResponse = await fetch(proxyUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://aurora-smart-meter.onrender.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      },
      timeout: 10000
    });
    
    console.log(`✅ OPTIONS request successful. Status: ${optionsResponse.status}`);
    console.log(`   Access-Control-Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`);
  } catch (error) {
    console.log(`❌ OPTIONS request failed. Error: ${error.message}`);
  }
  
  // Test 2: POST request with CORS headers
  console.log('\n📋 Test 2: POST Request with CORS Headers');
  try {
    const postResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://aurora-smart-meter.onrender.com'
      },
      body: JSON.stringify({
        url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/super-action',
        user_id: 'test-user',
        meter_number: 'test-meter',
        kwh_consumed: 10.5,
        timestamp: new Date().toISOString()
      }),
      timeout: 10000
    });
    
    console.log(`✅ POST request sent. Status: ${postResponse.status}`);
    
    // Try to parse the response
    try {
      const data = await postResponse.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } catch (parseError) {
      console.log(`   Response (non-JSON): Could not parse response`);
    }
  } catch (error) {
    console.log(`❌ POST request failed. Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`   🔧 Connection refused. The proxy server might not be running.`);
    } else if (error.message.includes('ENOTFOUND')) {
      console.log(`   🔧 Domain not found. Check if the proxy server URL is correct.`);
    } else if (error.message.includes('timeout')) {
      console.log(`   🔧 Request timed out. The server might be slow or unreachable.`);
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📝 If the requests failed, check:');
  console.log('1. Is your proxy server deployed and running?');
  console.log('2. Is the proxy server URL correct?');
  console.log('3. Does the proxy server have proper CORS configuration?');
  console.log('4. Are there any firewall or network restrictions?');
}

// Run the simulation
simulateBrowserRequest();