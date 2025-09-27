// Test script to check proxy server connectivity
const fetch = require('node-fetch');

async function testProxyConnectivity() {
  // Replace with your actual deployed proxy server URL
  const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com';
  
  console.log(`🔍 Testing connectivity to proxy server: ${proxyUrl}`);
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if the server is reachable
    console.log('\n📋 Test 1: Checking server reachability...');
    const response = await fetch(proxyUrl, { method: 'HEAD', timeout: 5000 });
    console.log(`✅ Server is reachable. Status: ${response.status}`);
    
    // Test 2: Check root endpoint
    console.log('\n📋 Test 2: Checking root endpoint...');
    const rootResponse = await fetch(proxyUrl);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint accessible:', rootData.message);
    
    // Test 3: Check health endpoint
    console.log('\n📋 Test 3: Checking health endpoint...');
    const healthResponse = await fetch(`${proxyUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint accessible:', healthData.status);
    
    // Test 4: Check proxy endpoint (GET request)
    console.log('\n📋 Test 4: Checking proxy endpoint (GET request)...');
    const proxyGetResponse = await fetch(`${proxyUrl}/proxy/supabase-function`);
    const proxyGetData = await proxyGetResponse.json();
    console.log('✅ Proxy endpoint accessible:', proxyGetData.message);
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All connectivity tests passed!');
    console.log('✅ Your proxy server is running and accessible.');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure your smart-meter.html proxyUrl is set correctly:');
    console.log(`   proxyUrl: '${proxyUrl}/proxy/supabase-function'`);
    console.log('2. Test the smart meter simulator by registering a meter and spinning it');
    
  } catch (error) {
    console.log('\n' + '=' .repeat(50));
    console.log('❌ Connectivity test failed!');
    console.log(`❌ Error: ${error.message}`);
    
    console.log('\n🔍 Troubleshooting steps:');
    console.log('1. Check if your proxy server is deployed and running');
    console.log('2. Verify the proxy server URL is correct');
    console.log('3. Check the proxy server logs for any errors');
    console.log('4. Make sure the proxy server is not blocked by a firewall');
    console.log('5. Verify that the proxy server domain is accessible from the internet');
    
    // Additional diagnostics
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  The proxy server domain could not be found.');
      console.log('   Make sure you\'re using the correct URL and that the server is deployed.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  Connection was refused.');
      console.log('   The server might be running but not accepting connections on the expected port.');
    } else if (error.message.includes('timeout')) {
      console.log('\n⚠️  Connection timed out.');
      console.log('   The server might be slow to respond or not accessible from your network.');
    }
  }
}

// Run the test
testProxyConnectivity();