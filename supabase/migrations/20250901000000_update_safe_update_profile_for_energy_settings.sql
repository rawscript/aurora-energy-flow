-- Update the safe_update_profile function to handle energy settings
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
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_exists BOOLEAN := FALSE;
  v_profile_data RECORD;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    -- Profile doesn't exist, create it first with basic info
    PERFORM public.ensure_user_profile(p_user_id);
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
    v_profile_data.created_at,
    v_profile_data.updated_at;
END;
$$;
