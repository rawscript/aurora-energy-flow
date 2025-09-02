-- Create the get_or_create_profile function
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
