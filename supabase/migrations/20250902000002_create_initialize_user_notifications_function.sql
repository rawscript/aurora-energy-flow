-- Create the initialize_user_notifications function
CREATE OR REPLACE FUNCTION public.initialize_user_notifications(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_welcome_notification_id UUID;
  v_setup_notification_id UUID;
BEGIN
  -- Get user profile information
  SELECT full_name, meter_number, created_at
  INTO v_profile_data
  FROM public.profiles
  WHERE id = p_user_id;

  -- Create welcome notification
  v_welcome_notification_id := public.create_notification(
    p_user_id,
    'Welcome to Aurora Energy Flow! 🌟',
    CASE
      WHEN v_profile_data.full_name IS NOT NULL
      THEN 'Hello ' || v_profile_data.full_name || '! Welcome to your smart energy management dashboard. Get real-time insights, manage your KPLC tokens, and optimize your energy usage.'
      ELSE 'Welcome to your smart energy management dashboard! Get real-time insights, manage your KPLC tokens, and optimize your energy usage.'
    END,
    'welcome',
    'low',
    NULL,
    NULL,
    jsonb_build_object(
      'is_welcome', true,
      'user_name', v_profile_data.full_name,
      'signup_date', v_profile_data.created_at
    ),
    NOW() + INTERVAL '7 days' -- Expires in 7 days
  );

  -- Create setup notification if no meter is connected
  IF v_profile_data.meter_number IS NULL THEN
    v_setup_notification_id := public.create_notification(
      p_user_id,
      'Set Up Your Smart Meter 🔌',
      'Connect your Kenya Power smart meter to start receiving real-time energy data, token alerts, and personalized insights. Go to Settings > Meter Setup to get started.',
      'setup_required',
      'medium',
      NULL,
      NULL,
      jsonb_build_object(
        'action_required', 'meter_setup',
        'setup_url', '#settings'
      ),
      NOW() + INTERVAL '30 days' -- Expires in 30 days
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'welcome_notification_id', v_welcome_notification_id,
    'setup_notification_id', v_setup_notification_id,
    'message', 'User notifications initialized successfully'
  );
END;
$$;
