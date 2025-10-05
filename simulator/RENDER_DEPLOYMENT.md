# Deploying the Aurora Smart Meter Proxy Server to Render

This guide explains how to deploy the proxy server to Render to resolve CORS issues when connecting the smart meter simulator to Aurora's system.

## Prerequisites

1. A Render account (https://render.com)
2. The proxy server code (this directory)

## Deployment Steps

### 1. Create a New Web Service on Render

1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository or upload the proxy server files directly

### 2. Configure the Service

Set the following configuration:

- **Name**: `aurora-smart-meter-proxy`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free` (or choose based on your needs)
- **Branch**: `main` (or your preferred branch)

### 3. Add Environment Variables

In the "Environment Variables" section, add:

```
PORT=3001
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY3MzYyMCwiZXhwIjoyMDY4MjQ5NjIwfQ.kN57N2Jt4A2Y3y5x8b5b5b5b5b5b5b5b5b5b5b5b5b5
```

### 4. Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your proxy server
3. Note the URL provided by Render (e.g., `https://aurora-smart-meter-proxy.onrender.com`)

## Updating the Smart Meter Simulator

After deploying the proxy server, update the smart meter simulator to use your deployed proxy URL:

1. Open `smart-meter.html` in a text editor
2. Find the `AURORA_CONFIG` section
3. Ensure the `proxyUrl` is set to your Render URL:
   ```javascript
   const AURORA_CONFIG = {
     // ... other config
     proxyUrl: 'https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function'
   };
   ```

## Testing the Connection

1. Deploy the updated `smart-meter.html` to Netlify
2. Visit your deployed smart meter simulator URL
3. Enter a valid User ID and Meter Number
4. Click "Register"
5. Select the registered meter
6. Click "Spin Meter"
7. Check that the data is sent successfully without CORS errors

## Troubleshooting

### Common Issues

1. **CORS Errors Persist**
   - Ensure the proxy server is running
   - Verify the proxy URL in `smart-meter.html` is correct
   - Check that the proxy server allows requests from your Netlify domain

2. **Proxy Server Not Responding**
   - Check the proxy server logs for errors in the Render dashboard
   - Ensure the proxy server is properly configured to accept requests
   - Verify that the proxy server is deployed correctly

3. **Network Errors**
   - Ensure both the smart meter simulator and proxy server are deployed correctly
   - Check that the URLs are accessible from a web browser
   - Verify internet connectivity

### Logs and Monitoring

- Check your Render dashboard for proxy server logs
- Monitor the smart meter simulator console for network errors
- Use browser developer tools to inspect network requests

## Security Considerations

- The proxy server is designed to only forward requests to Supabase functions
- Ensure your proxy server is only accessible over HTTPS
- Regularly monitor the proxy server for unauthorized usage
- Consider adding rate limiting to prevent abuse

## Updating the Proxy Server

To update the proxy server after making changes:

1. Commit your changes to the repository
2. Push to the connected repository to trigger automatic deployment on Render
3. For manual deployments: Redeploy using Render's deployment process