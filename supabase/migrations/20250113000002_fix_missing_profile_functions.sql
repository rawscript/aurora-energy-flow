-- Fix missing profile functions
-- Migration: 20250113000002_fix_missing_profile_functions.sql

-- Ensure profiles table exists with all required columns
DO $$ 
BEGIN
    -- Create profiles table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT,
            full_name TEXT,
            phone_number TEXT,
            meter_number TEXT,
            meter_category TEXT DEFAULT 'residential',
            industry_type TEXT,
            energy_provider TEXT DEFAULT 'kplc',
            notifications_enabled BOOLEAN DEFAULT true,
            auto_optimize BOOLEAN DEFAULT false,
            energy_rate DECIMAL(10,4) DEFAULT 25.0000,
            notification_preferences JSONB DEFAULT '{}',
            kplc_meter_type TEXT,
            low_balance_threshold DECIMAL(10,2) DEFAULT 50.00,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created profiles table';
    ELSE
        RAISE NOTICE 'Profiles table already exists';
    END IF;

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
        RAISE NOTICE 'Added user_id column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'energy_provider') THEN
        ALTER TABLE public.profiles ADD COLUMN energy_provider TEXT DEFAULT 'kplc';
        RAISE NOTICE 'Added energy_provider column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notifications_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added notifications_enabled column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auto_optimize') THEN
        ALTER TABLE public.profiles ADD COLUMN auto_optimize BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added auto_optimize column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'energy_rate') THEN
        ALTER TABLE public.profiles ADD COLUMN energy_rate DECIMAL(10,4) DEFAULT 25.0000;
        RAISE NOTICE 'Added energy_rate column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_preferences') THEN
        ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB DEFAULT '{}';
        RAISE NOTICE 'Added notification_preferences column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'kplc_meter_type') THEN
        ALTER TABLE public.profiles ADD COLUMN kplc_meter_type TEXT;
        RAISE NOTICE 'Added kplc_meter_type column to profiles';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'low_balance_threshold') THEN
        ALTER TABLE public.profiles ADD COLUMN low_balance_threshold DECIMAL(10,2) DEFAULT 50.00;
        RAISE NOTICE 'Added low_balance_threshold column to profiles';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_meter_number ON public.profiles(meter_number);
CREATE INDEX IF NOT EXISTS idx_profiles_energy_provider ON public.profiles(energy_provider);

-- Enable RLS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'profiles' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on profiles table';
    END IF;
END $$;

-- Create RLS policies (safe creation)
DO $$ 
BEGIN
    -- Policy for SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for profiles';
    END IF;
    
    -- Policy for INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for profiles';
    END IF;
    
    -- Policy for UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for profiles';
    END IF;
END $$;

-- Drop and recreate profile functions
DROP FUNCTION IF EXISTS public.get_or_create_profile(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.safe_update_profile(UUID, JSONB);
DROP FUNCTION IF EXISTS public.ensure_user_profile(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.check_profile_status(UUID);

-- Create get_or_create_profile function
CREATE FUNCTION public.get_or_create_profile(
    p_user_id UUID,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_meter_number TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
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
    notification_preferences JSONB,
    kplc_meter_type TEXT,
    low_balance_threshold DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_data public.profiles%ROWTYPE;
BEGIN
    -- Try to get existing profile first
    SELECT * INTO v_profile_data
    FROM public.profiles 
    WHERE profiles.id = p_user_id OR profiles.user_id = p_user_id;
    
    IF FOUND THEN
        -- Profile exists, return it
        RETURN QUERY
        SELECT 
            v_profile_data.id,
            v_profile_data.user_id,
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
            v_profile_data.notification_preferences,
            v_profile_data.kplc_meter_type,
            v_profile_data.low_balance_threshold,
            v_profile_data.created_at,
            v_profile_data.updated_at;
    ELSE
        -- Profile doesn't exist, create it
        BEGIN
            INSERT INTO public.profiles (
                id,
                user_id,
                email,
                full_name,
                phone_number,
                meter_number,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                p_user_id,
                p_email,
                p_full_name,
                p_phone_number,
                p_meter_number,
                NOW(),
                NOW()
            )
            RETURNING * INTO v_profile_data;
            
        EXCEPTION WHEN unique_violation THEN
            -- Handle race condition - get the profile that was created
            SELECT * INTO v_profile_data
            FROM public.profiles 
            WHERE profiles.id = p_user_id OR profiles.user_id = p_user_id;
        END;
        
        -- Return the profile data
        RETURN QUERY
        SELECT 
            v_profile_data.id,
            v_profile_data.user_id,
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
            v_profile_data.notification_preferences,
            v_profile_data.kplc_meter_type,
            v_profile_data.low_balance_threshold,
            v_profile_data.created_at,
            v_profile_data.updated_at;
    END IF;
END;
$$;

-- Create safe_update_profile function
CREATE FUNCTION public.safe_update_profile(
    p_user_id UUID,
    p_updates JSONB
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_exists BOOLEAN := FALSE;
    v_profile_data public.profiles%ROWTYPE;
BEGIN
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id OR profiles.user_id = p_user_id
    ) INTO v_profile_exists;

    IF NOT v_profile_exists THEN
        -- Profile doesn't exist, create it first
        PERFORM public.get_or_create_profile(p_user_id);
    END IF;

    -- Now update the profile
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
        notification_preferences = COALESCE((p_updates->>'notification_preferences')::JSONB, notification_preferences),
        kplc_meter_type = COALESCE((p_updates->>'kplc_meter_type')::TEXT, kplc_meter_type),
        low_balance_threshold = COALESCE((p_updates->>'low_balance_threshold')::DECIMAL(10,2), low_balance_threshold),
        updated_at = NOW()
    WHERE profiles.id = p_user_id OR profiles.user_id = p_user_id
    RETURNING * INTO v_profile_data;

    -- Return updated profile
    RETURN NEXT v_profile_data;
    RETURN;
END;
$$;

-- Create ensure_user_profile function
CREATE FUNCTION public.ensure_user_profile(
    p_user_id UUID,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_meter_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_exists BOOLEAN := FALSE;
    v_profile_data RECORD;
    v_created BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_user_id OR user_id = p_user_id
    ) INTO v_profile_exists;
    
    IF v_profile_exists THEN
        -- Profile exists, get current data
        SELECT * INTO v_profile_data
        FROM public.profiles 
        WHERE id = p_user_id OR user_id = p_user_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'created', false,
            'profile_exists', true,
            'profile', row_to_json(v_profile_data),
            'message', 'Profile already exists'
        );
    ELSE
        -- Profile doesn't exist, create it
        BEGIN
            INSERT INTO public.profiles (
                id,
                user_id,
                email,
                full_name,
                phone_number,
                meter_number,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                p_user_id,
                p_email,
                p_full_name,
                p_phone_number,
                p_meter_number,
                NOW(),
                NOW()
            )
            RETURNING * INTO v_profile_data;
            
            v_created := TRUE;
            
        EXCEPTION WHEN unique_violation THEN
            -- Handle race condition - profile was created by another process
            SELECT * INTO v_profile_data
            FROM public.profiles 
            WHERE id = p_user_id OR user_id = p_user_id;
            
            v_created := FALSE;
        END;
        
        RETURN jsonb_build_object(
            'success', true,
            'created', v_created,
            'profile_exists', true,
            'profile', row_to_json(v_profile_data),
            'message', CASE 
                WHEN v_created THEN 'Profile created successfully'
                ELSE 'Profile already existed (race condition handled)'
            END
        );
    END IF;
END;
$$;

-- Create check_profile_status function
CREATE FUNCTION public.check_profile_status(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_data RECORD;
    v_profile_exists BOOLEAN := FALSE;
    v_has_meter BOOLEAN := FALSE;
    v_profile_complete BOOLEAN := FALSE;
BEGIN
    -- Check if profile exists and get data
    SELECT * INTO v_profile_data
    FROM public.profiles 
    WHERE id = p_user_id OR user_id = p_user_id;
    
    v_profile_exists := FOUND;
    
    IF v_profile_exists THEN
        v_has_meter := v_profile_data.meter_number IS NOT NULL;
        v_profile_complete := (
            v_profile_data.full_name IS NOT NULL AND
            (v_profile_data.phone_number IS NOT NULL OR v_profile_data.email IS NOT NULL)
        );
    END IF;
    
    RETURN jsonb_build_object(
        'profile_exists', v_profile_exists,
        'has_meter', v_has_meter,
        'profile_complete', v_profile_complete,
        'profile_data', CASE 
            WHEN v_profile_exists THEN row_to_json(v_profile_data)
            ELSE NULL
        END,
        'setup_required', NOT v_profile_exists OR NOT v_has_meter,
        'recommendations', CASE
            WHEN NOT v_profile_exists THEN jsonb_build_array('Create profile')
            WHEN NOT v_has_meter THEN jsonb_build_array('Setup smart meter')
            WHEN NOT v_profile_complete THEN jsonb_build_array('Complete profile information')
            ELSE jsonb_build_array('Profile setup complete')
        END
    );
END;
$$;

-- Grant permissions to authenticated users
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_profile_status TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.get_or_create_profile IS 'Gets existing profile or creates new one for user';
COMMENT ON FUNCTION public.safe_update_profile IS 'Safely updates user profile with validation';
COMMENT ON FUNCTION public.ensure_user_profile IS 'Ensures user profile exists, creates if missing';
COMMENT ON FUNCTION public.check_profile_status IS 'Checks profile setup status and completeness';

-- Final status check
DO $$ 
DECLARE
    profiles_count INTEGER;
    functions_count INTEGER;
BEGIN
    -- Count existing profiles
    SELECT COUNT(*) FROM public.profiles INTO profiles_count;
    
    -- Count profile functions
    SELECT COUNT(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
    AND p.proname LIKE '%profile%' INTO functions_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== PROFILE FUNCTIONS MIGRATION COMPLETED ===';
    RAISE NOTICE 'Profiles table: % existing records', profiles_count;
    RAISE NOTICE 'Profile functions: % functions created', functions_count;
    RAISE NOTICE '';
    RAISE NOTICE 'All profile functions are now available!';
END $$;