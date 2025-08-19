-- Create function to check and create notifications table if it doesn't exist
CREATE OR REPLACE FUNCTION public.ensure_notifications_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if notifications table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    -- Create notifications table if it doesn't exist
    CREATE TABLE public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      severity TEXT NOT NULL DEFAULT 'low',
      is_read BOOLEAN NOT NULL DEFAULT false,
      token_balance DECIMAL(10,2) NULL,
      estimated_days INTEGER NULL,
      metadata JSONB NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NULL
    );

    -- Create indexes
    CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
    CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
    CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
    CREATE INDEX idx_notifications_type ON public.notifications(type);

    -- Enable RLS
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own notifications" ON public.notifications
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own notifications" ON public.notifications
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own notifications" ON public.notifications
      FOR DELETE USING (auth.uid() = user_id);

    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create function to get user notifications with fallback
CREATE OR REPLACE FUNCTION public.get_user_notifications(
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
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure notifications table exists
  PERFORM public.ensure_notifications_table();
  
  -- Try to get notifications from notifications table
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
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
      n.expires_at
    FROM public.notifications n
    WHERE n.user_id = p_user_id
      AND (NOT p_unread_only OR n.is_read = FALSE)
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit;
  ELSE
    -- Fallback to ai_alerts table
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
      a.expires_at
    FROM public.ai_alerts a
    WHERE a.user_id = p_user_id
      AND (NOT p_unread_only OR a.is_read = FALSE)
      AND (a.expires_at IS NULL OR a.expires_at > NOW())
    ORDER BY a.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- Create function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_severity TEXT DEFAULT 'low',
  p_token_balance DECIMAL(10,2) DEFAULT NULL,
  p_estimated_days INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Ensure notifications table exists
  PERFORM public.ensure_notifications_table();
  
  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    severity,
    token_balance,
    estimated_days,
    metadata,
    expires_at
  )
  VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_severity,
    p_token_balance,
    p_estimated_days,
    p_metadata,
    p_expires_at
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_user_id UUID,
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Try notifications table first
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    UPDATE public.notifications 
    SET is_read = TRUE, updated_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Fallback to ai_alerts table
  UPDATE public.ai_alerts 
  SET is_read = TRUE
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count > 0;
END;
$$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  -- Try notifications table first
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    UPDATE public.notifications 
    SET is_read = TRUE, updated_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_updated_count := v_updated_count + v_temp_count;
  END IF;
  
  -- Also update ai_alerts table
  UPDATE public.ai_alerts 
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_updated_count := v_updated_count + v_temp_count;
  
  RETURN v_updated_count;
END;
$$;

-- Create function to delete notification
CREATE OR REPLACE FUNCTION public.delete_notification(
  p_user_id UUID,
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Try notifications table first
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    DELETE FROM public.notifications 
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count > 0 THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Fallback to ai_alerts table
  DELETE FROM public.ai_alerts 
  WHERE id = p_notification_id AND user_id = p_user_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Create function to delete all read notifications
CREATE OR REPLACE FUNCTION public.delete_read_notifications(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  -- Try notifications table first
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    DELETE FROM public.notifications 
    WHERE user_id = p_user_id AND is_read = TRUE;
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
  END IF;
  
  -- Also delete from ai_alerts table
  DELETE FROM public.ai_alerts 
  WHERE user_id = p_user_id AND is_read = TRUE;
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_temp_count;
  
  RETURN v_deleted_count;
END;
$$;

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_temp_count INTEGER;
BEGIN
  -- Clean up expired notifications
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    DELETE FROM public.notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
  END IF;
  
  -- Clean up expired ai_alerts
  DELETE FROM public.ai_alerts 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_temp_count;
  
  RETURN v_deleted_count;
END;
$$;

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION public.get_notification_stats(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count INTEGER := 0;
  v_unread_count INTEGER := 0;
  v_by_type JSONB := '{}';
  v_by_severity JSONB := '{}';
BEGIN
  -- Get stats from notifications table
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE is_read = FALSE)
    INTO v_total_count, v_unread_count
    FROM public.notifications 
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW());
    
    -- Get counts by type
    SELECT jsonb_object_agg(type, count)
    INTO v_by_type
    FROM (
      SELECT type, COUNT(*) as count
      FROM public.notifications 
      WHERE user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY type
    ) t;
    
    -- Get counts by severity
    SELECT jsonb_object_agg(severity, count)
    INTO v_by_severity
    FROM (
      SELECT severity, COUNT(*) as count
      FROM public.notifications 
      WHERE user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY severity
    ) s;
  ELSE
    -- Fallback to ai_alerts
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE is_read = FALSE)
    INTO v_total_count, v_unread_count
    FROM public.ai_alerts 
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW());
  END IF;
  
  RETURN jsonb_build_object(
    'total_count', v_total_count,
    'unread_count', v_unread_count,
    'by_type', COALESCE(v_by_type, '{}'),
    'by_severity', COALESCE(v_by_severity, '{}')
  );
END;
$$;

-- Update the purchase_tokens function to use the new notification system
CREATE OR REPLACE FUNCTION public.purchase_tokens(
  p_user_id UUID,
  p_meter_number TEXT,
  p_amount DECIMAL(10,2),
  p_payment_method TEXT DEFAULT 'M-PESA',
  p_vendor TEXT DEFAULT 'M-PESA'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_token_code TEXT;
  v_reference_number TEXT;
  v_balance_before DECIMAL(10,2);
  v_balance_after DECIMAL(10,2);
  v_token_units DECIMAL(10,2);
  v_notification_id UUID;
BEGIN
  -- Generate token code (mock implementation)
  v_token_code := LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0') || '-' ||
                  LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0') || '-' ||
                  LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0') || '-' ||
                  LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
  
  -- Generate reference number
  v_reference_number := 'TKN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  
  -- Calculate token units (1 KSh = 1 token unit for simplicity)
  v_token_units := p_amount;
  
  -- Get current balance
  SELECT current_balance INTO v_balance_before
  FROM public.token_balances 
  WHERE user_id = p_user_id AND meter_number = p_meter_number;
  
  IF v_balance_before IS NULL THEN
    v_balance_before := 0;
  END IF;
  
  -- Update balance
  v_balance_after := public.update_token_balance(p_user_id, p_meter_number, p_amount, 'purchase');
  
  -- Create transaction record
  INSERT INTO public.kplc_token_transactions (
    user_id,
    meter_number,
    transaction_type,
    amount,
    token_units,
    token_code,
    reference_number,
    vendor,
    payment_method,
    balance_before,
    balance_after,
    status
  )
  VALUES (
    p_user_id,
    p_meter_number,
    'purchase',
    p_amount,
    v_token_units,
    v_token_code,
    v_reference_number,
    p_vendor,
    p_payment_method,
    v_balance_before,
    v_balance_after,
    'completed'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Create success notification using the new function
  v_notification_id := public.create_notification(
    p_user_id,
    'Token Purchase Successful',
    'Successfully purchased KSh ' || p_amount || ' worth of tokens for meter ' || p_meter_number,
    'token_purchase',
    'low',
    v_balance_after,
    NULL,
    jsonb_build_object(
      'token_code', v_token_code,
      'reference_number', v_reference_number,
      'amount', p_amount,
      'meter_number', p_meter_number,
      'transaction_id', v_transaction_id
    )
  );
  
  -- Return transaction details
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'notification_id', v_notification_id,
    'token_code', v_token_code,
    'reference_number', v_reference_number,
    'amount', p_amount,
    'token_units', v_token_units,
    'balance_after', v_balance_after,
    'message', 'Token purchase successful'
  );
END;
$$;