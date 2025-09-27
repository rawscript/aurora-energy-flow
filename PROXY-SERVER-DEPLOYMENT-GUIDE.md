# Proxy Server Deployment Guide

## Deploying to Render

1. **Commit and push your changes**:
   ```bash
   git add proxy-deployment/proxy-server.js
   git commit -m "Fix proxy server for smart meter data flow"
   git push origin main
   ```

2. **Trigger a new deployment on Render**:
   - Go to your Render dashboard
   - Find your "aurora-smart-meter-proxy" service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for the deployment to complete (usually 2-3 minutes)

## Verifying the Deployment

After deployment, test the proxy server:

1. **Check health endpoint**:
   ```bash
   curl https://aurora-smart-meter-proxy.onrender.com/health
   ```

2. **Test smart meter data flow**:
   ```bash
   curl -X POST https://aurora-smart-meter-proxy.onrender.com/proxy/supabase-function \
        -H "Content-Type: application/json" \
        -d '{"meter_number":"KP-123456","kwh_consumed":12.5,"user_id":"actual-user-id","cost_per_kwh":25.0}'
   ```

## Troubleshooting

If you encounter issues:

1. **Check Render logs**:
   - Go to your Render dashboard
   - View logs for the proxy server service

2. **Verify environment variables**:
   - Ensure `SUPABASE_KEY` is set in Render environment variables

3. **Test locally first**:
   ```bash
   cd proxy-deployment
   npm install
   npm start
   ```

## Common Issues

1. **503 Service Unavailable**:
   - Check if the proxy server is running
   - Verify Supabase function is working
   - Check Render logs for startup errors

2. **CORS Issues**:
   - Verify CORS configuration allows your domain
   - Check browser console for specific CORS errors

3. **Function Boot Errors**:
   - Check Supabase function logs
   - Verify all imports are correct
   - Ensure environment variables are set