# Aurora Smart Meter Data Flow Analysis & Solution

## Issue Identified

Based on our investigation, there are several potential issues causing the data flow problems between your smart meter simulator and the Aurora dashboard:

## 1. Data Structure Mismatch

### Smart Meter Simulator Sends:
```javascript
{
  url: 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/super-action',
  user_id: originalUserId,
  meter_number: meter,
  kwh_consumed: parseFloat(kwh),
  timestamp: new Date().toISOString()
}
```

### Expected by smart-meter-webhook:
```javascript
{
  meter_number: 'TEST123',
  kwh_consumed: 12.34,
  user_id: 'user-id',
  cost_per_kwh: 25.0  // Optional, defaults to 25.0
}
```

## 2. Function Name Mismatch

The smart meter simulator is calling `super-action` function, but Aurora expects `smart-meter-webhook`.

## 3. Webhook Signature Verification

The `smart-meter-webhook` function requires a signature verification that might be failing.

## Solutions

### Solution 1: Update Smart Meter Simulator Configuration

Update the Aurora configuration in [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html):

```javascript
// Aurora configuration - UPDATE THIS SECTION
const AURORA_CONFIG = {
  supabaseUrl: 'https://rcthtxwzsqvwivritzln.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM',
  functionName: 'smart-meter-webhook', // Changed from 'super-action'
  // Proxy server URL - replace with your deployed proxy server URL
  proxyUrl: 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function'
};
```

And update the payload in the spin function:

```javascript
// In the spin() function, update the payload:
const payload = {
  meter_number: meter,
  kwh_consumed: parseFloat(kwh),
  user_id: originalUserId,
  cost_per_kwh: 25.0 // Add this field
  // Remove the 'url' field - it's handled by the proxy
};
```

### Solution 2: Update Proxy Server to Handle Webhook Signature

If you want to keep using signature verification, update the proxy server to generate a proper signature. Otherwise, you can disable signature verification for development by modifying the [smart-meter-webhook/index.ts](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/supabase/functions/smart-meter-webhook/index.ts) file:

```javascript
// In smart-meter-webhook/index.ts, comment out or modify signature verification:
if (req.method === 'POST') {
  // Comment out signature verification for testing
  /*
  const signature = req.headers.get('x-signature')
  const body = await req.text()

  if (!signature) {
    return new Response(JSON.stringify({
      error: 'Missing signature',
      message: 'Webhook signature is required'
    }), {
      status: 401,
      headers: corsHeaders
    })
  }

  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({
      error: 'Invalid signature',
      message: 'Webhook signature verification failed'
    }), {
      status: 401,
      headers: corsHeaders
    })
  }
  */
  
  // Just parse the body directly
  const body = await req.text()
  const payload = JSON.parse(body)
  // ... rest of the function
}
```

### Solution 3: Direct Database Insert (Alternative Approach)

Instead of using the webhook function, you could modify the smart meter simulator to directly call the `insert_energy_reading_improved` RPC function:

```javascript
// In the spin() function, replace the fetch call with:
try {
  // Send data directly to Supabase RPC function
  const response = await fetch(`${AURORA_CONFIG.supabaseUrl}/rest/v1/rpc/insert_energy_reading_improved`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': AURORA_CONFIG.supabaseKey,
      'Authorization': `Bearer ${AURORA_CONFIG.supabaseKey}`
    },
    body: JSON.stringify({
      p_user_id: originalUserId,
      p_meter_number: meter,
      p_kwh_consumed: parseFloat(kwh),
      p_cost_per_kwh: 25.0
    })
  });
  
  // ... rest of the error handling
}
```

## Verification Steps

1. **Update the smart meter simulator** with the corrected configuration
2. **Redeploy the updated simulator** to Netlify
3. **Test sending a reading** from the simulator
4. **Check the Supabase dashboard** to see if data appears in the energy_readings table
5. **Refresh the Aurora dashboard** to see if the data appears

## Debugging Tips

1. **Check browser console** for any errors when sending data
2. **Check Supabase function logs** for errors in the smart-meter-webhook function
3. **Verify user profiles** have the correct meter numbers registered
4. **Check that the energy_readings table** exists with the correct structure

## If Issues Persist

1. **Run the diagnose-data-flow.js script** to check function availability
2. **Verify all Supabase functions are deployed** using the deployment scripts
3. **Check Supabase table structure** matches the expected schema
4. **Ensure user profiles have meters registered** that match the simulator