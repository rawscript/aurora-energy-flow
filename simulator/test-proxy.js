// Test script for the proxy server
const fetch = require('node-fetch');

async function testProxy() {
  const proxyUrl = process.argv[2] || 'http://localhost:3001';
  
  try {
    console.log(`Testing proxy server at ${proxyUrl}...`);
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${proxyUrl}/health`);
    const healthData = await healthResponse.json();
    
    console.log('✅ Health check passed:', healthData);
    
    // Test root endpoint
    console.log('\n2. Testing root endpoint...');
    const rootResponse = await fetch(`${proxyUrl}/`);
    const rootData = await rootResponse.json();
    
    console.log('✅ Root endpoint passed:', rootData);
    
    // Test proxy endpoint with GET request (should return helpful message)
    console.log('\n3. Testing proxy endpoint with GET request...');
    const getProxyResponse = await fetch(`${proxyUrl}/proxy/supabase-function`);
    const getProxyData = await getProxyResponse.json();
    
    console.log('✅ GET request to proxy endpoint:', getProxyData);
    
    // Test proxy endpoint with invalid POST request (should return 400)
    console.log('\n4. Testing proxy endpoint with invalid POST request...');
    const postProxyResponse = await fetch(`${proxyUrl}/proxy/supabase-function`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://invalid-url.com'
      })
    });
    
    const postProxyData = await postProxyResponse.json();
    
    if (postProxyResponse.status === 400) {
      console.log('✅ Proxy endpoint correctly rejected invalid URL:', postProxyData);
    } else {
      console.log('⚠️  Unexpected response from proxy endpoint:', postProxyResponse.status, postProxyData);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 To use the proxy server, make POST requests to /proxy/supabase-function with a JSON body containing:');
    console.log('   { url: "https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/your-function", ...otherData }');
  } catch (error) {
    console.error('❌ Error testing proxy server:', error.message);
    process.exit(1);
  }
}

testProxy();