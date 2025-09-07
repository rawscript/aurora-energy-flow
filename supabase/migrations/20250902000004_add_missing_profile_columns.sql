-- Add missing columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS energy_provider TEXT DEFAULT 'KPLC';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_optimize BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS energy_rate DECIMAL(10, 4) DEFAULT 0.15;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"token_low": true, "token_depleted": true, "power_restored": true}';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kplc_meter_type TEXT DEFAULT 'prepaid';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS low_balance_threshold NUMERIC DEFAULT 100;
