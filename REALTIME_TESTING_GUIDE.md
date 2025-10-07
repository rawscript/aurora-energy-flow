# Real-Time Energy Data Testing Guide

This guide explains how to test and verify that real-time energy data updates are working correctly in the Aurora Energy Flow application.

## Overview

The Aurora Energy Flow application supports real-time updates from smart meters and solar inverters. When a device sends data, it should immediately appear in the dashboard without requiring manual refresh.

## Testing Real-Time Updates

### 1. Using the Test Page

Visit `/test-realtime` in your deployed application to access the real-time testing page. This page shows:

- Connection status
- Current energy data
- Recent readings
- Test controls

### 2. Testing with the Smart Meter Simulator

1. Open the smart meter simulator at `/simulator/smart-meter.html`
2. Register your meter with your user ID
3. Click "Spin Meter" to generate and send a reading
4. Watch the `/test-realtime` page for immediate updates

### 3. Manual Testing Steps

1. **Verify Connection**:
   - Ensure your meter is properly registered in your user profile
   - Check that the meter status shows as "connected" in the UI

2. **Send Test Data**:
   - Use the smart meter simulator to send a reading
   - Or use the "Get New Reading" button on the test page

3. **Observe Updates**:
   - The dashboard should update within seconds
   - Check the browser console for log messages
   - Verify that new readings appear in the recent readings list

## Common Issues and Solutions

### Issue: Data Not Updating in Real-Time

**Solution**:
1. Check browser console for errors
2. Verify that the Supabase real-time subscription is working
3. Ensure your meter is properly registered
4. Check that the smart meter webhook is correctly configured

### Issue: "No Meter Connected" Message

**Solution**:
1. Go to your user profile settings
2. Ensure your meter number is properly set
3. Refresh the page to recheck the connection

### Issue: Delayed Updates

**Solution**:
1. Check your network connection
2. Verify that the Supabase service is responsive
3. Check for any rate limiting in the console

## Debugging Real-Time Updates

### Browser Console Logs

Look for these key log messages:

```
// Subscription setup
"Energy readings subscription status: SUBSCRIBED"

// New reading received
"New energy reading received: INSERT"
"Processing new reading: {meter_number: '12345', kwh_consumed: 10.5}"

// Data updates
"Session state changed: {user: true, session: true}"
"Energy data updated: {current_usage: 10.5, daily_total: 45.2}"
```

### Supabase Real-Time Monitoring

You can monitor real-time activity in the Supabase dashboard:

1. Go to your Supabase project
2. Navigate to "Database" → "Realtime"
3. Check the active channels and subscriptions

## Testing Different Scenarios

### Scenario 1: New User with No Meter

1. Create a new user account
2. Visit the dashboard
3. Verify that "No Meter Connected" message appears
4. Register a meter
5. Verify that data starts appearing

### Scenario 2: Existing User with Connected Meter

1. Log in as an existing user
2. Verify meter is connected
3. Send a test reading
4. Verify immediate update in dashboard

### Scenario 3: Multiple Readings in Quick Succession

1. Send multiple readings in quick succession
2. Verify that all readings are processed
3. Check that the most recent reading is displayed

## Troubleshooting Checklist

### Connection Issues
- [ ] Meter is properly registered in user profile
- [ ] Supabase credentials are correct
- [ ] Network connection is stable
- [ ] No firewall blocking WebSocket connections

### Data Flow Issues
- [ ] Smart meter webhook is correctly deployed
- [ ] Proxy server is running (if used)
- [ ] Data payload matches expected format
- [ ] No errors in Supabase function logs

### Display Issues
- [ ] Browser cache is cleared
- [ ] No JavaScript errors in console
- [ ] Component is properly re-rendering
- [ ] State updates are being processed

## Expected Behavior

When everything is working correctly:

1. **Initial Load**: Dashboard shows current energy data
2. **New Reading**: Data updates within 1-2 seconds of receipt
3. **Multiple Readings**: All readings are processed in order
4. **Connection Loss**: App gracefully handles disconnections
5. **Reconnection**: App automatically reconnects and syncs data

## Support

If you continue to experience issues:

1. Check browser console for specific error messages
2. Verify all configuration steps in this guide
3. Contact support with:
   - Screenshots of console errors
   - Steps to reproduce the issue
   - Browser and device information