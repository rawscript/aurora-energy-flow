# Smart Meter Data Flow Issue Fix

## Problem Description

The smart meter is connected and sending data, but Aurora dashboard is not receiving it. This is happening because:

1. **Function Mismatch**: The smart meter simulator is calling the old `insert_energy_reading` function, but the system now uses `insert_energy_reading_improved`.
2. **Meter Registration Issue**: The smart meter simulator registers meters in localStorage but doesn't update the user's profile in the database.
3. **Validation Failure**: The improved function validates that the meter belongs to the user, but if the profile doesn't have the meter number, validation fails.

## Solution Implemented

### 1. Updated Smart Meter Webhook Function

The `smart-meter-webhook` function has been updated to:
- Use the correct `insert_energy_reading_improved` function
- Automatically update the user's profile with the meter number if it's not already set

### 2. Diagnostic Tools

We've created diagnostic scripts to help identify and fix the issue:
- `diagnose-smart-meter-data-flow.js` - Comprehensive diagnostic tool
- `check-user-profile.js` - Check user profile and meter registration
- `check-energy-readings.js` - Check if energy readings are being stored
- `check-meter-registration.js` - Check if meter is properly registered

## How to Fix the Issue

### Step 1: Redeploy the Smart Meter Webhook Function

```bash
cd supabase/functions
supabase functions deploy smart-meter-webhook
```

### Step 2: Run the Diagnostic Script

1. Replace `YOUR_ACTUAL_USER_ID` in `diagnose-smart-meter-data-flow.js` with your real user ID
2. Run the script:
   ```bash
   node diagnose-smart-meter-data-flow.js
   ```

### Step 3: Verify Meter Registration

1. Make sure the meter number in your Aurora profile matches what the smart meter simulator is sending
2. In the Aurora dashboard, go to Settings and verify your meter number
3. In the smart meter simulator, make sure you're using the same meter number

### Step 4: Test Data Flow

1. Spin the meter in the smart meter simulator
2. Check the response in the simulator
3. Refresh the Aurora dashboard to see if data appears

## Common Issues and Solutions

### Issue: "Meter does not belong to user" Error
**Solution**: Ensure the meter number in your profile matches what the smart meter is sending.

### Issue: Function Not Found
**Solution**: Redeploy the smart-meter-webhook function.

### Issue: Network Errors
**Solution**: Make sure the proxy server is running if you're using it.

## Technical Details

### The insert_energy_reading_improved Function

This function includes important validation:
```sql
-- Verify meter belongs to user
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE id = p_user_id AND meter_number = p_meter_number
) INTO v_profile_exists;

IF NOT v_profile_exists THEN
  RAISE EXCEPTION 'Meter % does not belong to user %', p_meter_number, p_user_id;
END IF;
```

### Smart Meter Webhook Enhancement

The webhook now automatically updates the user profile:
```javascript
// First, ensure the user's profile has this meter number
const { error: profileUpdateError } = await supabaseClient
  .from('profiles')
  .update({ meter_number: meter_number })
  .eq('id', user_id)
  .eq('meter_number', null); // Only update if meter_number is currently null
```

## Verification Steps

After implementing the fix:

1. Run the diagnostic script again to confirm the function is working
2. Send a test reading from the smart meter simulator
3. Check that the reading appears in the database:
   ```sql
   SELECT * FROM energy_readings 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY reading_date DESC 
   LIMIT 5;
   ```
4. Verify the Aurora dashboard shows the new data

## Additional Notes

- The fix maintains backward compatibility
- The automatic profile update only happens if no meter is currently registered
- All existing data and functionality remains unaffected