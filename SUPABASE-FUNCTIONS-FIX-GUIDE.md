# Aurora Supabase Functions Deployment Fix Guide

## Current Status

Based on our diagnostics, we've found:

1. **Functions Status**:
   - `get_or_create_profile`: Exists but may have caching issues
   - `create_notification`: Working correctly
   - `get_notification_preferences`: Working correctly
   - `get_user_notifications_safe`: Working correctly
   - `initialize_user_notifications`: May have schema issues

2. **Issues Identified**:
   - Frequent 404 errors when calling functions
   - Possible schema mismatch in notifications table
   - Caching issues in Supabase schema cache

## Immediate Fix Steps

### Step 1: Redeploy All Database Functions

Even though functions appear to exist, redeploying ensures they're properly registered:

```bash
# On Windows
deploy-db-functions.bat

# On Mac/Linux
chmod +x deploy-db-functions.sh
./deploy-db-functions.sh
```

### Step 2: Redeploy All Edge Functions

```bash
# On Windows
deploy-all-functions.bat

# On Mac/Linux
chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

### Step 3: Clear Supabase Schema Cache

Sometimes Supabase caches function definitions. To clear the cache:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this query:
   ```sql
   SELECT pg_reload_conf();
   ```

### Step 4: Verify Notifications Table Schema

Check that your notifications table has all required columns:

```sql
-- Run this in Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
```

Required columns should include:
- id (UUID)
- user_id (UUID)
- title (TEXT)
- message (TEXT)
- type (TEXT)
- severity (TEXT)
- token_balance (DECIMAL)
- estimated_days (INTEGER)
- metadata (JSONB)
- expires_at (TIMESTAMPTZ)
- is_read (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

### Step 5: Restart Aurora Application

After deployment:
1. Clear your browser cache
2. Hard refresh the Aurora application (Ctrl+F5 or Cmd+Shift+R)
3. Log out and log back in

## Testing After Fix

### Test Function Calls

Use the diagnose script to verify functions are working:
```bash
node diagnose-functions.js
```

### Test Smart Meter Integration

1. Open the smart meter simulator
2. Send a test reading
3. Check if it appears in the Aurora dashboard
4. Verify no 404 errors in browser console

## If Issues Persist

### Check Supabase Logs

```bash
supabase logs
```

### Manual Function Verification

In Supabase SQL Editor, test each function:

```sql
-- Test get_or_create_profile
SELECT * FROM get_or_create_profile(
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  'Test User',
  '1234567890',
  'TEST123'
);

-- Test initialize_user_notifications
SELECT * FROM initialize_user_notifications('00000000-0000-0000-0000-000000000000');
```

## Prevention for Future

1. Always deploy functions after making changes
2. Clear browser cache after deployments
3. Monitor Supabase logs for function errors
4. Test integrations thoroughly after deployments

## Support

If you continue to experience issues:
1. Check Supabase status page for outages
2. Verify your Supabase project configuration
3. Ensure your API keys are correct
4. Contact Supabase support if errors persist