-- Fix for the get_notification_preferences function conflict
-- First, drop the existing function
DROP FUNCTION IF EXISTS public.get_notification_preferences(UUID);

-- Then recreate it with the new signature
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