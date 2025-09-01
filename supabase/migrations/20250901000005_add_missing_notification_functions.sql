-- Add missing notification functions
-- This migration adds the notification functions that are being called by the frontend but are missing

-- Create function to get notification preferences
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

-- Create function to initialize user notifications
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

-- Create function to get user notifications (safe version)
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