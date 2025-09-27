const https = require('https');

// Test the proxy endpoint that smart meter will use
const postData = JSON.stringify({
  url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/super-action',
  // Sample data that would be sent from smart meter
  user_id: 'test-user-123',
  consumption: 45.5,
  timestamp: new Date().toISOString()
});

const options = {
  hostname: 'aurora-smart-meter-proxy.onrender.com',
  port: 443,
  path: '/proxy/supabase-function',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔍 Testing proxy endpoint with sample data...');
console.log('📡 Sending to: https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function');

const req = https.request(options, (res) => {
  let data = '';

  console.log(`\n✅ Server responded with status code: ${res.statusCode}`);
  console.log('\n📋 Response Headers:', JSON.stringify(res.headers, null, 2));

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n📄 Response Body:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('\n📄 Response Body (raw):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Error:', error.message);
  if (error.code) console.error('   Error Code:', error.code);
});

req.write(postData);
req.end();