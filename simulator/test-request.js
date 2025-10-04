const fetch = require('node-fetch');

async function testProxy() {
  try {
    const response = await fetch('http://localhost:3001/proxy/supabase-function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook',
        meter_number: 'KP-12345',
        kwh_consumed: 10.5,
        user_id: 'test-user-id',
        cost_per_kwh: 25.0
      })
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testProxy();