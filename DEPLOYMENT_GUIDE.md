# Aurora Smart Meter Deployment Guide

This guide explains how to deploy both the Aurora Smart Meter Simulator and the Proxy Server to resolve CORS issues.

## Overview

To deploy the complete Aurora Smart Meter solution, you need to deploy two components:

1. **Smart Meter Simulator** - The frontend interface that users interact with
2. **Proxy Server** - A backend service that handles CORS issues between the simulator and Supabase

## Prerequisites

1. A Netlify account (for deploying the smart meter simulator)
2. A Render/Heroku/Vercel account (for deploying the proxy server)
3. Node.js installed locally (for testing)

## Deploying the Smart Meter Simulator to Netlify

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

## Deploying the Proxy Server

### Option 1: Deploy to Render (Recommended)

1. Create a Render account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository or upload the proxy server files:
   - [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-server.js)
   - [proxy-package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-package.json) (rename to `package.json` when deploying)
4. Configure the service:
   - Name: `aurora-smart-meter-proxy`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
5. Deploy by clicking "Create Web Service"
6. Note the URL provided by Render (e.g., `https://aurora-smart-meter-proxy.onrender.com`)

### Option 2: Deploy to Heroku

1. Create a Heroku account at [heroku.com](https://heroku.com)
2. Install the Heroku CLI
3. Prepare the proxy server files in a directory:
   - [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-server.js)
   - [proxy-package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-package.json) (rename to `package.json`)
4. Deploy using Heroku CLI:
   ```bash
   heroku login
   heroku create aurora-smart-meter-proxy
   git init
   git add .
   git commit -m "Initial commit"
   heroku git:remote -a aurora-smart-meter-proxy
   git push heroku master
   ```

### Option 3: Deploy to Vercel

1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import the proxy server repository or upload files:
   - [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-server.js)
   - [proxy-package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-package.json) (rename to `package.json`)
4. Configure build settings:
   - Build Command: `npm install`
   - Output Directory: (leave empty)
5. Deploy the project

## Configuring the Smart Meter Simulator

After deploying both components, you need to update the smart meter simulator to use your deployed proxy server:

1. Open your deployed smart meter simulator in a text editor or directly on Netlify
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

## Testing the Deployment

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

## Updating the Deployment

To update either component:

1. Make changes to the files
2. For the smart meter simulator: Redeploy to Netlify
3. For the proxy server: Push changes to your Git repository or redeploy manually

## Security Considerations

- The proxy server is designed to only forward requests to Supabase functions
- Ensure your proxy server is only accessible over HTTPS
- Regularly monitor the proxy server for unauthorized usage
- Consider adding rate limiting to prevent abuse