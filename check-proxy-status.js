// Simple script to check if the proxy server is running
const https = require('https');

function checkProxyStatus(url) {
  console.log(`🔍 Checking proxy server status: ${url}`);
  
  const options = {
    method: 'GET',
    timeout: 10000
  };
  
  const req = https.request(url, options, (res) => {
    console.log(`✅ Server is running!`);
    console.log(`   Status Code: ${res.statusCode}`);
    console.log(`   Status Message: ${res.statusMessage}`);
    
    // Collect headers
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
    console.log(`❌ Server is not accessible!`);
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log(`   🔧 The domain could not be found. Check if the proxy server is deployed.`);
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log(`   🔧 Connection refused. The server might not be running.`);
    } else if (error.message.includes('timeout')) {
      console.log(`   🔧 Request timed out. The server might be slow or unreachable.`);
    } else if (error.message.includes('certificate')) {
      console.log(`   🔧 SSL certificate issue. There might be a problem with the server's certificate.`);
    }
  });
  
  req.on('timeout', () => {
    console.log(`❌ Request timed out after 10 seconds`);
    req.destroy();
  });
  
  req.end();
}

// Check the proxy server status
const proxyUrl = 'https://aurora-smart-meter-proxy.onrender.com';
checkProxyStatus(proxyUrl);