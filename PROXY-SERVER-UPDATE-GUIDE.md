# Proxy Server Update Guide

## Steps to Update Your Proxy Server on Render

1. **Commit and push your changes**:
   ```bash
   git add proxy-deployment/proxy-server.js
   git commit -m "Fix CORS configuration for Netlify domains"
   git push origin main
   ```

2. **Trigger a new deployment on Render**:
   - Go to your Render dashboard
   - Find your "aurora-smart-meter-proxy" service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for the deployment to complete (usually 2-3 minutes)

3. **Verify the deployment**:
   After deployment, test the CORS headers with this command:
   ```bash
   curl -H "Origin: https://smart-simulator.netlify.app" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: content-type" \
        -X OPTIONS \
        https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function \
        -v
   ```

   You should see headers like:
   ```
   access-control-allow-origin: https://smart-simulator.netlify.app
   access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
   access-control-allow-headers: content-type
   ```

## What Was Fixed

The previous CORS configuration had issues with wildcard domain matching. The updated configuration:

1. Uses a custom origin verification function that properly handles:
   - Exact domain matches
   - Wildcard patterns for Netlify domains
   - Requests without an origin header (like curl or mobile apps)

2. Explicitly allows your domain:
   - `https://smart-simulator.netlify.app` (your specific Netlify deployment)

3. Provides better debugging by logging blocked origins

## Testing After Deployment

After the deployment completes, test the connection from your smart meter simulator:

1. Open https://smart-simulator.netlify.app in your browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Try to send a reading from the smart meter
5. Check that there are no CORS errors in the console

If you still see CORS errors, please share the exact error message from the browser console.