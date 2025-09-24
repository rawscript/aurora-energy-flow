-- Remove KenGEn from all database function validations and constraints

-- Update the comprehensive fixes migration to remove KenGEn
CREATE OR REPLACE FUNCTION public.safe_update_profile(
  p_user_id UUID,
  p_updates JSONB
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
  kplc_meter_type TEXT,
  token_balance DECIMAL(10,2),
  last_token_purchase TIMESTAMP WITH TIME ZONE,
  token_purchase_amount DECIMAL(10,2),
  low_balance_threshold DECIMAL(10,2),
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_settings_history JSONB;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.phone_number,
      p.meter_number,
      p.meter_category,
      p.industry_type,
      COALESCE(p.energy_provider, '') as energy_provider,
      COALESCE(p.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(p.auto_optimize, FALSE) as auto_optimize,
      COALESCE(p.energy_rate, 0.15) as energy_rate,
      p.kplc_meter_type,
      tb.current_balance as token_balance,
      p.last_token_purchase,
      p.token_purchase_amount,
      p.low_balance_threshold,
      p.notification_preferences,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
    WHERE p.id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' NOT IN ('', 'KPLC', 'Solar', 'IPP', 'Other') THEN
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

  -- Get current profile and settings version
  SELECT *, COALESCE(
    (SELECT MAX(version) FROM public.energy_settings_history WHERE user_id = p_user_id),
    0
  ) as current_version
  INTO v_profile_data, v_current_version
  FROM public.profiles
  WHERE id = p_user_id;

  -- Create settings history record if energy-related fields are being updated
  IF p_updates ? 'energy_provider' OR
     p_updates ? 'energy_rate' OR
     p_updates ? 'auto_optimize' OR
     p_updates ? 'notifications_enabled' THEN

    v_new_version := v_current_version + 1;

    -- Build settings object with current values (before update)
    v_settings_history := jsonb_build_object(
      'energy_provider', v_profile_data.energy_provider,
      'energy_rate', v_profile_data.energy_rate,
      'auto_optimize', v_profile_data.auto_optimize,
      'notifications_enabled', v_profile_data.notifications_enabled
    );

    -- Add to history before updating
    INSERT INTO public.energy_settings_history (
      user_id,
      version,
      settings,
      changed_by,
      changed_at
    )
    VALUES (
      p_user_id,
      v_new_version,
      v_settings_history,
      'user',
      NOW()
    );
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
    kplc_meter_type = COALESCE((p_updates->>'kplc_meter_type')::TEXT, kplc_meter_type),
    notification_preferences = COALESCE(
      p_updates->'notification_preferences',
      notification_preferences
    ),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile_data;

  -- If notification preferences were updated, create a system notification
  IF p_updates ? 'notification_preferences' THEN
    BEGIN
      PERFORM public.create_notification_improved(
        p_user_id,
        'Notification Preferences Updated',
        'Your notification preferences have been updated.',
        'settings_change',
        'low',
        NULL,
        NULL,
        jsonb_build_object(
          'old_preferences', v_profile_data.notification_preferences,
          'new_preferences', p_updates->'notification_preferences'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'safe_update_profile',
        'Failed to create notification preferences update notification',
        SQLERRM,
        p_user_id,
        jsonb_build_object('updates', p_updates),
        NULL
      );
    END;
  END IF;

  -- Return updated profile with all fields
  RETURN QUERY
  SELECT
    v_profile_data.id,
    v_profile_data.email,
    v_profile_data.full_name,
    v_profile_data.phone_number,
    v_profile_data.meter_number,
    v_profile_data.meter_category,
    v_profile_data.industry_type,
    v_profile_data.energy_provider,
    v_profile_data.notifications_enabled,
    v_profile_data.auto_optimize,
    v_profile_data.energy_rate,
    v_profile_data.kplc_meter_type,
    tb.current_balance as token_balance,
    v_profile_data.last_token_purchase,
    v_profile_data.token_purchase_amount,
    v_profile_data.low_balance_threshold,
    v_profile_data.notification_preferences,
    v_profile_data.created_at,
    v_profile_data.updated_at
  FROM public.profiles p
  LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
  WHERE p.id = p_user_id;
  RETURN;
END;
$$;

-- Update the fix_profile_functions_with_energy_settings function
CREATE OR REPLACE FUNCTION public.fix_profile_functions_with_energy_settings(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the ensure_profile_columns_and_functions function
CREATE OR REPLACE FUNCTION public.ensure_profile_columns_and_functions(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the complete_fix_for_profile_and_functions function
CREATE OR REPLACE FUNCTION public.complete_fix_for_profile_and_functions(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the energy_settings function
CREATE OR REPLACE FUNCTION public.energy_settings(
  p_user_id UUID,
  p_updates JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_profile public.profiles;
BEGIN
  -- If updates provided, validate and apply them
  IF p_updates IS NOT NULL AND jsonb_typeof(p_updates) != 'null' THEN
    -- Validate energy_provider if provided
    IF p_updates ? 'energy_provider' THEN
      -- Check if it's a valid provider
      IF p_updates->>'energy_provider' != '' AND 
         p_updates->>'energy_provider' != 'KPLC' AND
         p_updates->>'energy_provider' != 'Solar' AND
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

    -- Update the profile with energy settings
    UPDATE public.profiles
    SET
      energy_provider = COALESCE((p_updates->>'energy_provider')::TEXT, energy_provider),
      notifications_enabled = COALESCE((p_updates->>'notifications_enabled')::BOOLEAN, notifications_enabled),
      auto_optimize = COALESCE((p_updates->>'auto_optimize')::BOOLEAN, auto_optimize),
      energy_rate = COALESCE((p_updates->>'energy_rate')::DECIMAL(10,4), energy_rate),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Get current profile data
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Build result object
  v_result := jsonb_build_object(
    'success', TRUE,
    'data', jsonb_build_object(
      'energy_provider', COALESCE(v_profile.energy_provider, ''),
      'notifications_enabled', COALESCE(v_profile.notifications_enabled, TRUE),
      'auto_optimize', COALESCE(v_profile.auto_optimize, FALSE),
      'energy_rate', COALESCE(v_profile.energy_rate, 0.15)
    )
  );

  RETURN v_result;
END;
$$;-- Remove KenGEn from all database function validations and constraints

-- Update the comprehensive fixes migration to remove KenGEn
CREATE OR REPLACE FUNCTION public.safe_update_profile(
  p_user_id UUID,
  p_updates JSONB
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
  kplc_meter_type TEXT,
  token_balance DECIMAL(10,2),
  last_token_purchase TIMESTAMP WITH TIME ZONE,
  token_purchase_amount DECIMAL(10,2),
  low_balance_threshold DECIMAL(10,2),
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_settings_history JSONB;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.phone_number,
      p.meter_number,
      p.meter_category,
      p.industry_type,
      COALESCE(p.energy_provider, '') as energy_provider,
      COALESCE(p.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(p.auto_optimize, FALSE) as auto_optimize,
      COALESCE(p.energy_rate, 0.15) as energy_rate,
      p.kplc_meter_type,
      tb.current_balance as token_balance,
      p.last_token_purchase,
      p.token_purchase_amount,
      p.low_balance_threshold,
      p.notification_preferences,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
    WHERE p.id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' NOT IN ('', 'KPLC', 'Solar', 'IPP', 'Other') THEN
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

  -- Get current profile and settings version
  SELECT *, COALESCE(
    (SELECT MAX(version) FROM public.energy_settings_history WHERE user_id = p_user_id),
    0
  ) as current_version
  INTO v_profile_data, v_current_version
  FROM public.profiles
  WHERE id = p_user_id;

  -- Create settings history record if energy-related fields are being updated
  IF p_updates ? 'energy_provider' OR
     p_updates ? 'energy_rate' OR
     p_updates ? 'auto_optimize' OR
     p_updates ? 'notifications_enabled' THEN

    v_new_version := v_current_version + 1;

    -- Build settings object with current values (before update)
    v_settings_history := jsonb_build_object(
      'energy_provider', v_profile_data.energy_provider,
      'energy_rate', v_profile_data.energy_rate,
      'auto_optimize', v_profile_data.auto_optimize,
      'notifications_enabled', v_profile_data.notifications_enabled
    );

    -- Add to history before updating
    INSERT INTO public.energy_settings_history (
      user_id,
      version,
      settings,
      changed_by,
      changed_at
    )
    VALUES (
      p_user_id,
      v_new_version,
      v_settings_history,
      'user',
      NOW()
    );
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
    kplc_meter_type = COALESCE((p_updates->>'kplc_meter_type')::TEXT, kplc_meter_type),
    notification_preferences = COALESCE(
      p_updates->'notification_preferences',
      notification_preferences
    ),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile_data;

  -- If notification preferences were updated, create a system notification
  IF p_updates ? 'notification_preferences' THEN
    BEGIN
      PERFORM public.create_notification_improved(
        p_user_id,
        'Notification Preferences Updated',
        'Your notification preferences have been updated.',
        'settings_change',
        'low',
        NULL,
        NULL,
        jsonb_build_object(
          'old_preferences', v_profile_data.notification_preferences,
          'new_preferences', p_updates->'notification_preferences'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'safe_update_profile',
        'Failed to create notification preferences update notification',
        SQLERRM,
        p_user_id,
        jsonb_build_object('updates', p_updates),
        NULL
      );
    END;
  END IF;

  -- Return updated profile with all fields
  RETURN QUERY
  SELECT
    v_profile_data.id,
    v_profile_data.email,
    v_profile_data.full_name,
    v_profile_data.phone_number,
    v_profile_data.meter_number,
    v_profile_data.meter_category,
    v_profile_data.industry_type,
    v_profile_data.energy_provider,
    v_profile_data.notifications_enabled,
    v_profile_data.auto_optimize,
    v_profile_data.energy_rate,
    v_profile_data.kplc_meter_type,
    tb.current_balance as token_balance,
    v_profile_data.last_token_purchase,
    v_profile_data.token_purchase_amount,
    v_profile_data.low_balance_threshold,
    v_profile_data.notification_preferences,
    v_profile_data.created_at,
    v_profile_data.updated_at
  FROM public.profiles p
  LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
  WHERE p.id = p_user_id;
  RETURN;
END;
$$;

-- Update the fix_profile_functions_with_energy_settings function
CREATE OR REPLACE FUNCTION public.fix_profile_functions_with_energy_settings(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the ensure_profile_columns_and_functions function
CREATE OR REPLACE FUNCTION public.ensure_profile_columns_and_functions(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the complete_fix_for_profile_and_functions function
CREATE OR REPLACE FUNCTION public.complete_fix_for_profile_and_functions(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data public.profiles;
BEGIN
  -- If no updates provided, just return current profile
  IF p_updates IS NULL OR jsonb_typeof(p_updates) = 'null' THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' != '' AND 
       p_updates->>'energy_provider' != 'KPLC' AND
       p_updates->>'energy_provider' != 'Solar' AND
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

-- Update the energy_settings function
CREATE OR REPLACE FUNCTION public.energy_settings(
  p_user_id UUID,
  p_updates JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_profile public.profiles;
BEGIN
  -- If updates provided, validate and apply them
  IF p_updates IS NOT NULL AND jsonb_typeof(p_updates) != 'null' THEN
    -- Validate energy_provider if provided
    IF p_updates ? 'energy_provider' THEN
      -- Check if it's a valid provider
      IF p_updates->>'energy_provider' != '' AND 
         p_updates->>'energy_provider' != 'KPLC' AND
         p_updates->>'energy_provider' != 'Solar' AND
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

    -- Update the profile with energy settings
    UPDATE public.profiles
    SET
      energy_provider = COALESCE((p_updates->>'energy_provider')::TEXT, energy_provider),
      notifications_enabled = COALESCE((p_updates->>'notifications_enabled')::BOOLEAN, notifications_enabled),
      auto_optimize = COALESCE((p_updates->>'auto_optimize')::BOOLEAN, auto_optimize),
      energy_rate = COALESCE((p_updates->>'energy_rate')::DECIMAL(10,4), energy_rate),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  -- Get current profile data
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  -- Build result object
  v_result := jsonb_build_object(
    'success', TRUE,
    'data', jsonb_build_object(
      'energy_provider', COALESCE(v_profile.energy_provider, ''),
      'notifications_enabled', COALESCE(v_profile.notifications_enabled, TRUE),
      'auto_optimize', COALESCE(v_profile.auto_optimize, FALSE),
      'energy_rate', COALESCE(v_profile.energy_rate, 0.15)
    )
  );

  RETURN v_result;
END;
$$;