# Function Deployment Instructions

This document provides instructions for deploying the required database functions and Supabase Edge Functions to resolve the issues with missing functions.

## Issues Identified

1. `get_notification_preferences not found, using fallback logic`
2. `get_or_create_profile not found, using fallback to fetch from profiles table`

## Solution

The required functions are already implemented in the codebase but need to be deployed to your Supabase instance.

### Step 1: Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
npm install -g supabase
```

### Step 2: Log in to Supabase

Log in to your Supabase account:

```bash
supabase login
```

### Step 3: Deploy Database Functions

Run the database functions deployment script:

#### On Windows:
```bash
deploy-db-functions.bat
```

#### On Linux/Mac:
```bash
chmod +x deploy-db-functions.sh
./deploy-db-functions.sh
```

### Step 4: Deploy Edge Functions

Run the edge functions deployment script:

#### On Windows:
```bash
deploy-all-functions.bat
```

#### On Linux/Mac:
```bash
chmod +x deploy-all-functions.sh
./deploy-all-functions.sh
```

### Step 5: Verify Deployment

Verify that the functions have been deployed successfully:

#### On Windows:
```bash
verify-functions.bat
```

#### On Linux/Mac:
```bash
supabase functions list
```

## Manual Deployment (Alternative)

If the scripts don't work, you can deploy the functions manually:

### Deploy Database Functions

1. Connect to your Supabase database using psql:

```bash
psql -h db.<your-project-ref>.supabase.co -p 5432 -U postgres -d postgres
```

2. Run the following SQL commands:

```sql
-- Create get_or_create_profile function
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_phone_number TEXT,
  p_meter_number TEXT
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  meter_number TEXT,
  meter_category TEXT,
  industry_type TEXT,
  energy_provider TEXT,
  notifications_enabled BOOLEAN,
  auto_optimize BOOLEAN,
  energy_rate NUMERIC,
  notification_preferences JSONB,
  kplc_meter_type TEXT,
  low_balance_threshold NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to find an existing profile
  RETURN QUERY
  SELECT
    id,
    created_at,
    updated_at,
    email,
    full_name,
    phone_number,
    meter_number,
    meter_category,
    industry_type,
    energy_provider,
    notifications_enabled,
    auto_optimize,
    energy_rate,
    notification_preferences,
    kplc_meter_type,
    low_balance_threshold
  FROM profiles
  WHERE id = p_user_id;

  -- If no profile exists, create a new one
  IF NOT FOUND THEN
    INSERT INTO profiles (
      id,
      email,
      full_name,
      phone_number,
      meter_number,
      meter_category,
      industry_type,
      energy_provider,
      notifications_enabled,
      auto_optimize,
      energy_rate,
      notification_preferences,
      kplc_meter_type,
      low_balance_threshold
    )
    VALUES (
      p_user_id,
      p_email,
      p_full_name,
      p_phone_number,
      p_meter_number,
      'residential',
      'home',
      'KPLC',
      TRUE,
      FALSE,
      0.15,
      '{"token_low": true, "token_depleted": true, "power_restored": true}',
      'prepaid',
      100
    )
    RETURNING
      id,
      created_at,
      updated_at,
      email,
      full_name,
      phone_number,
      meter_number,
      meter_category,
      industry_type,
      energy_provider,
      notifications_enabled,
      auto_optimize,
      energy_rate,
      notification_preferences,
      kplc_meter_type,
      low_balance_threshold;
  END IF;
END;
$$;

-- Create get_notification_preferences function
CREATE OR REPLACE FUNCTION public.get_notification_preferences(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  token_low BOOLEAN,
  token_depleted BOOLEAN,
  power_restored BOOLEAN,
  energy_alert BOOLEAN,
  low_balance_alert BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return the notification preferences for the user
  RETURN QUERY
  SELECT
    user_id,
    COALESCE((notification_preferences->>'token_low')::BOOLEAN, TRUE) AS token_low,
    COALESCE((notification_preferences->>'token_depleted')::BOOLEAN, TRUE) AS token_depleted,
    COALESCE((notification_preferences->>'power_restored')::BOOLEAN, TRUE) AS power_restored,
    COALESCE((notification_preferences->>'energy_alert')::BOOLEAN, TRUE) AS energy_alert,
    COALESCE((notification_preferences->>'low_balance_alert')::BOOLEAN, TRUE) AS low_balance_alert
  FROM profiles
  WHERE id = p_user_id;
END;
$$;

-- Create get_user_notifications_safe function
CREATE OR REPLACE FUNCTION public.get_user_notifications_safe(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  severity TEXT,
  is_read BOOLEAN,
  token_balance DECIMAL(10,2),
  estimated_days INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  source_table TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notifications_table_exists BOOLEAN := FALSE;
  v_ai_alerts_table_exists BOOLEAN := FALSE;
BEGIN
  -- Check table existence
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
  ) INTO v_notifications_table_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_alerts'
  ) INTO v_ai_alerts_table_exists;

  -- Try to get notifications from notifications table first
  IF v_notifications_table_exists THEN
    BEGIN
      RETURN QUERY
      SELECT
        n.id,
        n.title,
        n.message,
        n.type,
        n.severity,
        n.is_read,
        n.token_balance,
        n.estimated_days,
        n.metadata,
        n.created_at,
        n.updated_at,
        n.expires_at,
        'notifications'::TEXT as source_table
      FROM public.notifications n
      WHERE n.user_id = p_user_id
        AND (NOT p_unread_only OR n.is_read = FALSE)
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
      ORDER BY n.created_at DESC
      LIMIT p_limit;

      -- If we got results, return them
      IF FOUND THEN
        RETURN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue to fallback
      RAISE NOTICE 'Error accessing notifications table: %', SQLERRM;
    END;
  END IF;

  -- Fallback to ai_alerts table if notifications table doesn't exist or has no data
  IF v_ai_alerts_table_exists THEN
    BEGIN
      RETURN QUERY
      SELECT
        a.id,
        a.title,
        a.message,
        a.alert_type as type,
        a.severity,
        a.is_read,
        NULL::DECIMAL(10,2) as token_balance,
        NULL::INTEGER as estimated_days,
        a.recommended_actions as metadata,
        a.created_at,
        a.created_at as updated_at,
        a.expires_at,
        'ai_alerts'::TEXT as source_table
      FROM public.ai_alerts a
      WHERE a.user_id = p_user_id
        AND (NOT p_unread_only OR a.is_read = FALSE)
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.created_at DESC
      LIMIT p_limit;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE NOTICE 'Error accessing ai_alerts table: %', SQLERRM;
    END;
  END IF;

  -- If we reach here, no data was found from either table
  RETURN;
END;
$$;
```

### Deploy Edge Functions

Deploy each function using the Supabase CLI:

```bash
supabase functions deploy get_or_create_profile
supabase functions deploy get_notification_preferences
supabase functions deploy get_user_notifications_safe
```

## Troubleshooting

If you encounter issues:

1. Make sure you're logged in to Supabase: `supabase login`
2. Check your project is linked: `supabase link`
3. Verify your database connection details: `supabase config`
4. Check for errors in the deployment output

## Fallback Logic

The application has been updated with improved fallback logic:

1. If `get_notification_preferences` is not found, it will fetch notification preferences from the profile table
2. If `get_or_create_profile` is not found, it will fetch the profile directly from the profiles table, and if the profile doesn't exist, it will create a new one with default values

This ensures the application continues to work even if the functions are not deployed.
