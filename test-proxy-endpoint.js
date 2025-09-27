// Simple script to test the proxy server endpoint
const fetch = require('node-fetch');

async function testProxyEndpoint() {
  const proxyServerUrl = 'https://aurora-smart-meter-proxy.onrender.com'; // Replace with your actual URL
  
  console.log(`Testing proxy server at: ${proxyServerUrl}`);
  
  try {
    // Test the root endpoint
    console.log('\n1. Testing root endpoint (/)');
    const rootResponse = await fetch(`${proxyServerUrl}/`);
    const rootData = await rootResponse.json();
    console.log('Root endpoint response:', JSON.stringify(rootData, null, 2));
    
    // Test the health endpoint
    console.log('\n2. Testing health endpoint (/health)');
    const healthResponse = await fetch(`${proxyServerUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('Health endpoint response:', JSON.stringify(healthData, null, 2));
    
    // Test the proxy endpoint with GET request
    console.log('\n3. Testing proxy endpoint with GET request (/proxy/supabase-function)');
    const proxyGetResponse = await fetch(`${proxyServerUrl}/proxy/supabase-function`);
    const proxyGetData = await proxyGetResponse.json();
    console.log('Proxy GET response:', JSON.stringify(proxyGetData, null, 2));
    
    console.log('\n✅ All endpoint tests completed successfully!');
    console.log('\n📝 To use the proxy server in your smart meter simulator, set the proxyUrl to:');
    console.log(`   ${proxyServerUrl}/proxy/supabase-function`);
    
  } catch (error) {
    console.error('❌ Error testing proxy server:', error.message);
    console.error('Make sure your proxy server is deployed and running.');
  }
}

// Run the test
testProxyEndpoint();