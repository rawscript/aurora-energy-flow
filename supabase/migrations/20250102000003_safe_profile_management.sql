-- Create function to safely ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_meter_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_exists BOOLEAN := FALSE;
  v_profile_data RECORD;
  v_created BOOLEAN := FALSE;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    -- Profile exists, get current data
    SELECT * INTO v_profile_data
    FROM public.profiles 
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'created', false,
      'profile_exists', true,
      'profile', row_to_json(v_profile_data),
      'message', 'Profile already exists'
    );
  ELSE
    -- Profile doesn't exist, create it
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        meter_number,
        created_at,
        updated_at
      )
      VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_meter_number,
        NOW(),
        NOW()
      )
      RETURNING * INTO v_profile_data;
      
      v_created := TRUE;
      
    EXCEPTION WHEN unique_violation THEN
      -- Handle race condition - profile was created by another process
      SELECT * INTO v_profile_data
      FROM public.profiles 
      WHERE id = p_user_id;
      
      v_created := FALSE;
    END;
    
    RETURN jsonb_build_object(
      'success', true,
      'created', v_created,
      'profile_exists', true,
      'profile', row_to_json(v_profile_data),
      'message', CASE 
        WHEN v_created THEN 'Profile created successfully'
        ELSE 'Profile already existed (race condition handled)'
      END
    );
  END IF;
END;
$$;

-- Create function to safely get or create profile
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
        created_at,
        updated_at
      )
      VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_meter_number,
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
      v_profile_data.created_at,
      v_profile_data.updated_at;
  END IF;
END;
$$;

-- Create function to safely update profile
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
    PERFORM public.ensure_user_profile(p_user_id);
  END IF;

  -- Now update the profile
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

  -- Return updated profile
  RETURN NEXT v_profile_data;
  RETURN;
END;
$$;

-- Create function to check profile status
CREATE OR REPLACE FUNCTION public.check_profile_status(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_profile_exists BOOLEAN := FALSE;
  v_has_meter BOOLEAN := FALSE;
  v_profile_complete BOOLEAN := FALSE;
BEGIN
  -- Check if profile exists and get data
  SELECT * INTO v_profile_data
  FROM public.profiles 
  WHERE id = p_user_id;
  
  v_profile_exists := FOUND;
  
  IF v_profile_exists THEN
    v_has_meter := v_profile_data.meter_number IS NOT NULL;
    v_profile_complete := (
      v_profile_data.full_name IS NOT NULL AND
      (v_profile_data.phone_number IS NOT NULL OR v_profile_data.email IS NOT NULL)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'profile_exists', v_profile_exists,
    'has_meter', v_has_meter,
    'profile_complete', v_profile_complete,
    'profile_data', CASE 
      WHEN v_profile_exists THEN row_to_json(v_profile_data)
      ELSE NULL
    END,
    'setup_required', NOT v_profile_exists OR NOT v_has_meter,
    'recommendations', CASE
      WHEN NOT v_profile_exists THEN jsonb_build_array('Create profile')
      WHEN NOT v_has_meter THEN jsonb_build_array('Setup smart meter')
      WHEN NOT v_profile_complete THEN jsonb_build_array('Complete profile information')
      ELSE jsonb_build_array('Profile setup complete')
    END
  );
END;
$$;