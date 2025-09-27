# Aurora Smart Meter Proxy Server

This is a simple proxy server to handle CORS issues when connecting the Aurora Smart Meter Simulator to the Aurora system.

## Purpose

The smart meter simulator needs to communicate with Supabase functions, but browsers block cross-origin requests by default (CORS policy). This proxy server acts as an intermediary between the smart meter and Supabase.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

## Deployment

See [PROXY_DEPLOYMENT.md](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/PROXY_DEPLOYMENT.md) for detailed deployment instructions.

## Endpoints

- `/proxy/supabase-function` - Proxy endpoint for Supabase functions
- `/health` - Health check endpoint

## Configuration

The proxy server is configured to allow requests from common deployment domains:
- Netlify apps (`*.netlify.app`)
- Vercel apps (`*.vercel.app`)
- Heroku apps (`*.herokuapp.com`)
- Local development servers (`localhost`, `127.0.0.1`)

To add more allowed origins, modify the `corsOptions` in [proxy-server.js](file:///e:/Main/Projects/internal/Aurora/aurora-energy-flow/proxy-server.js).