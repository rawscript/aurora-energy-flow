-- Safe Migration: Create energy_readings and energy_insights tables
-- This migration safely creates tables and policies without conflicts
-- Migration: 20250113000000_create_energy_tables_safe.sql

-- First, let's check what exists and create a status report
DO $$ 
DECLARE
    energy_readings_exists BOOLEAN;
    energy_insights_exists BOOLEAN;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'energy_readings'
    ) INTO energy_readings_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'energy_insights'
    ) INTO energy_insights_exists;
    
    -- Report status
    RAISE NOTICE 'Migration Status Check:';
    RAISE NOTICE 'energy_readings table exists: %', energy_readings_exists;
    RAISE NOTICE 'energy_insights table exists: %', energy_insights_exists;
END $$;

-- Create energy_readings table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.energy_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meter_number TEXT NOT NULL,
    kwh_consumed DECIMAL(10,3) NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    reading_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cost_per_kwh DECIMAL(6,2) NOT NULL DEFAULT 25.00,
    peak_usage DECIMAL(10,3) NULL,
    off_peak_usage DECIMAL(10,3) NULL,
    battery_state INTEGER NULL CHECK (battery_state >= 0 AND battery_state <= 100),
    power_generated DECIMAL(10,3) NULL,
    load_consumption DECIMAL(10,3) NULL,
    battery_count INTEGER NULL DEFAULT 1,
    billing_period_start TIMESTAMPTZ NULL,
    billing_period_end TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing energy_readings table (safe)
DO $$ 
BEGIN
    -- Add grid_import column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'grid_import') THEN
        ALTER TABLE public.energy_readings ADD COLUMN grid_import DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added grid_import column to energy_readings';
    END IF;
    
    -- Add grid_export column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'grid_export') THEN
        ALTER TABLE public.energy_readings ADD COLUMN grid_export DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added grid_export column to energy_readings';
    END IF;
    
    -- Add solar_generation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'solar_generation') THEN
        ALTER TABLE public.energy_readings ADD COLUMN solar_generation DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added solar_generation column to energy_readings';
    END IF;
    
    -- Add battery_charge column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'battery_charge') THEN
        ALTER TABLE public.energy_readings ADD COLUMN battery_charge DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added battery_charge column to energy_readings';
    END IF;
    
    -- Add battery_discharge column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'battery_discharge') THEN
        ALTER TABLE public.energy_readings ADD COLUMN battery_discharge DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added battery_discharge column to energy_readings';
    END IF;
    
    -- Add energy_provider column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'energy_provider') THEN
        ALTER TABLE public.energy_readings ADD COLUMN energy_provider TEXT DEFAULT 'kplc';
        ALTER TABLE public.energy_readings ADD CONSTRAINT energy_readings_energy_provider_check 
            CHECK (energy_provider IN ('kplc', 'solar', 'hybrid'));
        RAISE NOTICE 'Added energy_provider column to energy_readings';
    END IF;
    
    -- Add meter_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'meter_type') THEN
        ALTER TABLE public.energy_readings ADD COLUMN meter_type TEXT DEFAULT 'prepaid';
        ALTER TABLE public.energy_readings ADD CONSTRAINT energy_readings_meter_type_check 
            CHECK (meter_type IN ('prepaid', 'postpaid', 'solar'));
        RAISE NOTICE 'Added meter_type column to energy_readings';
    END IF;
    
    -- Add data_source column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'data_source') THEN
        ALTER TABLE public.energy_readings ADD COLUMN data_source TEXT DEFAULT 'manual';
        ALTER TABLE public.energy_readings ADD CONSTRAINT energy_readings_data_source_check 
            CHECK (data_source IN ('sms', 'ussd', 'manual', 'api', 'smart_meter'));
        RAISE NOTICE 'Added data_source column to energy_readings';
    END IF;
END $$;

-- Create energy_insights table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.energy_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meter_number TEXT NOT NULL,
    current_usage DECIMAL(10,3) NOT NULL DEFAULT 0,
    daily_total DECIMAL(10,3) NOT NULL DEFAULT 0,
    daily_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_average DECIMAL(10,3) NOT NULL DEFAULT 0,
    monthly_total DECIMAL(10,3) NOT NULL DEFAULT 0,
    efficiency_score INTEGER NOT NULL DEFAULT 0 CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('sms', 'ussd', 'manual', 'api', 'smart_meter')),
    status TEXT NOT NULL DEFAULT 'fresh' CHECK (status IN ('fresh', 'stale', 'pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing energy_insights table (safe)
DO $$ 
BEGIN
    -- Add peak_demand column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'peak_demand') THEN
        ALTER TABLE public.energy_insights ADD COLUMN peak_demand DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added peak_demand column to energy_insights';
    END IF;
    
    -- Add off_peak_demand column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'off_peak_demand') THEN
        ALTER TABLE public.energy_insights ADD COLUMN off_peak_demand DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added off_peak_demand column to energy_insights';
    END IF;
    
    -- Add carbon_footprint column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'carbon_footprint') THEN
        ALTER TABLE public.energy_insights ADD COLUMN carbon_footprint DECIMAL(10,3) NULL DEFAULT 0;
        RAISE NOTICE 'Added carbon_footprint column to energy_insights';
    END IF;
    
    -- Add cost_savings column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'cost_savings') THEN
        ALTER TABLE public.energy_insights ADD COLUMN cost_savings DECIMAL(10,2) NULL DEFAULT 0;
        RAISE NOTICE 'Added cost_savings column to energy_insights';
    END IF;
    
    -- Add energy_independence_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'energy_independence_score') THEN
        ALTER TABLE public.energy_insights ADD COLUMN energy_independence_score INTEGER NULL DEFAULT 0;
        ALTER TABLE public.energy_insights ADD CONSTRAINT energy_insights_independence_score_check 
            CHECK (energy_independence_score >= 0 AND energy_independence_score <= 100);
        RAISE NOTICE 'Added energy_independence_score column to energy_insights';
    END IF;
    
    -- Add predicted_monthly_cost column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_insights' AND column_name = 'predicted_monthly_cost') THEN
        ALTER TABLE public.energy_insights ADD COLUMN predicted_monthly_cost DECIMAL(10,2) NULL DEFAULT 0;
        RAISE NOTICE 'Added predicted_monthly_cost column to energy_insights';
    END IF;
END $$;

-- Add unique constraint for energy_insights (safe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'energy_insights_user_id_meter_number_key'
    ) THEN
        ALTER TABLE public.energy_insights 
        ADD CONSTRAINT energy_insights_user_id_meter_number_key 
        UNIQUE(user_id, meter_number);
        RAISE NOTICE 'Added unique constraint to energy_insights';
    ELSE
        RAISE NOTICE 'Unique constraint already exists on energy_insights';
    END IF;
END $$;

-- Create indexes (safe creation)
CREATE INDEX IF NOT EXISTS idx_energy_readings_user_meter ON public.energy_readings(user_id, meter_number);
CREATE INDEX IF NOT EXISTS idx_energy_readings_date ON public.energy_readings(reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_energy_readings_user_date ON public.energy_readings(user_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_energy_insights_user_meter ON public.energy_insights(user_id, meter_number);
CREATE INDEX IF NOT EXISTS idx_energy_insights_updated ON public.energy_insights(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_energy_insights_status ON public.energy_insights(status);

-- Create additional indexes only if columns exist
DO $$ 
BEGIN
    -- Create energy_provider index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'energy_provider') THEN
        CREATE INDEX IF NOT EXISTS idx_energy_readings_provider ON public.energy_readings(energy_provider);
        RAISE NOTICE 'Created index on energy_provider';
    END IF;
    
    -- Create data_source index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'energy_readings' AND column_name = 'data_source') THEN
        CREATE INDEX IF NOT EXISTS idx_energy_readings_source ON public.energy_readings(data_source);
        RAISE NOTICE 'Created index on data_source';
    END IF;
END $$;

-- Create updated_at trigger function (safe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enable RLS (safe)
DO $$ 
BEGIN
    -- Enable RLS on energy_readings
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'energy_readings' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.energy_readings ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on energy_readings';
    ELSE
        RAISE NOTICE 'RLS already enabled on energy_readings';
    END IF;
    
    -- Enable RLS on energy_insights
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'energy_insights' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.energy_insights ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on energy_insights';
    ELSE
        RAISE NOTICE 'RLS already enabled on energy_insights';
    END IF;
END $$;

-- Create RLS policies (safe creation)
DO $$ 
BEGIN
    -- Policies for energy_readings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_readings' AND policyname = 'Users can view their own energy readings') THEN
        CREATE POLICY "Users can view their own energy readings" ON public.energy_readings
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for energy_readings';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_readings' AND policyname = 'Users can insert their own energy readings') THEN
        CREATE POLICY "Users can insert their own energy readings" ON public.energy_readings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for energy_readings';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_readings' AND policyname = 'Users can update their own energy readings') THEN
        CREATE POLICY "Users can update their own energy readings" ON public.energy_readings
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for energy_readings';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_readings' AND policyname = 'Users can delete their own energy readings') THEN
        CREATE POLICY "Users can delete their own energy readings" ON public.energy_readings
            FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created DELETE policy for energy_readings';
    END IF;
    
    -- Policies for energy_insights
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_insights' AND policyname = 'Users can view their own energy insights') THEN
        CREATE POLICY "Users can view their own energy insights" ON public.energy_insights
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created SELECT policy for energy_insights';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_insights' AND policyname = 'Users can insert their own energy insights') THEN
        CREATE POLICY "Users can insert their own energy insights" ON public.energy_insights
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created INSERT policy for energy_insights';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_insights' AND policyname = 'Users can update their own energy insights') THEN
        CREATE POLICY "Users can update their own energy insights" ON public.energy_insights
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created UPDATE policy for energy_insights';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'energy_insights' AND policyname = 'Users can delete their own energy insights') THEN
        CREATE POLICY "Users can delete their own energy insights" ON public.energy_insights
            FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created DELETE policy for energy_insights';
    END IF;
END $$;

-- Create triggers (safe creation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_energy_readings_updated_at') THEN
        CREATE TRIGGER update_energy_readings_updated_at 
            BEFORE UPDATE ON public.energy_readings 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE 'Created trigger for energy_readings';
    ELSE
        RAISE NOTICE 'Trigger already exists for energy_readings';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_energy_insights_updated_at') THEN
        CREATE TRIGGER update_energy_insights_updated_at 
            BEFORE UPDATE ON public.energy_insights 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE 'Created trigger for energy_insights';
    ELSE
        RAISE NOTICE 'Trigger already exists for energy_insights';
    END IF;
END $$;

-- Create helper functions for energy calculations
CREATE OR REPLACE FUNCTION public.calculate_energy_efficiency(
    p_user_id UUID,
    p_meter_number TEXT,
    p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    avg_consumption DECIMAL(10,3);
    efficiency_score INTEGER;
BEGIN
    -- Calculate average consumption over specified days
    SELECT AVG(kwh_consumed) INTO avg_consumption
    FROM public.energy_readings
    WHERE user_id = p_user_id 
    AND meter_number = p_meter_number
    AND reading_date >= NOW() - INTERVAL '1 day' * p_days;
    
    -- Calculate efficiency score (lower consumption = higher efficiency)
    -- This is a simplified calculation - you can enhance based on your needs
    IF avg_consumption IS NULL OR avg_consumption = 0 THEN
        efficiency_score := 50; -- Default score
    ELSIF avg_consumption <= 5 THEN
        efficiency_score := 100;
    ELSIF avg_consumption <= 10 THEN
        efficiency_score := 80;
    ELSIF avg_consumption <= 20 THEN
        efficiency_score := 60;
    ELSIF avg_consumption <= 30 THEN
        efficiency_score := 40;
    ELSE
        efficiency_score := 20;
    END IF;
    
    RETURN efficiency_score;
END;
$$;

-- Create function to update energy insights
CREATE OR REPLACE FUNCTION public.update_energy_insights(
    p_user_id UUID,
    p_meter_number TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_usage DECIMAL(10,3);
    daily_cost_calc DECIMAL(10,2);
    weekly_avg DECIMAL(10,3);
    monthly_usage DECIMAL(10,3);
    efficiency INTEGER;
BEGIN
    -- Calculate daily usage (last 24 hours)
    SELECT COALESCE(SUM(kwh_consumed), 0) INTO daily_usage
    FROM public.energy_readings
    WHERE user_id = p_user_id 
    AND meter_number = p_meter_number
    AND reading_date >= NOW() - INTERVAL '1 day';
    
    -- Calculate daily cost
    SELECT COALESCE(SUM(total_cost), 0) INTO daily_cost_calc
    FROM public.energy_readings
    WHERE user_id = p_user_id 
    AND meter_number = p_meter_number
    AND reading_date >= NOW() - INTERVAL '1 day';
    
    -- Calculate weekly average
    SELECT COALESCE(AVG(kwh_consumed), 0) INTO weekly_avg
    FROM public.energy_readings
    WHERE user_id = p_user_id 
    AND meter_number = p_meter_number
    AND reading_date >= NOW() - INTERVAL '7 days';
    
    -- Calculate monthly usage
    SELECT COALESCE(SUM(kwh_consumed), 0) INTO monthly_usage
    FROM public.energy_readings
    WHERE user_id = p_user_id 
    AND meter_number = p_meter_number
    AND reading_date >= NOW() - INTERVAL '30 days';
    
    -- Calculate efficiency score
    efficiency := public.calculate_energy_efficiency(p_user_id, p_meter_number);
    
    -- Insert or update insights
    INSERT INTO public.energy_insights (
        user_id, meter_number, daily_total, daily_cost, 
        weekly_average, monthly_total, efficiency_score,
        last_updated, source, status
    )
    VALUES (
        p_user_id, p_meter_number, daily_usage, daily_cost_calc,
        weekly_avg, monthly_usage, efficiency,
        NOW(), 'api', 'fresh'
    )
    ON CONFLICT (user_id, meter_number)
    DO UPDATE SET
        daily_total = EXCLUDED.daily_total,
        daily_cost = EXCLUDED.daily_cost,
        weekly_average = EXCLUDED.weekly_average,
        monthly_total = EXCLUDED.monthly_total,
        efficiency_score = EXCLUDED.efficiency_score,
        last_updated = NOW(),
        status = 'fresh';
END;
$$;

-- Grant permissions (safe)
DO $$ 
BEGIN
    GRANT ALL ON public.energy_readings TO authenticated;
    GRANT ALL ON public.energy_insights TO authenticated;
    GRANT EXECUTE ON FUNCTION public.calculate_energy_efficiency TO authenticated;
    GRANT EXECUTE ON FUNCTION public.update_energy_insights TO authenticated;
    RAISE NOTICE 'Granted permissions to authenticated users';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Permissions may already be granted or error occurred: %', SQLERRM;
END $$;

-- Final status check
DO $$ 
DECLARE
    readings_count INTEGER;
    insights_count INTEGER;
    readings_policies INTEGER;
    insights_policies INTEGER;
BEGIN
    -- Count existing data
    SELECT COUNT(*) FROM public.energy_readings INTO readings_count;
    SELECT COUNT(*) FROM public.energy_insights INTO insights_count;
    
    -- Count policies
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'energy_readings' INTO readings_policies;
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'energy_insights' INTO insights_policies;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'energy_readings table: % existing records, % policies', readings_count, readings_policies;
    RAISE NOTICE 'energy_insights table: % existing records, % policies', insights_count, insights_policies;
    RAISE NOTICE '';
    RAISE NOTICE 'Your database is now ready for the Aurora Energy Flow application!';
    RAISE NOTICE 'The useRealTimeEnergy hook should work without errors.';
END $$;

-- Add helpful comments
COMMENT ON TABLE public.energy_readings IS 'Stores individual energy meter readings with timestamps - supports KPLC, solar, and hybrid systems';
COMMENT ON TABLE public.energy_insights IS 'Stores aggregated energy insights for demand-driven dashboard with advanced analytics';

COMMENT ON COLUMN public.energy_readings.kwh_consumed IS 'Energy consumed in kWh for this reading';
COMMENT ON COLUMN public.energy_readings.total_cost IS 'Total cost in KES for this reading';
COMMENT ON COLUMN public.energy_readings.battery_state IS 'Battery charge percentage (0-100) for solar systems';
COMMENT ON COLUMN public.energy_readings.power_generated IS 'Solar power generated in kW';
COMMENT ON COLUMN public.energy_readings.grid_import IS 'Energy imported from grid in kWh';
COMMENT ON COLUMN public.energy_readings.grid_export IS 'Energy exported to grid in kWh';
COMMENT ON COLUMN public.energy_readings.solar_generation IS 'Solar energy generated in kWh';
COMMENT ON COLUMN public.energy_insights.efficiency_score IS 'Energy efficiency score (0-100)';
COMMENT ON COLUMN public.energy_insights.source IS 'Source of the insight data (sms, ussd, manual, api, smart_meter)';
COMMENT ON COLUMN public.energy_insights.energy_independence_score IS 'Energy independence score for solar users (0-100)';