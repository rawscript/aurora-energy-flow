-- Create the get_user_notifications_safe function
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
