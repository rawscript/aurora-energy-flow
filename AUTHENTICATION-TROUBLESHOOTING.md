# Authentication Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Repeated "Successfully Signed In" Messages

**Symptoms**: 
- Seeing "You have successfully signed in" multiple times after a single login
- Authentication state seems to reset unexpectedly

**Root Causes**:
1. **Auth State Change Events**: Multiple `SIGNED_IN` events being triggered
2. **Session Cache Issues**: Cached session becoming invalid
3. **Component Re-renders**: Auth components re-mounting and re-triggering auth flows

**Solutions**:
1. **Check Browser Console**: Look for "Auth state change: SIGNED_IN" messages to see frequency
2. **Clear Storage**: Clear localStorage and sessionStorage in browser dev tools
3. **Check Network Tab**: Look for repeated auth-related requests
4. **Component Lifecycle**: Ensure AuthProvider is not being unmounted/remounted

### Issue 2: 429 Rate Limiting Errors

**Symptoms**:
- HTTP 429 errors in network tab
- Requests failing with "Too Many Requests" messages
- Performance degradation

**Root Causes**:
1. **Excessive API Calls**: Too many requests to Supabase in a short time
2. **Session Validation Loops**: Repeated session checks triggering rate limits
3. **Component Re-renders**: Multiple components making auth calls simultaneously

**Solutions**:
1. **Implement Request Throttling**: Add delays between repeated requests
2. **Use Caching**: Cache session validity checks for 5-10 seconds
3. **Optimize Hooks**: Ensure `useAuth` and `useAuthenticatedApi` hooks are not making redundant calls
4. **Check Intervals**: Verify session check intervals are not too frequent

### Issue 3: 400 Bad Request Errors

**Symptoms**:
- HTTP 400 errors in network tab
- RPC function calls failing
- Authentication failures with no clear reason

**Root Causes**:
1. **Parameter Validation**: Missing or invalid parameters in RPC calls
2. **Function Signature Mismatches**: TypeScript types not matching actual function signatures
3. **Session Issues**: Invalid session tokens being sent with requests

**Solutions**:
1. **Validate Parameters**: Ensure all RPC calls have required parameters
2. **Check Function Signatures**: Verify database functions match TypeScript definitions
3. **Session Validation**: Ensure session is valid before making RPC calls

### Issue 4: Unexpected Logouts

**Symptoms**:
- Being logged out without explicit action
- Session expiring too quickly
- Need to re-authenticate frequently

**Root Causes**:
1. **Session Expiry**: JWT tokens expiring without proper refresh
2. **Token Refresh Issues**: Auto-refresh disabled or not working correctly
3. **Browser Storage Issues**: localStorage/sessionStorage being cleared

**Solutions**:
1. **Check Session Timing**: Verify JWT expiry settings (currently 1 hour)
2. **Manual Refresh**: Implement manual session refresh for critical operations
3. **Graceful Expiry Handling**: Show warnings before session expires

## Diagnostic Steps

### 1. Browser Console Analysis

Look for these key log messages:

```
// Auth state changes
"Auth state change:" SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED

// Session validation
"Session validation check:"
"Session expires in X minutes"

// Component mounts
"Initializing auth..."
"AuthProvider mounted"

// RPC calls
"Calling RPC: function_name"
"RPC call function_name failed:"
```

### 2. Network Tab Analysis

Filter by these status codes and examine requests:

- **429**: Rate limiting - Too many requests
- **400**: Bad requests - Invalid parameters
- **401/403**: Authentication failures
- **Repeated requests**: Same endpoint called multiple times

### 3. Storage Inspection

Check browser dev tools Application/Storage tab:

- **localStorage**: Look for `supabase.session` entry
- **sessionStorage**: Check for any auth-related entries
- **Cookies**: Verify Supabase auth cookies

## Configuration Review

### Supabase Client Settings

Current configuration in `src/integrations/supabase/client.ts`:

```typescript
const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,           // ✅ Session persistence enabled
      autoRefreshToken: false,        // ✅ Auto-refresh disabled (intentional)
      detectSessionInUrl: false,      // ✅ URL session detection disabled
      flowType: 'pkce'
    },
    // ... other settings
  }
)
```

### Session Validation Settings

In `src/hooks/useAuth.tsx`:

```typescript
const SESSION_VALIDITY_CHECK_INTERVAL = 45 * 60 * 1000; // 45 minutes
const SESSION_PERSISTENCE_KEY = 'supabase.session';
```

In `src/hooks/useAuthenticatedApi.ts`:

```typescript
const VALIDITY_CACHE_DURATION = 10000; // 10 seconds cache
```

## Recommended Fixes

### 1. Optimize Session Validation

Current implementation already has caching, but we can add additional safeguards:

```typescript
// In useAuth.tsx - Add rate limiting to session checks
const lastSessionCheck = useRef<number>(0);

const checkSessionValidity = useCallback(async () => {
  // Rate limiting - prevent too frequent checks
  const now = Date.now();
  if (now - lastSessionCheck.current < 300000) { // 5 minutes minimum
    console.log('Session validity check rate limited');
    return;
  }
  lastSessionCheck.current = now;
  
  // ... rest of validation logic
});
```

### 2. Improve Error Handling

Add better error categorization in `useAuthenticatedApi.ts`:

```typescript
// Enhanced error handling with specific error types
if (error.message && (error.message.includes('JWT') || error.message.includes('token'))) {
  console.log('Authentication error detected, clearing session cache');
  sessionValidityCache.current = null;
}
```

### 3. Add Connection Health Checks

Implement periodic connection health checks:

```typescript
// In useAuth.tsx
const checkConnectionHealth = useCallback(async () => {
  try {
    // Simple health check
    await supabase.from('profiles').select('id').limit(1);
    console.log('Connection health check: OK');
  } catch (error) {
    console.warn('Connection health check failed:', error.message);
  }
}, []);
```

## Testing Recommendations

### 1. Session Persistence Test

1. Log in to the application
2. Close and reopen the browser
3. Verify you're still logged in
4. Check localStorage for session data

### 2. Session Expiry Test

1. Log in to the application
2. Wait for 55+ minutes (接近 session expiry)
3. Verify you get a warning
4. Wait for full expiry and verify graceful logout

### 3. Rate Limiting Test

1. Perform multiple rapid actions in the app
2. Monitor network tab for 429 errors
3. Verify proper throttling is in place

### 4. Error Recovery Test

1. Simulate network errors
2. Verify error messages are user-friendly
3. Check that the app recovers gracefully

## Monitoring and Logging

### Key Metrics to Track

1. **Session Duration**: Average time between login and logout
2. **Auth Errors**: Frequency of 400/401/403/429 errors
3. **RPC Call Success Rate**: Percentage of successful RPC calls
4. **Session Refresh Rate**: How often sessions need manual refresh

### Logging Best Practices

1. **Structured Logging**: Use consistent log formats
2. **Contextual Information**: Include user ID, session state, timestamps
3. **Error Details**: Log full error objects for debugging
4. **Performance Metrics**: Track request durations and frequencies

## Prevention Strategies

### 1. Code Review Checklist

- [ ] All auth hooks use `useAuthenticatedApi` instead of direct Supabase calls
- [ ] Session validity is cached appropriately
- [ ] Error handling is implemented for all auth-related operations
- [ ] Rate limiting is applied to frequent operations
- [ ] Component lifecycle is managed properly (no unnecessary re-mounts)

### 2. Performance Optimization

- [ ] Minimize auth-related API calls
- [ ] Cache frequently accessed data
- [ ] Batch related RPC calls when possible
- [ ] Implement proper loading states

### 3. Security Considerations

- [ ] Validate all user inputs
- [ ] Sanitize data before database operations
- [ ] Implement proper session timeout handling
- [ ] Use secure storage for sensitive data

## Emergency Procedures

### If Users Are Locked Out

1. **Immediate Fix**: Clear user's localStorage and sessionStorage
2. **Temporary Solution**: Provide incognito mode workaround
3. **Root Cause Analysis**: Check server logs for errors
4. **Communication**: Inform affected users of the issue

### If Rate Limiting Becomes Problematic

1. **Short-term**: Increase rate limit thresholds temporarily
2. **Long-term**: Optimize client-side request patterns
3. **Monitoring**: Set up alerts for rate limit breaches
4. **Documentation**: Update user guidelines on usage patterns

## Contact Support

If issues persist after implementing these fixes:

1. **Supabase Support**: https://supabase.com/dashboard/support
2. **Community Forums**: https://github.com/supabase/supabase/discussions
3. **Documentation**: https://supabase.com/docs