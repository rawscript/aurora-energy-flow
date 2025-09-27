// Simple script to check if the proxy server is running
const fetch = require('node-fetch');

async function checkProxy() {
  const proxyUrl = process.argv[2] || 'http://localhost:3001';
  
  try {
    console.log(`Checking proxy server at ${proxyUrl}...`);
    
    // Check health endpoint
    const healthResponse = await fetch(`${proxyUrl}/health`);
    const healthData = await healthResponse.json();
    
    console.log('✅ Health check:', healthData);
    
    // Check root endpoint
    const rootResponse = await fetch(`${proxyUrl}/`);
    const rootData = await rootResponse.json();
    
    console.log('✅ Root endpoint:', rootData);
    
    console.log('✅ Proxy server is running correctly!');
  } catch (error) {
    console.error('❌ Error checking proxy server:', error.message);
    process.exit(1);
  }
}

checkProxy();