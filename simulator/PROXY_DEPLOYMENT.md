# Aurora Smart Meter Proxy Server Deployment Guide

This guide explains how to deploy the proxy server to resolve CORS issues when connecting the smart meter simulator to Aurora's system.

## Overview

The smart meter simulator needs to communicate with Supabase functions, but browsers block cross-origin requests by default (CORS policy). To resolve this, we use a proxy server that acts as an intermediary between the smart meter and Supabase.

## Deployment Options

### Option 1: Deploy to Render (Recommended)

1. **Create a Render Account**
   - Go to [render.com](https://render.com) and sign up for a free account

2. **Create a New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository containing the proxy server code
   - Or manually upload the proxy server files

3. **Configure the Service**
   - Name: `aurora-smart-meter-proxy`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`

4. **Add Environment Variables**
   - No environment variables are required for basic setup

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your proxy server
   - Note the URL provided by Render (e.g., `https://aurora-smart-meter-proxy.onrender.com`)

### Option 2: Deploy to Heroku

1. **Create a Heroku Account**
   - Go to [heroku.com](https://heroku.com) and sign up for a free account

2. **Install Heroku CLI**
   - Download and install the Heroku CLI from [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

3. **Prepare the Proxy Server Code**
   - Ensure your proxy server files are in a separate directory
   - Make sure you have the [package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/package.json) and [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-server.js) files

4. **Deploy Using Heroku CLI**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create a new app
   heroku create aurora-smart-meter-proxy
   
   # Deploy the code
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a aurora-smart-meter-proxy
   git push heroku master
   ```

### Option 3: Deploy to Vercel

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com) and sign up

2. **Deploy**
   - Click "New Project"
   - Import the proxy server repository or upload files
   - Configure the build settings:
     - Build Command: `npm install`
     - Output Directory: (leave empty)
     - Install Command: (leave empty)

## Configuring the Smart Meter Simulator

After deploying the proxy server, you need to update the smart meter simulator to use your deployed proxy URL:

1. Open [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) in a text editor

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

4. Save the file

## Deploying the Smart Meter Simulator to Netlify

1. **Create a Netlify Account**
   - Go to [netlify.com](https://netlify.com) and sign up for a free account

2. **Deploy the Smart Meter Simulator**
   - Click "New site from Git" or "Import an existing project"
   - Connect to your GitHub repository or upload the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file directly
   - Configure the build settings:
     - Publish directory: (leave empty for direct HTML file)
     - Build command: (leave empty for direct HTML file)

3. **Alternative: Manual Deployment**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Drag and drop the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) file to the deployment area
   - Netlify will generate a public URL for your smart meter simulator

## Testing the Connection

1. Visit your deployed smart meter simulator URL
2. Enter a valid User ID and Meter Number
3. Click "Register"
4. Select the registered meter
5. Click "Spin Meter"
6. Check that the data is sent successfully without CORS errors

## Troubleshooting

### Common Issues

1. **CORS Errors Persist**
   - Ensure the proxy server is running
   - Verify the proxy URL in [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/smart-meter.html) is correct
   - Check that the proxy server allows requests from your smart meter domain

2. **Proxy Server Not Responding**
   - Check the proxy server logs for errors
   - Ensure the proxy server is properly configured to accept requests
   - Verify that the proxy server is deployed correctly

3. **Network Errors**
   - Ensure both the smart meter simulator and proxy server are deployed correctly
   - Check that the URLs are accessible from a web browser
   - Verify internet connectivity

### Logs and Monitoring

- Check your proxy server logs for error messages
- Monitor the smart meter simulator console for network errors
- Use browser developer tools to inspect network requests

## Updating the Proxy Server

To update the proxy server after making changes:

1. Commit your changes to the repository
2. For Render/Heroku/Vercel: Push to the connected repository to trigger automatic deployment
3. For manual deployments: Redeploy using the platform's deployment process

## Security Considerations

- The proxy server is designed to only forward requests to Supabase functions
- Ensure your proxy server is only accessible over HTTPS
- Regularly monitor the proxy server for unauthorized usage
- Consider adding rate limiting to prevent abuse