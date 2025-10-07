# Deployment Checklist for Aurora Energy Flow

This checklist will help you ensure that your application works correctly after deployment.

## 1. Environment Variables Setup

### Required Environment Variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_PUBLIC_KEY` - Your Supabase public API key

### Optional Environment Variables:
- `VITE_OPENAI_API_KEY` - OpenAI API key for AI features
- `VITE_REDIS_URL` - Redis connection URL
- `VITE_REDIS_PORT` - Redis port
- `VITE_REDIS_PASSWORD` - Redis password

## 2. Platform-Specific Setup

### Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to "Settings" → "Environment Variables"
3. Add the following variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLIC_KEY=your-supabase-public-key
   ```
4. Redeploy your application

### Netlify Deployment:
1. Go to your Netlify site settings
2. Navigate to "Environment Variables"
3. Add the same variables as above
4. Trigger a new deployment

### Other Platforms:
1. Ensure environment variables are set according to your platform's documentation
2. The variable names must match exactly:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLIC_KEY`

## 3. Supabase Configuration

### URL Configuration:
1. Go to your Supabase project dashboard
2. Navigate to "Settings" → "API"
3. In the "URL Configuration" section, add your deployed site URL to:
   - "Additional Redirect URLs"
   - "Additional Site URLs"

## 4. Verification Steps

### After Deployment:
1. Visit your deployed application
2. Open browser developer tools (F12)
3. Check the console for any error messages
4. Look for the "Deployment Check Results" log message
5. Verify that `isSupabaseConfigured` is `true`
6. Try to sign up or sign in to test authentication

### Common Issues and Solutions:

#### Issue: "Supabase not configured" error
**Solution:** 
- Check that environment variables are set correctly on your deployment platform
- Ensure variable names match exactly (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLIC_KEY`)
- Redeploy your application after setting environment variables

#### Issue: Authentication works locally but not after deployment
**Solution:**
- Verify Supabase URL Configuration (step 3 above)
- Check that your deployed site URL is added to "Additional Redirect URLs"
- Ensure CORS settings are correct

#### Issue: Redirect loop or infinite loading
**Solution:**
- Clear browser cache and localStorage
- Check browser console for JavaScript errors
- Verify that all environment variables are correctly set

## 5. Testing Authentication

### Test Sign Up:
1. Visit your deployed app
2. Click "Sign Up" tab
3. Fill in test user information
4. Submit the form
5. Check that you're redirected to the dashboard

### Test Sign In:
1. Visit your deployed app
2. Click "Sign In" tab
3. Enter credentials from test user
4. Submit the form
5. Check that you're redirected to the dashboard

## 6. Troubleshooting

### If Authentication Still Doesn't Work:

1. **Check Browser Console:**
   - Look for error messages related to Supabase
   - Check for CORS errors
   - Verify environment variable values (they should show as "SET" in logs)

2. **Verify Environment Variables:**
   - Double-check that variables are set on your deployment platform
   - Ensure no extra spaces or characters in values
   - Variable names are case-sensitive

3. **Check Supabase Dashboard:**
   - Verify your API settings
   - Check that your site URL is in the allowed URLs list
   - Ensure your Supabase project is not paused or disabled

4. **Clear Cache:**
   - Clear browser cache
   - Clear localStorage: `localStorage.clear()`
   - Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

5. **Test with a Simple Page:**
   - Create a simple test page that just shows environment variable status
   - Deploy and check if variables are accessible

## 7. Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

## 8. Support

If you continue to experience issues:
1. Check the browser console for specific error messages
2. Verify all steps in this checklist
3. Contact support with:
   - Screenshots of console errors
   - Your deployment platform
   - Steps you've already tried