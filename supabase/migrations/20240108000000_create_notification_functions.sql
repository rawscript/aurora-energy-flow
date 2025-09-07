-- Create notification functions for Aurora Energy Flow

-- Function to check if user needs notification initialization
CREATE OR REPLACE FUNCTION check_user_notification_initialization(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_count INTEGER;
BEGIN
    -- Check if user has any notifications
    SELECT COUNT(*) INTO notification_count
    FROM notifications
    WHERE user_id = p_user_id;
    
    -- Return true if user needs initialization (no notifications exist)
    RETURN notification_count = 0;
END;
$$;

-- Function to initialize notifications for a new user
CREATE OR REPLACE FUNCTION initialize_user_notifications(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create a welcome notification for new users
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        severity,
        is_read,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        'Welcome to Aurora Energy Flow! 🌟',
        'Get started by connecting your smart meter or solar inverter to track your energy usage in real-time.',
        'welcome',
        'low',
        false,
        NOW(),
        NOW()
    );
    
    -- Create a setup reminder notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        severity,
        is_read,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        'Set up your energy provider',
        'Choose your energy provider (KPLC, Solar, etc.) in Settings to get personalized insights.',
        'setup_required',
        'medium',
        false,
        NOW(),
        NOW()
    );
END;
$$;

-- Function to safely get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications_safe(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    message TEXT,
    type TEXT,
    severity TEXT,
    is_read BOOLEAN,
    token_balance DECIMAL,
    estimated_days INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    source_table TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user needs initialization first
    IF check_user_notification_initialization(p_user_id) THEN
        PERFORM initialize_user_notifications(p_user_id);
    END IF;
    
    -- Return notifications based on parameters
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
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR NOT n.is_read)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to get notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS TABLE(
    token_low BOOLEAN,
    token_depleted BOOLEAN,
    power_restored BOOLEAN,
    energy_alert BOOLEAN,
    low_balance_alert BOOLEAN,
    email_enabled BOOLEAN,
    push_enabled BOOLEAN,
    sms_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((p.notification_preferences->>'token_low')::BOOLEAN, true) as token_low,
        COALESCE((p.notification_preferences->>'token_depleted')::BOOLEAN, true) as token_depleted,
        COALESCE((p.notification_preferences->>'power_restored')::BOOLEAN, true) as power_restored,
        COALESCE((p.notification_preferences->>'energy_alert')::BOOLEAN, true) as energy_alert,
        COALESCE((p.notification_preferences->>'low_balance_alert')::BOOLEAN, true) as low_balance_alert,
        COALESCE((p.notification_preferences->>'email_enabled')::BOOLEAN, true) as email_enabled,
        COALESCE((p.notification_preferences->>'push_enabled')::BOOLEAN, true) as push_enabled,
        COALESCE((p.notification_preferences->>'sms_enabled')::BOOLEAN, false) as sms_enabled
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$;

-- Function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_user_id UUID,
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true, updated_at = NOW()
    WHERE id = p_notification_id 
    AND user_id = p_user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count > 0;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true, updated_at = NOW()
    WHERE user_id = p_user_id 
    AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$;

-- Function to delete a notification
CREATE OR REPLACE FUNCTION delete_notification(
    p_user_id UUID,
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE id = p_notification_id 
    AND user_id = p_user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$;

-- Function to delete all read notifications
CREATE OR REPLACE FUNCTION delete_read_notifications(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE user_id = p_user_id 
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to create a new notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_severity TEXT DEFAULT 'low',
    p_token_balance DECIMAL DEFAULT NULL,
    p_estimated_days INTEGER DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        severity,
        token_balance,
        estimated_days,
        metadata,
        expires_at,
        is_read,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_severity,
        p_token_balance,
        p_estimated_days,
        p_metadata,
        p_expires_at,
        false,
        NOW(),
        NOW()
    ) RETURNING id INTO new_notification_id;
    
    RETURN new_notification_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_notification_initialization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications_safe(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_read_notifications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, INTEGER, JSONB, TIMESTAMPTZ) TO authenticated;

-- Create RLS policies for notifications table if they don't exist
DO $$
BEGIN
    -- Enable RLS on notifications table
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
    
    -- Create new policies
    CREATE POLICY "Users can view their own notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own notifications" ON notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own notifications" ON notifications
        FOR DELETE USING (auth.uid() = user_id);
        
EXCEPTION
    WHEN duplicate_object THEN
        -- Policies already exist, ignore
        NULL;
END
$$;