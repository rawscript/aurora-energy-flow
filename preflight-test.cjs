const https = require('https');

// Test preflight OPTIONS request (what browsers send before POST)
const optionsRequestOptions = {
  hostname: 'aurora-smart-meter-proxy.onrender.com',
  port: 443,
  path: '/proxy/supabase-function',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://smart-simulator.netlify.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

console.log('🔍 Testing preflight OPTIONS request (CORS check)...');
console.log('📡 Sending to: https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function');

const req = https.request(optionsRequestOptions, (res) => {
  console.log(`\n✅ Preflight request responded with status code: ${res.statusCode}`);
  console.log('\n📋 Response Headers:');
  
  for (const [key, value] of Object.entries(res.headers)) {
    console.log(`   ${key}: ${value}`);
  }
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (data) {
      console.log('\n📄 Response Body:', data);
    }
    console.log('\n✅ Preflight test completed');
  });
});

req.on('error', (error) => {
  console.error('\n❌ Preflight Request Error:', error.message);
  if (error.code) console.error('   Error Code:', error.code);
});

req.end();