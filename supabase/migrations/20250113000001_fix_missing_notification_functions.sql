-- Fix missing notification functions
-- Migration: 20250113000001_fix_missing_notification_functions.sql

-- Check if notifications table exists and add missing columns if needed
DO $$ 
BEGIN
    -- Create notifications table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
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
        RAISE NOTICE 'Created notifications table';
    ELSE
        RAISE NOTICE 'Notifications table already exists';
    END IF;

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'info';
        RAISE NOTICE 'Added type column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'severity') THEN
        ALTER TABLE public.notifications ADD COLUMN severity TEXT NOT NULL DEFAULT 'low';
        RAISE NOTICE 'Added severity column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added is_read column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'token_balance') THEN
        ALTER TABLE public.notifications ADD COLUMN token_balance DECIMAL(10,2) NULL;
        RAISE NOTICE 'Added token_balance column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'estimated_days') THEN
        ALTER TABLE public.notifications ADD COLUMN estimated_days INTEGER NULL;
        RAISE NOTICE 'Added estimated_days column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB NULL;
        RAISE NOTICE 'Added metadata column to notifications';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
        ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added expires_at column to notifications';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable RLS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'notifications' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on notifications table';
    END IF;
END $$;

-- Create RLS policies (safe creation)
DO $$ 
BEGIN
    -- Policy for SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for notifications';
    END IF;
    
    -- Policy for INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can insert their own notifications') THEN
        CREATE POLICY "Users can insert their own notifications" ON public.notifications
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for notifications';
    END IF;
    
    -- Policy for UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications" ON public.notifications
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for notifications';
    END IF;
    
    -- Policy for DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
        CREATE POLICY "Users can delete their own notifications" ON public.notifications
            FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created DELETE policy for notifications';
    END IF;
END $$;

-- Drop and recreate the get_user_notifications_safe function
DROP FUNCTION IF EXISTS public.get_user_notifications_safe(UUID, INTEGER, BOOLEAN);

CREATE FUNCTION public.get_user_notifications_safe(
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

-- Drop and recreate the get_notification_preferences function
DROP FUNCTION IF EXISTS public.get_notification_preferences(UUID);

CREATE FUNCTION public.get_notification_preferences(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_preferences JSONB;
BEGIN
    -- Try to get preferences from profiles table
    SELECT notification_preferences INTO v_preferences
    FROM public.profiles
    WHERE user_id = p_user_id;
    
    -- If no preferences found, return defaults
    IF v_preferences IS NULL THEN
        v_preferences := jsonb_build_object(
            'email_notifications', true,
            'sms_notifications', true,
            'push_notifications', true,
            'low_balance_alerts', true,
            'token_purchase_confirmations', true,
            'system_updates', true,
            'marketing_communications', false
        );
    END IF;
    
    RETURN v_preferences;
END;
$$;

-- Drop and recreate the initialize_user_notifications function
DROP FUNCTION IF EXISTS public.initialize_user_notifications(UUID);

CREATE FUNCTION public.initialize_user_notifications(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_exists BOOLEAN := FALSE;
    v_notification_id UUID;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    -- If profile doesn't exist, create it first
    IF NOT v_profile_exists THEN
        INSERT INTO public.profiles (user_id, created_at, updated_at)
        VALUES (p_user_id, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    -- Create welcome notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        severity,
        metadata
    )
    VALUES (
        p_user_id,
        'Welcome to Aurora Energy Flow!',
        'Your account has been set up successfully. Start managing your energy consumption today.',
        'welcome',
        'low',
        jsonb_build_object(
            'is_welcome', true,
            'setup_complete', true
        )
    )
    RETURNING id INTO v_notification_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User notifications initialized successfully',
        'welcome_notification_id', v_notification_id
    );
END;
$$;

-- Drop and recreate the check_user_notification_initialization function
DROP FUNCTION IF EXISTS public.check_user_notification_initialization(UUID);

CREATE FUNCTION public.check_user_notification_initialization(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_exists BOOLEAN := FALSE;
    v_notification_count INTEGER := 0;
BEGIN
    -- Check if user profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = p_user_id
    ) INTO v_profile_exists;
    
    -- Count user notifications
    SELECT COUNT(*) INTO v_notification_count
    FROM public.notifications
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
        'initialized', v_profile_exists,
        'profile_exists', v_profile_exists,
        'notification_count', v_notification_count,
        'has_notifications', v_notification_count > 0
    );
END;
$$;

-- Grant permissions to authenticated users
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_notification_initialization TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_user_notifications_safe IS 'Safely retrieves user notifications with fallback to ai_alerts table';
COMMENT ON FUNCTION public.get_notification_preferences IS 'Gets user notification preferences with sensible defaults';
COMMENT ON FUNCTION public.initialize_user_notifications IS 'Initializes notification system for new users';
COMMENT ON FUNCTION public.check_user_notification_initialization IS 'Checks if user notification system is properly initialized';

-- Final status check
DO $$ 
DECLARE
    notifications_count INTEGER;
    functions_count INTEGER;
BEGIN
    -- Count existing notifications
    SELECT COUNT(*) FROM public.notifications INTO notifications_count;
    
    -- Count notification functions
    SELECT COUNT(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
    AND p.proname LIKE '%notification%' INTO functions_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== NOTIFICATION FUNCTIONS MIGRATION COMPLETED ===';
    RAISE NOTICE 'Notifications table: % existing records', notifications_count;
    RAISE NOTICE 'Notification functions: % functions created', functions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'All notification functions are now available!';
END $$;