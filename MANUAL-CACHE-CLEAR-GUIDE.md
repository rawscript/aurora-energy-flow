# How to Manually Clear Supabase Cache

## Method 1: Using SQL Editor (Recommended)

1. **Access SQL Editor**:
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Run Cache Clearing Command**:
   ```sql
   -- Reload configuration files and clear function cache
   SELECT pg_reload_conf();
   
   -- Optional: Clear prepared statement cache
   SELECT pg_stat_statements_reset();
   ```

3. **Execute the Query**:
   - Click "Run" to execute the commands
   - You should see a success message

## Method 2: Restart Database (More Thorough)

1. **Access Database Settings**:
   - Go to your Supabase project dashboard
   - Click on "Settings" (gear icon) in the left sidebar
   - Select "Database"

2. **Restart Database**:
   - Look for a "Restart" or "Reboot" button
   - Click it to restart your database
   - Note: This will temporarily interrupt all connections

3. **Wait for Restart**:
   - Wait 2-5 minutes for the database to fully restart
   - You'll see status changes in the dashboard

## Method 3: Redeploy Functions (Cache Busting)

1. **Redeploy Database Functions**:
   ```bash
   # Windows
   deploy-db-functions.bat
   
   # Mac/Linux
   ./deploy-db-functions.sh
   ```

2. **Redeploy Edge Functions**:
   ```bash
   # Windows
   deploy-all-functions.bat
   
   # Mac/Linux
   ./deploy-all-functions.sh
   ```

## Method 4: Clear Browser Cache

1. **Hard Refresh**:
   - Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - This clears the browser's cache for your application

2. **Clear Site Data**:
   - Open Developer Tools (F12)
   - Go to Application tab
   - Under "Clear storage", click "Clear site data"

## Verification Steps

After clearing the cache, verify that the functions are working:

1. **Run the verification script**:
   ```bash
   node verify-cache-clear.js
   ```

2. **Check browser console**:
   - Refresh your Aurora application
   - Look for any remaining 404 errors

3. **Test smart meter integration**:
   - Send a test reading from the simulator
   - Check if it appears in the dashboard

## If Issues Persist

If you're still experiencing 404 errors:

1. **Check Supabase Status**:
   - Visit https://status.supabase.com/
   - Check for any ongoing incidents

2. **Review Function Logs**:
   - In Supabase dashboard, go to "Functions" → "Logs"
   - Look for error messages

3. **Verify Function Existence**:
   ```sql
   -- List all functions in your database
   SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
   ```

4. **Contact Supabase Support**:
   - If none of the above works, there may be a platform issue