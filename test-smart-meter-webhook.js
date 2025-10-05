import fetch from 'node-fetch';

async function testSmartMeterWebhook() {
  try {
    console.log('Testing smart meter webhook function...');
    
    // Test data
    const testData = {
      url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook',
      meter_number: 'TEST123456',
      kwh_consumed: 10.5,
      user_id: '00000000-0000-0000-0000-000000000000', // Invalid user ID for testing
      cost_per_kwh: 25.0
    };
    
    console.log('Sending test data:', JSON.stringify(testData, null, 2));
    
    // Send request directly to the function (bypassing proxy for now)
    const response = await fetch(testData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('Could not parse response as JSON');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSmartMeterWebhook();