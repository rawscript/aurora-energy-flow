// Test script to diagnose proxy server and smart-meter-webhook issues
// Run with: node diagnose-proxy-issues.js

async function diagnoseProxyIssues() {
  console.log('🔍 Diagnosing proxy server and smart-meter-webhook issues...\n');
  
  try {
    console.log('1. Testing proxy server health...');
    
    // Test proxy server health endpoint
    const healthResponse = await fetch('https://aurora-smart-meter-proxy.onrender.com/health');
    const healthData = await healthResponse.json();
    
    console.log('   Proxy server status:', healthResponse.status);
    console.log('   Proxy server health:', JSON.stringify(healthData, null, 2));
    
    console.log('\n2. Testing proxy server endpoint...');
    
    // Test the proxy endpoint with sample data
    const proxyResponse = await fetch('https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function', {
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
    
    console.log('   Proxy endpoint status:', proxyResponse.status);
    
    // Try to read the response
    try {
      const proxyData = await proxyResponse.json();
      console.log('   Proxy response:', JSON.stringify(proxyData, null, 2));
    } catch (parseError) {
      const textResponse = await proxyResponse.text();
      console.log('   Proxy response (text):', textResponse);
    }
    
    console.log('\n3. Testing smart-meter-webhook directly...');
    
    // Test the smart-meter-webhook function directly
    const webhookResponse = await fetch('https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/smart-meter-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM'
      },
      body: JSON.stringify({
        meter_number: 'TEST123',
        kwh_consumed: 12.5,
        user_id: '00000000-0000-0000-0000-000000000000',
        cost_per_kwh: 25.0
      })
    });
    
    console.log('   Webhook status:', webhookResponse.status);
    
    // Try to read the response
    try {
      const webhookData = await webhookResponse.json();
      console.log('   Webhook response:', JSON.stringify(webhookData, null, 2));
    } catch (parseError) {
      const textResponse = await webhookResponse.text();
      console.log('   Webhook response (text):', textResponse);
    }
    
    console.log('\n✅ Diagnosis completed');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

// Run the diagnosis
diagnoseProxyIssues();