// Comprehensive test script to diagnose proxy server issues
const fetch = require('node-fetch');

async function comprehensiveProxyTest() {
  // Replace with your actual deployed proxy server URL
  const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com';
  const proxyEndpoint = `${proxyUrl}/proxy/supabase-function`;
  
  console.log(`🔍 Comprehensive Proxy Server Diagnostics`);
  console.log(`Proxy Server URL: ${proxyUrl}`);
  console.log(`Proxy Endpoint: ${proxyEndpoint}`);
  console.log('=' .repeat(60));
  
  // Test 1: Basic connectivity
  console.log('\n📋 Test 1: Basic Server Connectivity');
  try {
    const response = await fetch(proxyUrl, { 
      method: 'HEAD', 
      timeout: 10000 
    });
    console.log(`✅ Server reachable. Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`❌ Server unreachable. Error: ${error.message}`);
    if (error.message.includes('ENOTFOUND')) {
      console.log('   🔧 Possible causes:');
      console.log('   - Incorrect URL');
      console.log('   - Server not deployed');
      console.log('   - DNS resolution issues');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   🔧 Possible causes:');
      console.log('   - Server running but not accepting connections');
      console.log('   - Firewall blocking connections');
    } else if (error.message.includes('timeout')) {
      console.log('   🔧 Possible causes:');
      console.log('   - Server slow to respond');
      console.log('   - Network connectivity issues');
    }
    return;
  }
  
  // Test 2: Root endpoint
  console.log('\n📋 Test 2: Root Endpoint (/)');
  try {
    const response = await fetch(proxyUrl, { timeout: 10000 });
    const data = await response.json();
    console.log(`✅ Root endpoint accessible. Status: ${response.status}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Endpoints: ${Object.keys(data.endpoints).join(', ')}`);
  } catch (error) {
    console.log(`❌ Root endpoint failed. Error: ${error.message}`);
  }
  
  // Test 3: Health endpoint
  console.log('\n📋 Test 3: Health Endpoint (/health)');
  try {
    const response = await fetch(`${proxyUrl}/health`, { timeout: 10000 });
    const data = await response.json();
    console.log(`✅ Health endpoint accessible. Status: ${response.status}`);
    console.log(`   Server status: ${data.status}`);
    console.log(`   Uptime: ${data.uptime.toFixed(2)} seconds`);
  } catch (error) {
    console.log(`❌ Health endpoint failed. Error: ${error.message}`);
  }
  
  // Test 4: Proxy endpoint (GET request)
  console.log('\n📋 Test 4: Proxy Endpoint GET Request (/proxy/supabase-function)');
  try {
    const response = await fetch(proxyEndpoint, { timeout: 10000 });
    const data = await response.json();
    console.log(`✅ Proxy endpoint accessible. Status: ${response.status}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Usage: ${data.usage}`);
  } catch (error) {
    console.log(`❌ Proxy endpoint GET request failed. Error: ${error.message}`);
  }
  
  // Test 5: Proxy endpoint (POST request with invalid data)
  console.log('\n📋 Test 5: Proxy Endpoint POST Request (Invalid Data)');
  try {
    const response = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://invalid-url.com'
      }),
      timeout: 10000
    });
    
    const data = await response.json();
    console.log(`✅ Proxy endpoint POST request handled. Status: ${response.status}`);
    if (response.status === 400) {
      console.log(`   Correctly rejected invalid URL: ${data.error}`);
    } else {
      console.log(`   Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ Proxy endpoint POST request failed. Error: ${error.message}`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📝 Summary:');
  console.log('If all tests passed, your proxy server is working correctly.');
  console.log('If tests failed, check the error messages above for troubleshooting guidance.');
  
  console.log('\n🔧 Troubleshooting Tips:');
  console.log('1. Verify your proxy server is deployed and running');
  console.log('2. Check the proxy server logs for errors');
  console.log('3. Ensure the proxy URL in smart-meter.html is correct:');
  console.log(`   proxyUrl: '${proxyEndpoint}'`);
  console.log('4. Make sure your proxy server accepts requests from your smart meter domain');
  console.log('5. Check if there are any firewall or network restrictions');
}

// Run the comprehensive test
comprehensiveProxyTest();