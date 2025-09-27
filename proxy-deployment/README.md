# Aurora Smart Meter Proxy Server Deployment

This directory contains all the necessary files to deploy the Aurora Smart Meter Proxy Server.

## Files

- [package.json](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-deployment/package.json) - Node.js package file with dependencies
- [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-deployment/proxy-server.js) - Main proxy server implementation
- [check-proxy.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-deployment/check-proxy.js) - Script to check if the proxy server is running
- [test-proxy.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-deployment/test-proxy.js) - Script to test the proxy server functionality

## Deployment Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the proxy server:
   ```bash
   npm start
   ```

3. For development with auto-restart:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file to configure the proxy server:

```env
# Port to run the proxy server on (default: 3001)
PORT=3001

# Supabase API key (optional - defaults to the Aurora key)
SUPABASE_KEY=your-supabase-key-here
```

## Testing

Check if the proxy server is running:
```bash
npm run check
```

Run tests to verify functionality:
```bash
npm test
```