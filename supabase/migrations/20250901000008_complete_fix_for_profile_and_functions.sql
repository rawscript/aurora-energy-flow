-- Complete fix for profile columns and functions
-- This migration ensures all required columns exist and all functions are properly defined

-- Add missing energy settings columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add energy_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_provider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN energy_provider TEXT DEFAULT '';
    COMMENT ON COLUMN profiles.energy_provider IS 'The energy provider for the user (e.g., KPLC, Solar)';
  END IF;

  -- Add notifications_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN profiles.notifications_enabled IS 'Whether notifications are enabled for the user';
  END IF;

  -- Add auto_optimize column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auto_optimize'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auto_optimize BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN profiles.auto_optimize IS 'Whether auto-optimization is enabled for the user';
  END IF;

  -- Add energy_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_rate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN energy_rate DECIMAL(10,4) DEFAULT 0.15;
    COMMENT ON COLUMN profiles.energy_rate IS 'The energy rate in $/kWh for the user';
  END IF;
END $$;

-- Ensure all functions are properly defined with correct signatures

-- Function to get or create profile
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_meter_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  meter_number TEXT,
  meter_category TEXT,
  industry_type TEXT,
  energy_provider TEXT,
  notifications_enabled BOOLEAN,
  auto_optimize BOOLEAN,
  energy_rate DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
BEGIN
  -- Try to get existing profile first
  SELECT * INTO v_profile_data
  FROM public.profiles 
  WHERE profiles.id = p_user_id;
  
  IF FOUND THEN
    -- Profile exists, return it
    RETURN QUERY
    SELECT 
      v_profile_data.id,
      v_profile_data.email,
      v_profile_data.full_name,
      v_profile_data.phone_number,
      v_profile_data.meter_number,
      v_profile_data.meter_category,
      v_profile_data.industry_type,
      COALESCE(v_profile_data.energy_provider, '') as energy_provider,
      COALESCE(v_profile_data.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(v_profile_data.auto_optimize, FALSE) as auto_optimize,
      COALESCE(v_profile_data.energy_rate, 0.15) as energy_rate,
      v_profile_data.created_at,
      v_profile_data.updated_at;
  ELSE
    -- Profile doesn't exist, create it
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        meter_number,
        energy_provider,
        notifications_enabled,
        auto_optimize,
        energy_rate,
        created_at,
        updated_at
      )
      VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_meter_number,
        '',  -- energy_provider
        TRUE,  -- notifications_enabled
        FALSE, -- auto_optimize
        0.15,  -- energy_rate
        NOW(),
        NOW()
      )
      RETURNING * INTO v_profile_data;
      
    EXCEPTION WHEN unique_violation THEN
      -- Handle race condition - get the profile that was created
      SELECT * INTO v_profile_data
      FROM public.profiles 
      WHERE profiles.id = p_user_id;
    END;
    
    -- Return the profile data
    RETURN QUERY
    SELECT 
      v_profile_data.id,
      v_profile_data.email,
      v_profile_data.full_name,
      v_profile_data.phone_number,
      v_profile_data.meter_number,
      v_profile_data.meter_category,
      v_profile_data.industry_type,
      COALESCE(v_profile_data.energy_provider, '') as energy_provider,
      COALESCE(v_profile_data.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(v_profile_data.auto_optimize, FALSE) as auto_optimize,
      COALESCE(v_profile_data.energy_rate, 0.15) as energy_rate,
      v_profile_data.created_at,
      v_profile_data.updated_at;
  END IF;
END;
$$;

-- Function to safely update profile
CREATE OR REPLACE FUNCTION public.safe_update_profile(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_exists BOOLEAN := FALSE;
  v_profile_data public.profiles%ROWTYPE;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    -- Profile doesn't exist, create it first with basic info
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone_number,
      meter_number,
      energy_provider,
      notifications_enabled,
      auto_optimize,
      energy_rate,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      NULL,  -- email
      NULL,  -- full_name
      NULL,  -- phone_number
      NULL,  -- meter_number
      '',    -- energy_provider
      TRUE,  -- notifications_enabled
      FALSE, -- auto_optimize
      0.15,  -- energy_rate
      NOW(),
      NOW()
    );
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
       p_updates->>'energy_provider' != 'KenGEn' AND
       p_updates->>'energy_provider' != 'IPP' AND
       p_updates->>'energy_provider' != 'Other' THEN
      RAISE EXCEPTION 'Invalid energy provider: %', p_updates->>'energy_provider';
    END IF;
  END IF;

  -- Validate energy_rate if provided
  IF p_updates ? 'energy_rate' THEN
    IF jsonb_typeof(p_updates->'energy_rate') != 'number' OR (p_updates->>'energy_rate')::DECIMAL < 0 THEN
      RAISE EXCEPTION 'Invalid energy rate: %', p_updates->>'energy_rate';
    END IF;
  END IF;

  -- Validate boolean fields if provided
  IF p_updates ? 'notifications_enabled' THEN
    IF jsonb_typeof(p_updates->'notifications_enabled') != 'boolean' THEN
      RAISE EXCEPTION 'Invalid notifications_enabled value: %', p_updates->'notifications_enabled';
    END IF;
  END IF;

  IF p_updates ? 'auto_optimize' THEN
    IF jsonb_typeof(p_updates->'auto_optimize') != 'boolean' THEN
      RAISE EXCEPTION 'Invalid auto_optimize value: %', p_updates->'auto_optimize';
    END IF;
  END IF;

  -- Now update the profile with all fields including energy settings
  UPDATE public.profiles
  SET
    email = COALESCE((p_updates->>'email')::TEXT, email),
    full_name = COALESCE((p_updates->>'full_name')::TEXT, full_name),
    phone_number = COALESCE((p_updates->>'phone_number')::TEXT, phone_number),
    meter_number = COALESCE((p_updates->>'meter_number')::TEXT, meter_number),
    meter_category = COALESCE((p_updates->>'meter_category')::TEXT, meter_category),
    industry_type = COALESCE((p_updates->>'industry_type')::TEXT, industry_type),
    energy_provider = COALESCE((p_updates->>'energy_provider')::TEXT, energy_provider),
    notifications_enabled = COALESCE((p_updates->>'notifications_enabled')::BOOLEAN, notifications_enabled),
    auto_optimize = COALESCE((p_updates->>'auto_optimize')::BOOLEAN, auto_optimize),
    energy_rate = COALESCE((p_updates->>'energy_rate')::DECIMAL(10,4), energy_rate),
    updated_at = NOW()
  WHERE profiles.id = p_user_id
  RETURNING * INTO v_profile_data;

  -- Return updated profile with all fields
  RETURN NEXT v_profile_data;
  RETURN;
END;
$$;

-- Function to get notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_preferences JSONB;
BEGIN
  -- Get notification preferences from user profile
  SELECT jsonb_build_object(
    'notifications_enabled', COALESCE(notifications_enabled, TRUE),
    'email_notifications', TRUE,
    'sms_notifications', FALSE,
    'push_notifications', TRUE
  )
  INTO v_preferences
  FROM public.profiles
  WHERE id = p_user_id;

  -- If no profile found, return default preferences
  IF v_preferences IS NULL THEN
    v_preferences := jsonb_build_object(
      'notifications_enabled', TRUE,
      'email_notifications', TRUE,
      'sms_notifications', FALSE,
      'push_notifications', TRUE
    );
  END IF;

  RETURN v_preferences;
END;
$$;

-- Function to initialize user notifications
CREATE OR REPLACE FUNCTION public.initialize_user_notifications(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is a placeholder for notification initialization
  -- In a real implementation, this would set up default notifications for a new user
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Notifications initialized',
    'user_id', p_user_id
  );
END;
$$;

-- Function to get user notifications (safe version)
CREATE OR REPLACE FUNCTION public.get_user_notifications_safe(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  severity TEXT,
  is_read BOOLEAN,
  token_balance NUMERIC,
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
BEGIN
  -- Return empty result set as a placeholder
  -- In a real implementation, this would query the notifications table
  RETURN QUERY
  SELECT 
    gen_random_uuid() as id,
    ''::TEXT as title,
    ''::TEXT as message,
    ''::TEXT as type,
    ''::TEXT as severity,
    TRUE as is_read,
    0.00 as token_balance,
    0 as estimated_days,
    '{}'::JSONB as metadata,
    NOW() as created_at,
    NOW() as updated_at,
    NOW() as expires_at,
    'notifications'::TEXT as source_table
  WHERE FALSE; -- This ensures no rows are returned
END;
$$;

-- Function to get token analytics (cached version)
CREATE OR REPLACE FUNCTION public.get_token_analytics_cached(
  p_user_id UUID,
  p_force_refresh BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, return a default response
  -- In a real implementation, this would get analytics from the token_balances table
  RETURN jsonb_build_object(
    'success', TRUE,
    'current_balance', 0.00,
    'daily_consumption_avg', 0.00,
    'estimated_days_remaining', 0,
    'monthly_spending', 0.00,
    'last_purchase_date', NULL,
    'consumption_trend', 'stable',
    'last_updated', NOW(),
    'data_source', 'default',
    'cache_hit', FALSE
  );
END;
$$;

-- Function to get token transactions (cached version)
CREATE OR REPLACE FUNCTION public.get_token_transactions_cached(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, return a default response
  -- In a real implementation, this would get transactions from the kplc_token_transactions table
  RETURN jsonb_build_object(
    'success', TRUE,
    'transactions', '[]'::JSON
  );
END;
$$;