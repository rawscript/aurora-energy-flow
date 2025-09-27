# Smart Meter Simulator Troubleshooting Guide

This guide helps you diagnose and fix issues with the Aurora Smart Meter Simulator.

## Common Error: "Network Error: Unable to send data to proxy server"

This error occurs when the smart meter simulator cannot connect to the proxy server. Let's troubleshoot step by step.

## Step 1: Verify Deployments

### Check Proxy Server Status
1. Visit your proxy server URL in a browser:
   `https://aurora-smart-meter-proxy.onrender.com`
2. You should see a JSON response with server information
3. If you get an error, check your Render dashboard for issues

### Check Smart Meter Simulator Status
1. Visit your smart meter simulator URL in a browser:
   `https://aurora-smart-meter.onrender.com`
2. You should see the smart meter interface
3. If you get an error, check your Render dashboard for issues

## Step 2: Test Connectivity

### Test with curl (command line)
```bash
# Test proxy server root endpoint
curl https://aurora-smart-meter-proxy.onrender.com

# Test proxy server health endpoint
curl https://aurora-smart-meter-proxy.onrender.com/health

# Test proxy server proxy endpoint (GET)
curl https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function
```

### Test with browser
1. Open the [full-browser-test.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/full-browser-test.html) file in your browser
2. Click "Run Full Test"
3. Check the results for any errors

## Step 3: Check Configuration

### Verify Proxy URL in Smart Meter
1. Open your deployed smart meter simulator in a browser
2. Right-click and select "View Page Source" or "Inspect"
3. Search for "AURORA_CONFIG"
4. Verify the proxyUrl is set correctly:
   ```javascript
   proxyUrl: 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function'
   ```

### Check CORS Configuration
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

## Step 4: Common Solutions

### Solution 1: Clear Browser Cache
1. Open your browser's developer tools (F12)
2. Right-click the refresh button and select "Empty Cache and Hard Reload"
3. Or press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Solution 2: Check Browser Console
1. Open your browser's developer tools (F12)
2. Go to the "Console" tab
3. Look for any error messages when you click "Spin Meter"
4. Common errors:
   - CORS errors (blocked by browser)
   - Network errors (server unreachable)
   - JavaScript errors (code issues)

### Solution 3: Check Network Tab
1. Open your browser's developer tools (F12)
2. Go to the "Network" tab
3. Click "Spin Meter" in the smart meter simulator
4. Look for the request to the proxy server
5. Check the request and response details

### Solution 4: Restart Services
1. In Render, go to your proxy server service
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Do the same for your smart meter simulator if it's deployed on Render

## Step 5: Advanced Troubleshooting

### Check Render Logs
1. In Render, go to your proxy server service → Logs
2. Look for any error messages
3. Common log messages:
   - "Proxy server running on port XXXX" (success)
   - "Error: Cannot find module" (missing dependency)
   - "Error: listen EACCES" (port permission issue)

### Test CORS Headers
Use the browser's developer tools to check if the correct CORS headers are being sent:
1. Open the Network tab in developer tools
2. Make a request to the proxy server
3. Check the response headers for:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Methods`
   - `Access-Control-Allow-Headers`

### Test with Different Browsers
1. Try opening the smart meter simulator in a different browser
2. Try using an incognito/private window
3. Check if the issue persists across different browsers

## Step 6: Contact Support

If none of the above solutions work:

1. **Capture error details**:
   - Screenshot of the error in the smart meter simulator
   - Screenshot of browser console errors
   - Screenshot of network request details
   - Screenshot of Render logs

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

4. **Browser Extensions**:
   Try disabling browser extensions that might interfere with network requests

5. **Network Connectivity**:
   Check if there are any network issues or firewalls blocking the requests