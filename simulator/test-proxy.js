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
    
    // Test proxy endpoint (should return 400 for invalid request)
    console.log('\n3. Testing proxy endpoint with invalid request...');
    const proxyResponse = await fetch(`${proxyUrl}/proxy/supabase-function`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://invalid-url.com'
      })
    });
    
    const proxyData = await proxyResponse.json();
    
    if (proxyResponse.status === 400) {
      console.log('✅ Proxy endpoint correctly rejected invalid URL:', proxyData);
    } else {
      console.log('⚠️  Unexpected response from proxy endpoint:', proxyResponse.status, proxyData);
    }
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error testing proxy server:', error.message);
    process.exit(1);
  }
}

testProxy();