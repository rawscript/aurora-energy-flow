-- Fix profile functions to properly handle energy settings
-- This migration ensures that all profile functions are correctly handling the energy settings columns

-- Update the get_or_create_profile function to properly return all columns including energy settings
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

-- Update the safe_update_profile function to handle energy settings properly
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