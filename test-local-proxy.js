// Test local proxy server
// Run with: node test-local-proxy.js

async function testLocalProxy() {
  try {
    console.log('Testing local proxy server...');
    
    const response = await fetch('http://localhost:3001/proxy/supabase-function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meter_number: 'TEST123',
        kwh_consumed: 12.5,
        user_id: '00000000-0000-0000-0000-000000000000',
        cost_per_kwh: 25.0
      })
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLocalProxy();