-- Create function to safely check if notifications exist and get count
CREATE OR REPLACE FUNCTION public.check_notifications_status(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notifications_table_exists BOOLEAN := FALSE;
  v_ai_alerts_table_exists BOOLEAN := FALSE;
  v_total_count INTEGER := 0;
  v_unread_count INTEGER := 0;
  v_has_notifications BOOLEAN := FALSE;
  v_last_notification_date TIMESTAMP WITH TIME ZONE := NULL;
  v_notification_types JSONB := '[]';
BEGIN
  -- Check if notifications table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) INTO v_notifications_table_exists;
  
  -- Check if ai_alerts table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_alerts'
  ) INTO v_ai_alerts_table_exists;
  
  -- If notifications table exists, get data from it
  IF v_notifications_table_exists THEN
    BEGIN
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_read = FALSE),
        MAX(created_at),
        COALESCE(jsonb_agg(DISTINCT type) FILTER (WHERE type IS NOT NULL), '[]')
      INTO v_total_count, v_unread_count, v_last_notification_date, v_notification_types
      FROM public.notifications 
      WHERE user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW());
    EXCEPTION WHEN OTHERS THEN
      -- If there's an error accessing notifications table, continue with defaults
      v_total_count := 0;
      v_unread_count := 0;
    END;
  END IF;
  
  -- If no notifications found and ai_alerts table exists, check there as fallback
  IF v_total_count = 0 AND v_ai_alerts_table_exists THEN
    BEGIN
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_read = FALSE),
        MAX(created_at),
        COALESCE(jsonb_agg(DISTINCT alert_type) FILTER (WHERE alert_type IS NOT NULL), '[]')
      INTO v_total_count, v_unread_count, v_last_notification_date, v_notification_types
      FROM public.ai_alerts 
      WHERE user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW());
    EXCEPTION WHEN OTHERS THEN
      -- If there's an error accessing ai_alerts table, continue with defaults
      v_total_count := 0;
      v_unread_count := 0;
    END;
  END IF;
  
  -- Determine if user has any notifications
  v_has_notifications := v_total_count > 0;
  
  -- Return comprehensive status
  RETURN jsonb_build_object(
    'has_notifications', v_has_notifications,
    'total_count', v_total_count,
    'unread_count', v_unread_count,
    'last_notification_date', v_last_notification_date,
    'notification_types', v_notification_types,
    'notifications_table_exists', v_notifications_table_exists,
    'ai_alerts_table_exists', v_ai_alerts_table_exists,
    'status', CASE 
      WHEN v_total_count = 0 THEN 'empty'
      WHEN v_unread_count = 0 THEN 'all_read'
      ELSE 'has_unread'
    END
  );
END;
$$;

-- Create function to safely get notifications with proper error handling
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

-- Create function to initialize notifications for new users
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
  -- Ensure notifications table exists
  PERFORM public.ensure_notifications_table();
  
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

-- Create function to check if user needs notification initialization
CREATE OR REPLACE FUNCTION public.check_user_notification_initialization(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_any_notifications BOOLEAN := FALSE;
  v_user_created_recently BOOLEAN := FALSE;
BEGIN
  -- Check if user has any notifications at all
  SELECT EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.ai_alerts WHERE user_id = p_user_id
  ) INTO v_has_any_notifications;
  
  -- Check if user was created recently (within last 24 hours)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND created_at > NOW() - INTERVAL '24 hours'
  ) INTO v_user_created_recently;
  
  -- User needs initialization if they have no notifications and were created recently
  RETURN NOT v_has_any_notifications AND v_user_created_recently;
END;
$$;

-- Create function to get notification preferences/settings
CREATE OR REPLACE FUNCTION public.get_notification_preferences(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_has_meter BOOLEAN := FALSE;
  v_preferences JSONB;
BEGIN
  -- Get user profile data
  SELECT meter_number, meter_category, phone_number, email
  INTO v_profile_data
  FROM public.profiles
  WHERE id = p_user_id;
  
  v_has_meter := v_profile_data.meter_number IS NOT NULL;
  
  -- Build preferences based on user setup
  v_preferences := jsonb_build_object(
    'token_alerts', jsonb_build_object(
      'enabled', v_has_meter,
      'description', 'Get notified when your token balance is low',
      'available', v_has_meter,
      'setup_required', NOT v_has_meter
    ),
    'usage_alerts', jsonb_build_object(
      'enabled', v_has_meter,
      'description', 'Receive alerts for high energy usage and efficiency tips',
      'available', v_has_meter,
      'setup_required', NOT v_has_meter
    ),
    'bill_reminders', jsonb_build_object(
      'enabled', true,
      'description', 'Get reminders for upcoming bill payments',
      'available', true,
      'setup_required', false
    ),
    'system_updates', jsonb_build_object(
      'enabled', true,
      'description', 'Receive important system updates and new features',
      'available', true,
      'setup_required', false
    ),
    'purchase_confirmations', jsonb_build_object(
      'enabled', v_has_meter,
      'description', 'Get confirmation notifications for token purchases',
      'available', v_has_meter,
      'setup_required', NOT v_has_meter
    )
  );
  
  RETURN jsonb_build_object(
    'preferences', v_preferences,
    'has_meter', v_has_meter,
    'meter_category', v_profile_data.meter_category,
    'contact_methods', jsonb_build_object(
      'app_notifications', true,
      'email', v_profile_data.email IS NOT NULL,
      'sms', v_profile_data.phone_number IS NOT NULL
    ),
    'setup_status', jsonb_build_object(
      'meter_connected', v_has_meter,
      'profile_complete', v_profile_data.phone_number IS NOT NULL OR v_profile_data.email IS NOT NULL,
      'notifications_active', v_has_meter
    )
  );
END;
$$;