# Aurora Smart Meter Simulator

This directory contains all the files needed to deploy the Aurora Smart Meter Simulator and its proxy server.

## Contents

- [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html) - The smart meter simulator interface
- [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/proxy-server.js) - Proxy server to handle CORS issues
- [proxy-package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/proxy-package.json) - Package file for the proxy server
- [proxy-README.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/proxy-README.md) - Documentation for the proxy server
- [PROXY_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/PROXY_DEPLOYMENT.md) - Instructions for deploying the proxy server
- [SMART_METER_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/SMART_METER_DEPLOYMENT.md) - Instructions for deploying the smart meter simulator
- [check-proxy.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/check-proxy.js) - Script to check if the proxy server is running

## Deployment

1. Deploy the smart meter simulator ([smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html)) to a static hosting service like Netlify
2. Deploy the proxy server ([proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/proxy-server.js)) to a cloud platform like Render, Heroku, or Vercel
3. Update the proxy URL in [smart-meter.html](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/smart-meter.html) to point to your deployed proxy server

For detailed deployment instructions, see:
- [PROXY_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/PROXY_DEPLOYMENT.md) for proxy server deployment
- [SMART_METER_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/simulator/SMART_METER_DEPLOYMENT.md) for smart meter simulator deployment