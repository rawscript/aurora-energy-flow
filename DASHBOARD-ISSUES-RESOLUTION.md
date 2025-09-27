# Aurora Dashboard Issues Resolution Guide

## Current Issues Analysis

Based on your console logs, there are several issues that need to be addressed:

### 1. Missing RPC Functions (404 Errors)
```
rcthtxwzsqvwivritzln.supabase.co/rest/v1/rpc/get_or_create_profile:1 Failed to load resource: the server responded with a status of 404 ()
```

These functions are missing from your Supabase instance:
- `get_or_create_profile`
- `initialize_user_notifications`
- `get_user_notifications_safe`
- `get_token_analytics`

### 2. Rate Limiting (429 Errors)
```
rcthtxwzsqvwivritzln.supabase.co/auth/v1/token?grant_type=refresh_token:1 Failed to load resource: the server responded with a status of 429 ()
```

This indicates you're making too many requests to Supabase within a short period.

### 3. Minor Issues
- Missing favicon: `https://www.auroraenergy.app/icon-192.png`
- WebSocket connection issues (less critical)

## Solution Steps

### Step 1: Deploy Missing Database Functions

1. **Ensure you have Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Log in to Supabase**:
   ```bash
   supabase login
   ```

3. **Deploy database functions**:
   ```bash
   # On Windows
   deploy-db-functions.bat
   
   # On Mac/Linux
   chmod +x deploy-db-functions.sh
   ./deploy-db-functions.sh
   ```

### Step 2: Deploy Edge Functions

1. **Deploy all edge functions**:
   ```bash
   # On Windows
   deploy-all-functions.bat
   
   # On Mac/Linux
   chmod +x deploy-all-functions.sh
   ./deploy-all-functions.sh
   ```

### Step 3: Verify Deployment

1. **Check that functions are deployed**:
   ```bash
   supabase functions list
   ```

2. **Test the functions**:
   You can test if the functions work by making a direct call to them using curl or a tool like Postman.

### Step 4: Address Rate Limiting Issues

To reduce the number of requests and avoid rate limiting:

1. **Implement request caching** in your frontend application
2. **Add debouncing** to API calls that are triggered frequently
3. **Reduce polling frequency** for real-time data
4. **Use pagination** for large data sets instead of fetching all data at once

### Step 5: Fix Minor Issues

1. **Add the missing favicon**:
   - Create a 192x192 PNG icon
   - Place it at `public/icon-192.png` in your project
   - Deploy the updated frontend

## Testing After Deployment

After deploying the functions, test the following:

1. **Check if RPC functions are accessible**:
   ```bash
   curl -X POST "https://rcthtxwzsqvwivritzln.supabase.co/rest/v1/rpc/get_or_create_profile" \
        -H "apikey: YOUR_ANON_KEY" \
        -H "Authorization: Bearer YOUR_USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"p_user_id": "USER_ID", "p_email": "user@example.com", "p_full_name": "Test User", "p_phone_number": "1234567890", "p_meter_number": "METER123"}'
   ```

2. **Verify the dashboard loads without 404 errors**

3. **Check that smart meter data is being received** by:
   - Sending a test reading from the smart meter simulator
   - Checking if it appears in the dashboard

## Troubleshooting

If you still experience issues after deployment:

1. **Check Supabase logs**:
   ```bash
   supabase logs
   ```

2. **Verify function code** in the Supabase dashboard

3. **Check database permissions** for the functions

4. **Review error messages** in the browser console for more specific details

## Next Steps

1. Run the deployment scripts as described above
2. Test the dashboard to ensure the 404 errors are resolved
3. Monitor for rate limiting issues and implement caching if needed
4. Verify that smart meter data is flowing correctly from the simulator to the dashboard

If you continue to experience issues after following these steps, please share the specific error messages you see.