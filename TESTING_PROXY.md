# Testing the Proxy Server

This document explains how to test your deployed proxy server to ensure it's working correctly.

## Prerequisites

1. Node.js installed on your local machine
2. Your proxy server deployed and running (e.g., on Render)

## Testing Steps

1. **Update the test script**:
   Open [test-proxy-endpoint.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/test-proxy-endpoint.js) and replace the URL with your actual deployed proxy server URL:
   ```javascript
   const proxyServerUrl = 'https://your-actual-proxy-server.onrender.com'; // Replace with your actual URL
   ```

2. **Run the test script**:
   ```bash
   node test-proxy-endpoint.js
   ```

3. **Expected Output**:
   You should see responses from all endpoints:
   - Root endpoint (`/`) - General information about the proxy server
   - Health endpoint (`/health`) - Server status information
   - Proxy endpoint (`/proxy/supabase-function`) with GET request - Helpful usage information

4. **Update your smart meter simulator**:
   Once you've confirmed the proxy server is working, update the [proxyUrl](file://e:\Main\Projects\internal\Aurora\aurora-energy-flow\simulator\test-proxy.js#L4-L4) in your smart-meter.html file:
   ```javascript
   const AURORA_CONFIG = {
     // ... other config
     proxyUrl: 'https://your-proxy-server.onrender.com/proxy/supabase-function'
   };
   ```

## Troubleshooting

If you're getting errors:

1. **"Cannot GET /proxy/supabase-function"**:
   - This is expected when accessing the endpoint via a browser (GET request)
   - The proxy endpoint only accepts POST requests from the smart meter simulator
   - Use the test script to verify the endpoint is working

2. **"ENOTFOUND" or "ECONNREFUSED"**:
   - Check that your proxy server is deployed and running
   - Verify the URL is correct
   - Check the deployment logs for any errors

3. **404 errors**:
   - Make sure you're using the correct endpoint path: `/proxy/supabase-function`
   - Check that your deployment includes all necessary files

## Using the Proxy Server

The proxy server works by accepting POST requests to `/proxy/supabase-function` with a JSON body that includes:
```json
{
  "url": "https://your-supabase-project.supabase.co/functions/v1/your-function",
  "user_id": "user123",
  "meter_number": "meter456",
  "kwh_consumed": 10.5,
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

The proxy server will then forward this request to the Supabase function and return the response.