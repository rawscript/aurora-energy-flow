// Simple connection test using built-in modules
const https = require('https');

function testConnection(url) {
  console.log(`🔍 Testing connection to: ${url}`);
  
  const req = https.get(url, (res) => {
    console.log(`✅ Server responded with status code: ${res.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    res.on('data', (chunk) => {
      try {
        const data = JSON.parse(chunk);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        console.log(`   Response (non-JSON): ${chunk}`);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log(`❌ Connection failed: ${error.message}`);
  });
  
  req.end();
}

// Test the proxy server
testConnection('https://aurora-smart-meter-proxy.onrender.com');