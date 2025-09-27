# Aurora Smart Meter Simulator Deployment Guide

This guide explains how to deploy the Aurora Smart Meter Simulator to Netlify and connect it to the Aurora system.

## Prerequisites

1. A Netlify account (free at [netlify.com](https://netlify.com))
2. The [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file from this repository
3. A deployed proxy server (see [PROXY_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/PROXY_DEPLOYMENT.md) for instructions)

## Deploying to Netlify

### Option 1: Drag and Drop Deployment (Easiest)

1. Visit [app.netlify.com](https://app.netlify.com)
2. Sign in to your Netlify account
3. Drag and drop the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file onto the deployment area
4. Netlify will automatically deploy your site and provide a public URL

### Option 2: GitHub Integration

1. Push the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file to a GitHub repository
2. Visit [app.netlify.com](https://app.netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select the repository containing [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html)
6. Configure the build settings:
   - Branch to deploy: `main` or `master`
   - Publish directory: (leave empty)
   - Build command: (leave empty)
7. Click "Deploy site"

## Configuring the Smart Meter Simulator

After deployment, you need to update the proxy server URL in the smart meter simulator:

1. Open the deployed smart meter simulator in a text editor or directly on Netlify
2. Find the `AURORA_CONFIG` section:
   ```javascript
   const AURORA_CONFIG = {
     supabaseUrl: 'https://rcthtxwzsqvwivritzln.supabase.co',
     supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdGh0eHd6c3F2d2l2cml0emxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NzM2MjAsImV4cCI6MjA2ODI0OTYyMH0._bSOH4oY3Ug1l-NY7OPnXQr4Mt5mD7WgugNKjlwWAkM',
     functionName: 'super-action',
     // Proxy server URL - replace with your deployed proxy server URL
     proxyUrl: 'https://your-proxy-server-url.com/proxy/supabase-function' // Change this to your deployed proxy URL
   };
   ```

3. Replace the `proxyUrl` value with your deployed proxy server URL:
   - For Render: `https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function`
   - For Heroku: `https://aurora-smart-meter-proxy.herokuapp.com/proxy/supabase-function`
   - For Vercel: `https://aurora-smart-meter-proxy.vercel.app/proxy/supabase-function`

4. Save and redeploy the updated file to Netlify

## Using the Smart Meter Simulator

1. Visit your deployed smart meter simulator URL
2. Enter your User ID and Meter Number
3. Click "Register" to register the meter
4. Select the registered meter from the dropdown
5. Click "Spin Meter" to generate a reading
6. The reading will be sent to Aurora through the proxy server

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure the proxy server is deployed and running
   - Verify the proxy URL in the smart meter simulator is correct
   - Check that the proxy server allows requests from your Netlify domain

2. **Connection Issues**
   - Make sure you're using the correct User ID and Meter Number
   - Check that the Aurora system is accessible
   - Verify internet connectivity

3. **Data Not Appearing in Aurora**
   - Check the proxy server logs for errors
   - Verify that the User ID and Meter Number are registered in Aurora
   - Ensure the smart meter simulator is sending data to the correct endpoint

### Checking Deployment Status

1. Visit your Netlify site URL to ensure the smart meter simulator is accessible
2. Check the browser console for any errors (F12 → Console)
3. Verify that the proxy server is running and accessible

## Updating the Deployment

To update the smart meter simulator:

1. Make changes to the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file
2. For drag and drop deployment: Repeat the drag and drop process
3. For GitHub integration: Commit and push changes to trigger automatic deployment