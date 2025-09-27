// Test Supabase function directly
// Run with: node test-supabase-function.js

async function testSupabaseFunction() {
  try {
    console.log('Testing Supabase smart-meter-webhook function directly...');
    
    const response = await fetch('https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM'
      },
      body: JSON.stringify({
        meter_number: 'TEST123',
        kwh_consumed: 12.5,
        user_id: '00000000-0000-0000-0000-000000000000',
        cost_per_kwh: 25.0
      })
    });
    
    console.log('Status:', response.status);
    
    const text = await response.text();
    console.log('Response (text):', text);
    
    try {
      const data = JSON.parse(text);
      console.log('Response (JSON):', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSupabaseFunction();