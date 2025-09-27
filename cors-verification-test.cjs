// Test script to verify CORS headers are properly set
const https = require('https');

console.log('🔍 Testing CORS headers with updated proxy server configuration...\n');

// Test 1: Preflight OPTIONS request
function testPreflightRequest() {
  return new Promise((resolve, reject) => {
    const options = {
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

    console.log('Test 1: Preflight OPTIONS request');
    console.log('Sending from origin: https://smart-simulator.netlify.app');

    const req = https.request(options, (res) => {
      console.log(`✅ Status Code: ${res.statusCode}`);
      
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ];
      
      console.log('📋 CORS Headers:');
      corsHeaders.forEach(header => {
        const value = res.headers[header];
        if (value) {
          console.log(`   ${header}: ${value}`);
        } else {
          console.log(`   ${header}: ❌ MISSING`);
        }
      });
      
      res.on('data', () => {}); // Consume response data
      res.on('end', () => resolve());
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test 2: Actual POST request
function testPostRequest() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/super-action',
      user_id: 'cors-test-user',
      meter_number: 'cors-test-meter',
      kwh_consumed: 15.75,
      timestamp: new Date().toISOString()
    });

    const options = {
      hostname: 'aurora-smart-meter-proxy.onrender.com',
      port: 443,
      path: '/proxy/supabase-function',
      method: 'POST',
      headers: {
        'Origin': 'https://smart-simulator.netlify.app',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    console.log('\nTest 2: Actual POST request');
    console.log('Sending from origin: https://smart-simulator.netlify.app');

    const req = https.request(options, (res) => {
      console.log(`✅ Status Code: ${res.statusCode}`);
      
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-credentials'
      ];
      
      console.log('📋 CORS Headers:');
      corsHeaders.forEach(header => {
        const value = res.headers[header];
        if (value) {
          console.log(`   ${header}: ${value}`);
        } else {
          console.log(`   ${header}: ❌ MISSING`);
        }
      });
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📄 Response:', JSON.stringify(response, null, 2));
          resolve();
        } catch (error) {
          console.log('📄 Response (raw):', data);
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testPreflightRequest();
    await testPostRequest();
    console.log('\n✅ All CORS tests completed');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();