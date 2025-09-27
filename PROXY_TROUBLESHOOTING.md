# Proxy Server Troubleshooting Guide

This guide helps you diagnose and fix issues with the Aurora Smart Meter Proxy Server.

## Common Error: "Network Error: Unable to send data to proxy server"

This error occurs when the smart meter simulator cannot connect to the proxy server. Let's troubleshoot step by step.

## Step 1: Verify Proxy Server Deployment

1. **Check if the proxy server is deployed**:
   - Log in to your Render account
   - Navigate to your proxy server service
   - Verify that the service is "Live" and not in an error state

2. **Check the deployment logs**:
   - In Render, go to your service → Logs
   - Look for any error messages during deployment or runtime
   - Common issues:
     - Missing dependencies in package.json
     - Port configuration issues
     - Environment variable problems

## Step 2: Test Proxy Server Connectivity

Run the provided test scripts to check connectivity:

```bash
# Test basic connectivity
node check-proxy-status.js

# Run comprehensive diagnostics
node comprehensive-proxy-test.js

# Simulate browser requests
node simulate-browser-request.js
```

## Step 3: Check Proxy Server Configuration

1. **Verify CORS configuration**:
   The proxy server should allow requests from your smart meter domain:
   ```javascript
   const corsOptions = {
     origin: [
       'https://aurora-smart-meter.onrender.com',
       'https://*.netlify.app',
       'https://*.vercel.app',
       'https://*.herokuapp.com',
       'http://localhost:3000',
       'http://localhost:3001',
       'http://127.0.0.1:3000',
       'http://127.0.0.1:3001'
     ],
     credentials: true,
     optionsSuccessStatus: 200
   };
   ```

2. **Verify the PORT configuration**:
   The proxy server should listen on the PORT environment variable:
   ```javascript
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => {
     console.log(`Proxy server running on port ${PORT}`);
   });
   ```

## Step 4: Check Smart Meter Configuration

1. **Verify the proxy URL in smart-meter.html**:
   ```javascript
   const AURORA_CONFIG = {
     // ... other config
     proxyUrl: 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function'
   };
   ```

2. **Check that the URL is accessible**:
   - Open the URL in a browser: `https://aurora-smart-meter-proxy.onrender.com/`
   - You should see a JSON response with server information

## Step 5: Common Solutions

### Solution 1: Restart the Proxy Server
1. In Render, go to your proxy server service
2. Click "Manual Deploy" → "Clear build cache & deploy"

### Solution 2: Check Environment Variables
1. In Render, go to your service → Environment
2. Verify that any required environment variables are set
3. Common variables:
   - PORT (should be set by Render automatically)
   - SUPABASE_KEY (if using custom key)

### Solution 3: Verify Dependencies
1. Check that your [package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/package.json) includes all required dependencies:
   ```json
   {
     "dependencies": {
       "express": "^4.18.2",
       "cors": "^2.8.5",
       "node-fetch": "^2.6.7",
       "dotenv": "^16.0.3"
     }
   }
   ```

### Solution 4: Check for Errors in Proxy Server Code
1. Review [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/proxy-server.js) for any syntax errors
2. Make sure all required modules are imported:
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const fetch = require('node-fetch');
   require('dotenv').config();
   ```

## Step 6: Advanced Troubleshooting

### Check Render Logs
1. In Render, go to your service → Logs
2. Look for any error messages
3. Common log messages:
   - "Proxy server running on port XXXX" (success)
   - "Error: Cannot find module" (missing dependency)
   - "Error: listen EACCES" (port permission issue)

### Test Locally
1. Run the proxy server locally:
   ```bash
   cd proxy-deployment
   npm install
   npm start
   ```
2. Test with:
   ```bash
   curl http://localhost:3001/
   ```

## Step 7: Contact Support

If none of the above solutions work:

1. **Capture error details**:
   - Screenshot of the error in the smart meter simulator
   - Screenshot of Render logs
   - Output of the test scripts

2. **Check Render Status**:
   Visit https://status.render.com/ to see if there are any ongoing issues

3. **Contact Render Support**:
   If the issue seems to be with Render, contact their support team

## Additional Tips

1. **Cold Start Delays**:
   Free Render instances may take a few seconds to start up after being idle

2. **Rate Limiting**:
   Free services may have rate limits that could affect connectivity

3. **Domain Configuration**:
   Make sure you're using the correct domain provided by Render (not a custom domain if not configured)

4. **Browser Cache**:
   Try clearing your browser cache or using an incognito window