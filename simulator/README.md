# Aurora Smart Meter Simulator

This directory contains the Aurora Smart Meter Simulator, a web-based tool for simulating energy meter readings and sending data to the Aurora system.

## Files

- [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html) - The main simulator interface
- [netlify.toml](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/netlify.toml) - Netlify deployment configuration
- [package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/package.json) - Node.js package file
- Documentation files ([PROXY_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/PROXY_DEPLOYMENT.md), [SMART_METER_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/SMART_METER_DEPLOYMENT.md), etc.)

## Deployment to Netlify

### Option 1: Direct Deployment (Recommended)

1. Visit [app.netlify.com](https://app.netlify.com)
2. Sign in to your Netlify account
3. Drag and drop the [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html) file onto the deployment area
4. Netlify will automatically deploy your site and provide a public URL

### Option 2: GitHub Integration

1. Push this directory to a GitHub repository
2. Visit [app.netlify.com](https://app.netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select the repository containing these files
6. Configure the build settings:
   - Branch to deploy: `main` or `master`
   - Publish directory: `.` (current directory)
   - Build command: (leave empty)
7. Click "Deploy site"

### Option 3: Manual Deployment with CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod
   ```

## Configuration

Before deploying, make sure to update the proxy URL in [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html):

```javascript
const AURORA_CONFIG = {
  // ... other config
  proxyUrl: 'https://your-proxy-server.onrender.com/proxy/supabase-function' // Update this URL
};
```

## Usage

1. Visit your deployed smart meter simulator
2. Enter a User ID and Meter Number
3. Click "Register" to register the meter
4. Select the registered meter from the dropdown
5. Click "Spin Meter" to generate a reading
6. The reading will be sent to Aurora through the proxy server

## Troubleshooting

If you encounter issues:

1. Make sure the proxy server is deployed and running
2. Verify the proxy URL in [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html) is correct
3. Check the browser console for any errors (F12 → Console)
4. Ensure you're using a modern browser that supports the required JavaScript features