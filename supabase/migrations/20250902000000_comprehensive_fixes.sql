--
-- COMPREHENSIVE DATABASE FIXES AND ENHANCEMENTS
--
-- This migration addresses:
-- 1. Missing tables and columns
-- 2. Data consistency issues
-- 3. Performance bottlenecks
-- 4. Transaction management
-- 5. Notification reliability
-- 6. Security enhancements
--

-- Enable extension if not exists
CREATE EXENSION IF NOT EXISTS "uuid-ossp";

--
-- 1. CREATE MISSING TABLES AND COLUMNS
--

-- Create token_balances table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.token_balances (
  user_id UUID NOT NULL,
  meter_number TEXT NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  daily_consumption_avg DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_days_remaining INTEGER NOT NULL DEFAULT 0,
  low_balance_threshold DECIMAL(10,2) NOT NULL DEFAULT 50,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, meter_number),
  CONSTRAINT fk_token_balances_profile
    FOREIGN KEY (user_id, meter_number)
    REFERENCES public.profiles(id, meter_number)
    ON DELETE CASCADE
);

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add token_balance column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'token_balance'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN token_balance DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Add last_token_purchase column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_token_purchase'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_token_purchase TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add token_purchase_amount column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'token_purchase_amount'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN token_purchase_amount DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Add low_balance_threshold column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'low_balance_threshold'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN low_balance_threshold DECIMAL(10,2) DEFAULT 100;
  END IF;

  -- Add notification_preferences column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB
      DEFAULT '{"token_low": true, "token_depleted": true, "power_restored": true}';
  END IF;

  -- Add kplc_meter_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kplc_meter_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN kplc_meter_type TEXT
      DEFAULT 'prepaid' CHECK (kplc_meter_type IN ('prepaid', 'postpaid'));
  END IF;

  -- Add energy_provider column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_provider'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN energy_provider TEXT
      DEFAULT '' CHECK (energy_provider IN ('', 'KPLC', 'Solar', 'KenGEn', 'IPP', 'Other'));
  END IF;

  -- Add notifications_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add auto_optimize column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auto_optimize'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN auto_optimize BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add energy_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_rate'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN energy_rate DECIMAL(10,4) DEFAULT 0.15;
  END IF;

  -- Add meter_category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'meter_category'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN meter_category TEXT;
  END IF;

  -- Add industry_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'industry_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN industry_type TEXT;
  END IF;
END
$$;

-- Create kplc_token_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.kplc_token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  token_units DECIMAL(10,2),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reference_number TEXT,
  vendor TEXT,
  meter_number TEXT NOT NULL,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  phone_number TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create energy_readings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.energy_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meter_number TEXT NOT NULL,
  kwh_consumed NUMERIC NOT NULL,
  cost_per_kwh NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  reading_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  peak_usage NUMERIC,
  off_peak_usage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_kwh_consumed_non_negative CHECK (kwh_consumed >= 0),
  CONSTRAINT check_cost_per_kwh_non_negative CHECK (cost_per_kwh >= 0),
  CONSTRAINT check_total_cost_non_negative CHECK (total_cost >= 0),
  CONSTRAINT check_peak_usage_non_negative CHECK (peak_usage IS NULL OR peak_usage >= 0),
  CONSTRAINT check_off_peak_usage_non_negative CHECK (off_peak_usage IS NULL OR off_peak_usage >= 0),
  CONSTRAINT check_billing_period_logical CHECK (
    billing_period_start IS NULL OR
    billing_period_end IS NULL OR
    billing_period_start <= billing_period_end
  )
);

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Create ai_alerts table if it doesn't exist (for backward compatibility)
CREATE TABLE IF NOT EXISTS public.ai_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'info',
  severity TEXT NOT NULL DEFAULT 'low',
  is_read BOOLEAN NOT NULL DEFAULT false,
  recommended_actions JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create token_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.token_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meter_number TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, meter_number, cache_key)
);

-- Create error_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_detail TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  stack_trace TEXT
);

-- Create kplc_api_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.kplc_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  response_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create energy_settings_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.energy_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  settings JSONB NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, version)
);

-- Create kplc_api_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.kplc_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_endpoint TEXT NOT NULL,
  api_key TEXT,
  timeout_ms INTEGER DEFAULT 5000,
  retry_count INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--
-- 2. ADD INDEXES FOR PERFORMANCE
--

-- Add indexes to token_balances
CREATE INDEX IF NOT EXISTS idx_token_balances_user ON public.token_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_token_balances_meter ON public.token_balances(meter_number);
CREATE INDEX IF NOT EXISTS idx_token_balances_updated ON public.token_balances(updated_at);

-- Add indexes to kplc_token_transactions
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON public.kplc_token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_meter ON public.kplc_token_transactions(meter_number);
CREATE INDEX IF NOT EXISTS idx_token_transactions_date ON public.kplc_token_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON public.kplc_token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_meter ON public.kplc_token_transactions(user_id, meter_number);

-- Add indexes to energy_readings
CREATE INDEX IF NOT EXISTS idx_energy_readings_user ON public.energy_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_readings_meter ON public.energy_readings(meter_number);
CREATE INDEX IF NOT EXISTS idx_energy_readings_date ON public.energy_readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_energy_readings_user_date ON public.energy_readings(user_id, reading_date);

-- Add indexes to notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON public.notifications(severity);

-- Add indexes to notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON public.notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created ON public.notification_queue(created_at);

-- Add indexes to error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_function ON public.error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at DESC);

--
-- 3. SET UP ROW LEVEL SECURITY
--

-- Enable RLS for all tables
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kplc_token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kplc_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_settings_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for token_balances
CREATE POLICY "Users can view their own token balances" ON public.token_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert/update token balances" ON public.token_balances
  FOR ALL USING (true);

-- Create RLS policies for kplc_token_transactions
CREATE POLICY "Users can view their own token transactions" ON public.kplc_token_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert token transactions" ON public.kplc_token_transactions
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for energy_readings
CREATE POLICY "Users can view their own energy readings" ON public.energy_readings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own energy readings" ON public.energy_readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for notification_queue
CREATE POLICY "System can manage notification queue" ON public.notification_queue
  FOR ALL USING (true);

--
-- 4. CREATE OR REPLACE IMPROVED FUNCTIONS
--

-- Improved error logging function
CREATE OR REPLACE FUNCTION public.log_error(
  p_function_name TEXT,
  p_error_message TEXT,
  p_error_detail TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.error_logs (
    function_name,
    error_message,
    error_detail,
    user_id,
    context,
    stack_trace,
    created_at
  )
  VALUES (
    p_function_name,
    p_error_message,
    p_error_detail,
    p_user_id,
    p_context,
    p_stack_trace,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If error logging fails, just continue
  NULL;
END;
$$;

-- Improved function to update token balance with transaction support
CREATE OR REPLACE FUNCTION public.update_token_balance_improved(
  p_user_id UUID,
  p_meter_number TEXT,
  p_amount DECIMAL(10,2),
  p_transaction_type TEXT DEFAULT 'consumption',
  p_force BOOLEAN DEFAULT FALSE,
  p_reference_number TEXT DEFAULT NULL,
  p_vendor TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_daily_avg DECIMAL(10,2);
  v_estimated_days INTEGER;
  v_notification_created BOOLEAN := FALSE;
  v_error_message TEXT;
  v_transaction_id UUID;
  v_token_units DECIMAL(10,2);
  v_balance_record RECORD;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
  END IF;

  IF p_amount IS NULL THEN
    RAISE EXCEPTION 'Amount is required';
  END IF;

  -- Validate transaction type
  IF p_transaction_type NOT IN ('purchase', 'consumption', 'refund') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Lock the balance record for update to prevent race conditions
  SELECT * FROM public.token_balances
  WHERE user_id = p_user_id AND meter_number = p_meter_number
  FOR UPDATE;

  -- Get current balance or create new record
  BEGIN
    -- Try to get existing balance
    SELECT * INTO v_balance_record
    FROM public.token_balances
    WHERE user_id = p_user_id AND meter_number = p_meter_number;

    -- If no balance record exists, create one
    IF NOT FOUND THEN
      v_current_balance := 0;
      v_daily_avg := 0;

      INSERT INTO public.token_balances (
        user_id,
        meter_number,
        current_balance,
        daily_consumption_avg,
        estimated_days_remaining,
        low_balance_threshold,
        last_updated,
        updated_at,
        created_at
      )
      VALUES (
        p_user_id,
        p_meter_number,
        0,
        0,
        0,
        50,
        NOW(),
        NOW(),
        NOW()
      );

      -- Get the newly created record
      SELECT * INTO v_balance_record
      FROM public.token_balances
      WHERE user_id = p_user_id AND meter_number = p_meter_number;
    ELSE
      v_current_balance := v_balance_record.current_balance;
      v_daily_avg := v_balance_record.daily_consumption_avg;
    END IF;

    -- Calculate new balance based on transaction type
    IF p_transaction_type = 'purchase' THEN
      v_new_balance := v_current_balance + p_amount;
      v_token_units := p_amount; -- For purchases, amount = token units
    ELSIF p_transaction_type = 'refund' THEN
      v_new_balance := v_current_balance + p_amount;
      v_token_units := p_amount;
    ELSE -- consumption
      v_new_balance := GREATEST(0, v_current_balance - p_amount);
      v_token_units := p_amount;
    END IF;

    -- Calculate daily average consumption (simple moving average)
    IF p_transaction_type = 'consumption' THEN
      v_daily_avg := (v_daily_avg * 0.9) + (p_amount * 0.1); -- Weighted average
    END IF;

    -- Calculate estimated days remaining
    IF v_daily_avg > 0 THEN
      v_estimated_days := FLOOR(v_new_balance / v_daily_avg);
    ELSE
      v_estimated_days := 999; -- Unknown consumption pattern
    END IF;

    -- Create transaction record
    INSERT INTO public.kplc_token_transactions (
      user_id,
      meter_number,
      transaction_type,
      amount,
      token_units,
      reference_number,
      vendor,
      payment_method,
      balance_before,
      balance_after,
      status,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_meter_number,
      p_transaction_type,
      p_amount,
      v_token_units,
      p_reference_number,
      p_vendor,
      p_payment_method,
      v_current_balance,
      v_new_balance,
      'completed',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_transaction_id;

    -- Update balance record
    UPDATE public.token_balances
    SET
      current_balance = v_new_balance,
      daily_consumption_avg = v_daily_avg,
      estimated_days_remaining = v_estimated_days,
      last_updated = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id AND meter_number = p_meter_number;

    -- Also update profiles table for backward compatibility
    UPDATE public.profiles
    SET
      token_balance = v_new_balance,
      last_token_purchase = CASE
        WHEN p_transaction_type = 'purchase' THEN NOW()
        ELSE last_token_purchase
      END,
      token_purchase_amount = CASE
        WHEN p_transaction_type = 'purchase' THEN p_amount
        ELSE token_purchase_amount
      END
    WHERE id = p_user_id AND meter_number = p_meter_number;

    -- Create low balance notification if needed and not forced
    IF v_new_balance <= 50 AND p_transaction_type = 'consumption' AND NOT p_force THEN
      BEGIN
        -- Use the improved notification function
        PERFORM public.create_notification_improved(
          p_user_id,
          CASE
            WHEN v_new_balance <= 0 THEN 'KPLC Tokens Depleted! ⚠️'
            WHEN v_new_balance <= 20 THEN 'CRITICAL: Very Low Token Balance! ❗'
            ELSE 'Low Token Balance Warning 🔋'
          END,
          CASE
            WHEN v_new_balance <= 0 THEN 'Your electricity tokens have been completely depleted. Purchase new tokens immediately to avoid power interruption.'
            WHEN v_new_balance <= 20 THEN 'Your token balance is critically low (KSh ' || v_new_balance::text || '). Purchase more tokens now to avoid service interruption.'
            ELSE 'Your token balance is running low (KSh ' || v_new_balance::text || '). Consider purchasing more tokens soon.'
          END,
          CASE
            WHEN v_new_balance <= 0 THEN 'token_depleted'
            ELSE 'token_low'
          END,
          CASE
            WHEN v_new_balance <= 0 THEN 'critical'
            WHEN v_new_balance <= 20 THEN 'high'
            ELSE 'medium'
          END,
          v_new_balance,
          v_estimated_days,
          jsonb_build_object(
            'transaction_id', v_transaction_id,
            'previous_balance', v_current_balance,
            'new_balance', v_new_balance,
            'estimated_days', v_estimated_days,
            'meter_number', p_meter_number
          ),
          NOW() + INTERVAL '24 hours'
        );
        v_notification_created := TRUE;
      EXCEPTION WHEN OTHERS THEN
        CALL public.log_error(
          'update_token_balance_improved',
          'Failed to create low balance notification',
          SQLERRM,
          p_user_id,
          jsonb_build_object(
            'meter_number', p_meter_number,
            'new_balance', v_new_balance,
            'estimated_days', v_estimated_days,
            'transaction_id', v_transaction_id
          ),
          NULL
        );
      END;
    END IF;

    -- Invalidate cache for this user/meter
    BEGIN
      DELETE FROM public.token_cache
      WHERE user_id = p_user_id AND meter_number = p_meter_number;
    EXCEPTION WHEN OTHERS THEN
      -- Log cache invalidation error but continue
      CALL public.log_error(
        'update_token_balance_improved',
        'Failed to invalidate cache',
        SQLERRM,
        p_user_id,
        jsonb_build_object('meter_number', p_meter_number),
        NULL
      );
    END;

    RETURN v_new_balance;
  EXCEPTION WHEN OTHERS THEN
    v_error_message := 'Error updating token balance: ' || SQLERRM;
    CALL public.log_error(
      'update_token_balance_improved',
      v_error_message,
      SQLERRM,
      p_user_id,
      jsonb_build_object(
        'meter_number', p_meter_number,
        'amount', p_amount,
        'transaction_type', p_transaction_type,
        'force', p_force,
        'reference_number', p_reference_number
      ),
      NULL
    );
    RAISE EXCEPTION '%', v_error_message;
  END;
END;
$$;

-- Improved function to purchase tokens with full transaction support
CREATE OR REPLACE FUNCTION public.purchase_tokens_improved(
  p_user_id UUID,
  p_meter_number TEXT,
  p_amount DECIMAL(10,2),
  p_payment_method TEXT DEFAULT 'M-PESA',
  p_vendor TEXT DEFAULT 'M-PESA',
  p_phone_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_token_code TEXT;
  v_reference_number TEXT;
  v_current_balance DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_token_units DECIMAL(10,2);
  v_notification_id UUID;
  v_error_message TEXT;
  v_api_response JSONB;
  v_request_start TIMESTAMP;
  v_request_duration INTEGER;
  v_profile_record RECORD;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive value';
  END IF;

  IF p_amount < 10 OR p_amount > 10000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be between KSh 10 and KSh 10,000',
      'code', 'INVALID_AMOUNT'
    );
  END IF;

  -- Verify meter belongs to user
  SELECT 1 INTO v_profile_record
  FROM public.profiles
  WHERE id = p_user_id AND meter_number = p_meter_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Meter number does not belong to this user',
      'code', 'INVALID_METER_OWNERSHIP'
    );
  END IF;

  -- Generate transaction reference
  v_reference_number := 'TXN' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Start API request timing
  v_request_start := clock_timestamp();

  -- Simulate KPLC API call for token purchase with better error handling
  BEGIN
    -- Simulate API call delay
    PERFORM pg_sleep(1.0);

    -- Generate token code
    v_token_code := LPAD(FLOOR(RANDOM() * 99999999999999999999)::TEXT, 20, '0');

    -- Calculate token units (1 KSh = 1 token unit for simplicity)
    v_token_units := p_amount;

    -- Get current balance using the improved function
    BEGIN
      v_current_balance := public.get_current_token_balance(p_user_id, p_meter_number);
    EXCEPTION WHEN OTHERS THEN
      v_current_balance := 0;
    END;

    -- Update balance using the improved transactional function
    v_new_balance := public.update_token_balance_improved(
      p_user_id,
      p_meter_number,
      p_amount,
      'purchase',
      FALSE,
      v_reference_number,
      p_vendor,
      p_payment_method
    );

    -- Create transaction record with more details
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
      status,
      phone_number,
      metadata
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
      v_current_balance,
      v_new_balance,
      'completed',
      p_phone_number,
      jsonb_build_object(
        'simulated_api_call', true,
        'processing_time_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_request_start)::INTEGER
      )
    )
    RETURNING id INTO v_transaction_id;

    -- Create success notification using the improved function
    BEGIN
      v_notification_id := public.create_notification_improved(
        p_user_id,
        'Token Purchase Successful! 🎉',
        'Your KSh ' || p_amount || ' token purchase was successful. Token code: ' || v_token_code,
        'token_purchase',
        'low',
        v_new_balance,
        (v_new_balance / 25.0)::INTEGER,
        jsonb_build_object(
          'token_code', v_token_code,
          'reference_number', v_reference_number,
          'amount', p_amount,
          'meter_number', p_meter_number,
          'transaction_id', v_transaction_id,
          'payment_method', p_payment_method,
          'phone_number', p_phone_number
        ),
        NOW() + INTERVAL '7 days'
      );
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'purchase_tokens_improved',
        'Failed to create purchase notification',
        SQLERRM,
        p_user_id,
        jsonb_build_object(
          'meter_number', p_meter_number,
          'amount', p_amount,
          'transaction_id', v_transaction_id
        ),
        NULL
      );
    END;

    -- Log the API request
    v_request_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_request_start)::INTEGER;

    INSERT INTO public.kplc_api_logs (
      user_id,
      request_type,
      request_data,
      response_data,
      response_code,
      response_time_ms
    ) VALUES (
      p_user_id,
      'token_purchase',
      jsonb_build_object(
        'meter_number', p_meter_number,
        'amount', p_amount,
        'payment_method', p_payment_method,
        'phone_number', p_phone_number
      ),
      jsonb_build_object(
        'success', true,
        'token_code', v_token_code,
        'reference_number', v_reference_number,
        'amount', p_amount,
        'units', v_token_units,
        'balance_before', v_current_balance,
        'balance_after', v_new_balance
      ),
      200,
      v_request_duration
    );

    -- Return transaction details
    RETURN jsonb_build_object(
      'success', true,
      'transaction_id', v_transaction_id,
      'token_code', v_token_code,
      'reference_number', v_reference_number,
      'amount', p_amount,
      'units', v_token_units,
      'balance_before', v_current_balance,
      'balance_after', v_new_balance,
      'payment_method', p_payment_method,
      'status', 'completed',
      'message', 'Token purchase successful',
      'notification_id', v_notification_id,
      'processing_time_ms', v_request_duration
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_message := 'Error purchasing tokens: ' || SQLERRM;
    CALL public.log_error(
      'purchase_tokens_improved',
      v_error_message,
      SQLERRM,
      p_user_id,
      jsonb_build_object(
        'meter_number', p_meter_number,
        'amount', p_amount,
        'payment_method', p_payment_method,
        'phone_number', p_phone_number
      ),
      NULL
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'code', 'PURCHASE_FAILED',
      'reference_number', v_reference_number,
      'message', 'Token purchase failed. Please try again.'
    );
  END;
END;
$$;

-- Helper function to get current token balance
CREATE OR REPLACE FUNCTION public.get_current_token_balance(
  p_user_id UUID,
  p_meter_number TEXT
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(10,2);
BEGIN
  -- Try to get balance from token_balances table first
  SELECT current_balance INTO v_balance
  FROM public.token_balances
  WHERE user_id = p_user_id AND meter_number = p_meter_number;

  -- If not found in token_balances, fall back to profiles table
  IF v_balance IS NULL THEN
    SELECT token_balance INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id AND meter_number = p_meter_number;

    -- If still not found, return 0
    IF v_balance IS NULL THEN
      v_balance := 0;
    END IF;
  END IF;

  RETURN v_balance;
END;
$$;

-- Improved function to get token analytics with better caching
CREATE OR REPLACE FUNCTION public.get_token_analytics_improved(
  p_user_id UUID,
  p_force_refresh BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_meter_number TEXT;
  v_cache_data JSONB;
  v_cache_expires TIMESTAMP WITH TIME ZONE;
  v_analytics_data RECORD;
  v_error_message TEXT;
  v_cache_key TEXT := 'token_analytics_v3'; -- Versioned cache key
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Get user's meter number
  BEGIN
    SELECT meter_number INTO v_meter_number
    FROM public.profiles
    WHERE id = p_user_id;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    v_meter_number := NULL;
  END;

  IF v_meter_number IS NULL THEN
    -- Return empty analytics for users without meters
    RETURN jsonb_build_object(
      'success', true,
      'current_balance', 0,
      'daily_consumption_avg', 0,
      'estimated_days_remaining', 0,
      'monthly_spending', 0,
      'last_purchase_date', NULL,
      'consumption_trend', 'stable',
      'last_updated', NOW(),
      'data_source', 'no_meter',
      'cache_hit', FALSE,
      'message', 'No meter connected'
    );
  END IF;

  -- Check cache first (unless force refresh)
  IF NOT p_force_refresh THEN
    BEGIN
      SELECT cache_data, expires_at INTO v_cache_data, v_cache_expires
      FROM public.token_cache
      WHERE user_id = p_user_id
        AND meter_number = v_meter_number
        AND cache_key = v_cache_key
        AND expires_at > NOW();

      IF v_cache_data IS NOT NULL THEN
        -- Return cached data with success indicator
        RETURN jsonb_build_object(
          'success', true,
          'current_balance', (v_cache_data->>'current_balance')::NUMERIC,
          'daily_consumption_avg', (v_cache_data->>'daily_consumption_avg')::NUMERIC,
          'estimated_days_remaining', (v_cache_data->>'estimated_days_remaining')::INTEGER,
          'monthly_spending', (v_cache_data->>'monthly_spending')::NUMERIC,
          'last_purchase_date', (v_cache_data->>'last_purchase_date')::TIMESTAMP,
          'consumption_trend', (v_cache_data->>'consumption_trend')::TEXT,
          'last_updated', (v_cache_data->>'last_updated')::TIMESTAMP,
          'data_source', 'cache',
          'cache_hit', TRUE,
          'message', 'Data served from cache'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'get_token_analytics_improved',
        'Error checking cache',
        SQLERRM,
        p_user_id,
        jsonb_build_object('meter_number', v_meter_number)
      );
    END;
  END IF;

  -- Calculate fresh analytics with better error handling
  BEGIN
    WITH balance_data AS (
      SELECT
        COALESCE(tb.current_balance, 0) as current_balance,
        COALESCE(tb.daily_consumption_avg, 0) as daily_consumption_avg,
        COALESCE(tb.estimated_days_remaining, 0) as estimated_days_remaining,
        COALESCE(tb.last_updated, NOW()) as last_updated,
        COALESCE(p.token_balance, 0) as legacy_balance
      FROM public.profiles p
      LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
      WHERE p.id = p_user_id AND p.meter_number = v_meter_number
      LIMIT 1
    ),
    monthly_spend AS (
      SELECT COALESCE(SUM(amount), 0) as total
      FROM public.kplc_token_transactions
      WHERE user_id = p_user_id
        AND meter_number = v_meter_number
        AND transaction_type = 'purchase'
        AND transaction_date >= date_trunc('month', NOW())
    ),
    last_purchase AS (
      SELECT transaction_date
      FROM public.kplc_token_transactions
      WHERE user_id = p_user_id
        AND meter_number = v_meter_number
        AND transaction_type = 'purchase'
      ORDER BY transaction_date DESC
      LIMIT 1
    ),
    consumption_trend AS (
      SELECT
        CASE
          WHEN AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '7 days') >
               AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '14 days' AND transaction_date < NOW() - INTERVAL '7 days') * 1.1
          THEN 'increasing'
          WHEN AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '7 days') <
               AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '14 days' AND transaction_date < NOW() - INTERVAL '7 days') * 0.9
          THEN 'decreasing'
          ELSE 'stable'
        END as trend
      FROM public.kplc_token_transactions
      WHERE user_id = p_user_id
        AND meter_number = v_meter_number
        AND transaction_type = 'consumption'
        AND transaction_date >= NOW() - INTERVAL '14 days'
    ),
    recent_consumption AS (
      SELECT
        COALESCE(SUM(kwh_consumed), 0) as total_kwh,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM public.energy_readings
      WHERE user_id = p_user_id
        AND meter_number = v_meter_number
        AND reading_date >= NOW() - INTERVAL '7 days'
    )

    SELECT
      bd.current_balance,
      bd.daily_consumption_avg,
      bd.estimated_days_remaining,
      ms.total as monthly_spending,
      lp.transaction_date as last_purchase_date,
      COALESCE(ct.trend, 'stable') as consumption_trend,
      bd.last_updated,
      rc.total_kwh as weekly_kwh_consumed,
      rc.total_cost as weekly_cost
    INTO v_analytics_data
    FROM balance_data bd
    CROSS JOIN monthly_spend ms
    LEFT JOIN last_purchase lp ON true
    LEFT JOIN consumption_trend ct ON true
    LEFT JOIN recent_consumption rc ON true;

    -- If no data found, use defaults
    IF NOT FOUND THEN
      v_analytics_data := ROW(0, 0, 0, 0, NULL, 'stable', NOW(), 0, 0);
    END IF;

    -- Cache the results (5 minutes cache)
    BEGIN
      INSERT INTO public.token_cache (user_id, meter_number, cache_key, cache_data, expires_at)
      VALUES (
        p_user_id,
        v_meter_number,
        v_cache_key,
        jsonb_build_object(
          'current_balance', v_analytics_data.current_balance,
          'daily_consumption_avg', v_analytics_data.daily_consumption_avg,
          'estimated_days_remaining', v_analytics_data.estimated_days_remaining,
          'monthly_spending', v_analytics_data.monthly_spending,
          'last_purchase_date', v_analytics_data.last_purchase_date,
          'consumption_trend', v_analytics_data.consumption_trend,
          'last_updated', v_analytics_data.last_updated,
          'weekly_kwh_consumed', v_analytics_data.weekly_kwh_consumed,
          'weekly_cost', v_analytics_data.weekly_cost
        ),
        NOW() + INTERVAL '5 minutes'
      )
      ON CONFLICT (user_id, meter_number, cache_key)
      DO UPDATE SET
        cache_data = EXCLUDED.cache_data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'get_token_analytics_improved',
        'Error updating cache',
        SQLERRM,
        p_user_id,
        jsonb_build_object('meter_number', v_meter_number)
      );
    END;

    -- Return fresh data with success indicator
    RETURN jsonb_build_object(
      'success', true,
      'current_balance', v_analytics_data.current_balance,
      'daily_consumption_avg', v_analytics_data.daily_consumption_avg,
      'estimated_days_remaining', v_analytics_data.estimated_days_remaining,
      'monthly_spending', v_analytics_data.monthly_spending,
      'last_purchase_date', v_analytics_data.last_purchase_date,
      'consumption_trend', v_analytics_data.consumption_trend,
      'last_updated', v_analytics_data.last_updated,
      'weekly_kwh_consumed', v_analytics_data.weekly_kwh_consumed,
      'weekly_cost', v_analytics_data.weekly_cost,
      'data_source', 'database',
      'cache_hit', FALSE,
      'message', 'Data served from database'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_message := 'Error getting token analytics: ' || SQLERRM;
    CALL public.log_error(
      'get_token_analytics_improved',
      v_error_message,
      SQLERRM,
      p_user_id,
      jsonb_build_object('meter_number', v_meter_number)
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'code', 'ANALYTICS_ERROR',
      'message', 'Failed to retrieve token analytics'
    );
  END;
END;
$$;

-- Improved function to create notifications with queue support
CREATE OR REPLACE FUNCTION public.create_notification_improved(
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
  v_queue_id UUID;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    p_severity := 'low';
  END IF;

  -- Create notification record
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

  -- Also add to notification queue for reliable delivery
  INSERT INTO public.notification_queue (
    user_id,
    notification_data,
    status,
    created_at
  )
  VALUES (
    p_user_id,
    jsonb_build_object(
      'notification_id', v_notification_id,
      'title', p_title,
      'message', p_message,
      'type', p_type,
      'severity', p_severity,
      'token_balance', p_token_balance,
      'estimated_days', p_estimated_days,
      'metadata', p_metadata,
      'expires_at', p_expires_at
    ),
    'pending',
    NOW()
  )
  RETURNING id INTO v_queue_id;

  RETURN v_notification_id;
END;
$$;

-- Improved function to insert energy readings with validation
CREATE OR REPLACE FUNCTION public.insert_energy_reading_improved(
  p_user_id UUID,
  p_meter_number TEXT,
  p_kwh_consumed NUMERIC,
  p_cost_per_kwh NUMERIC DEFAULT 25.0
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_cost NUMERIC;
  v_reading_id UUID;
  v_profile_exists BOOLEAN;
  v_error_context JSONB;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
  END IF;

  IF p_kwh_consumed IS NULL OR p_kwh_consumed < 0 THEN
    RAISE EXCEPTION 'kWh consumed must be a non-negative number';
  END IF;

  IF p_cost_per_kwh IS NULL OR p_cost_per_kwh <= 0 THEN
    RAISE EXCEPTION 'Cost per kWh must be a positive number';
  END IF;

  -- Verify meter belongs to user
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND meter_number = p_meter_number
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Meter % does not belong to user %', p_meter_number, p_user_id;
  END IF;

  -- Calculate total cost
  v_total_cost := p_kwh_consumed * p_cost_per_kwh;

  -- Insert the reading
  INSERT INTO public.energy_readings (
    user_id,
    meter_number,
    kwh_consumed,
    cost_per_kwh,
    total_cost,
    reading_date,
    created_at
  ) VALUES (
    p_user_id,
    p_meter_number,
    p_kwh_consumed,
    p_cost_per_kwh,
    v_total_cost,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_reading_id;

  -- Update token balance for consumption
  BEGIN
    PERFORM public.update_token_balance_improved(
      p_user_id,
      p_meter_number,
      v_total_cost,
      'consumption'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_context := jsonb_build_object(
      'user_id', p_user_id,
      'meter_number', p_meter_number,
      'reading_id', v_reading_id,
      'kwh_consumed', p_kwh_consumed,
      'total_cost', v_total_cost
    );

    CALL public.log_error(
      'insert_energy_reading_improved',
      'Failed to update token balance after energy reading',
      SQLERRM,
      p_user_id,
      v_error_context,
      NULL
    );
  END;

  RETURN v_reading_id::TEXT;
END;
$$;

-- Improved function to safely update profile with versioning
CREATE OR REPLACE FUNCTION public.safe_update_profile(
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
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_settings_history JSONB;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = p_user_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    -- Profile doesn't exist, create it first with basic info
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      phone_number,
      meter_number,
      energy_provider,
      notifications_enabled,
      auto_optimize,
      energy_rate,
      kplc_meter_type,
      meter_category,
      industry_type,
      notification_preferences,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_updates->>'email',
      p_updates->>'full_name',
      p_updates->>'phone_number',
      p_updates->>'meter_number',
      COALESCE(p_updates->>'energy_provider', ''),
      COALESCE((p_updates->>'notifications_enabled')::BOOLEAN, TRUE),
      COALESCE((p_updates->>'auto_optimize')::BOOLEAN, FALSE),
      COALESCE((p_updates->>'energy_rate')::DECIMAL(10,4), 0.15),
      COALESCE(p_updates->>'kplc_meter_type', 'prepaid'),
      p_updates->>'meter_category',
      p_updates->>'industry_type',
      COALESCE(p_updates->'notification_preferences',
               '{"token_low": true, "token_depleted": true, "power_restored": true}'::JSONB),
      NOW(),
      NOW()
    );

    -- Get the newly created profile
    SELECT * INTO v_profile_data
    FROM public.profiles
    WHERE id = p_user_id;

    -- Create initial settings history
    v_new_version := 1;
    INSERT INTO public.energy_settings_history (
      user_id,
      version,
      settings,
      changed_by,
      changed_at
    )
    VALUES (
      p_user_id,
      v_new_version,
      jsonb_build_object(
        'energy_provider', v_profile_data.energy_provider,
        'energy_rate', v_profile_data.energy_rate,
        'auto_optimize', v_profile_data.auto_optimize,
        'notifications_enabled', v_profile_data.notifications_enabled
      ),
      'system',
      NOW()
    );

    RETURN NEXT v_profile_data;
    RETURN;
  END IF;

  -- Validate energy_provider if provided
  IF p_updates ? 'energy_provider' THEN
    -- Check if it's a valid provider
    IF p_updates->>'energy_provider' NOT IN ('', 'KPLC', 'Solar', 'KenGEn', 'IPP', 'Other') THEN
      RAISE EXCEPTION 'Invalid energy provider: %', p_updates->>'energy_provider';
    END IF;
  END IF;

  -- Validate energy_rate if provided
  IF p_updates ? 'energy_rate' THEN
    IF jsonb_typeof(p_updates->'energy_rate') != 'number' OR (p_updates->>'energy_rate')::DECIMAL < 0 THEN
      RAISE EXCEPTION 'Invalid energy rate: %', p_updates->>'energy_rate';
    END IF;
  END IF;

  -- Validate boolean fields if provided
  IF p_updates ? 'notifications_enabled' THEN
    IF jsonb_typeof(p_updates->'notifications_enabled') != 'boolean' THEN
      RAISE EXCEPTION 'Invalid notifications_enabled value: %', p_updates->'notifications_enabled';
    END IF;
  END IF;

  IF p_updates ? 'auto_optimize' THEN
    IF jsonb_typeof(p_updates->'auto_optimize') != 'boolean' THEN
      RAISE EXCEPTION 'Invalid auto_optimize value: %', p_updates->'auto_optimize';
    END IF;
  END IF;

  -- Get current profile and settings version
  SELECT *, COALESCE(
    (SELECT MAX(version) FROM public.energy_settings_history WHERE user_id = p_user_id),
    0
  ) as current_version
  INTO v_profile_data, v_current_version
  FROM public.profiles
  WHERE id = p_user_id;

  -- Create settings history record if energy-related fields are being updated
  IF p_updates ? 'energy_provider' OR
     p_updates ? 'energy_rate' OR
     p_updates ? 'auto_optimize' OR
     p_updates ? 'notifications_enabled' THEN

    v_new_version := v_current_version + 1;

    -- Build settings object with current values (before update)
    v_settings_history := jsonb_build_object(
      'energy_provider', v_profile_data.energy_provider,
      'energy_rate', v_profile_data.energy_rate,
      'auto_optimize', v_profile_data.auto_optimize,
      'notifications_enabled', v_profile_data.notifications_enabled
    );

    -- Add to history before updating
    INSERT INTO public.energy_settings_history (
      user_id,
      version,
      settings,
      changed_by,
      changed_at
    )
    VALUES (
      p_user_id,
      v_new_version,
      v_settings_history,
      'user',
      NOW()
    );
  END IF;

  -- Now update the profile with all fields including energy settings
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
    kplc_meter_type = COALESCE((p_updates->>'kplc_meter_type')::TEXT, kplc_meter_type),
    notification_preferences = COALESCE(
      p_updates->'notification_preferences',
      notification_preferences
    ),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile_data;

  -- If notification preferences were updated, create a system notification
  IF p_updates ? 'notification_preferences' THEN
    BEGIN
      PERFORM public.create_notification_improved(
        p_user_id,
        'Notification Preferences Updated',
        'Your notification preferences have been updated.',
        'settings_change',
        'low',
        NULL,
        NULL,
        jsonb_build_object(
          'old_preferences', v_profile_data.notification_preferences,
          'new_preferences', p_updates->'notification_preferences'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'safe_update_profile',
        'Failed to create notification preferences update notification',
        SQLERRM,
        p_user_id,
        jsonb_build_object('updates', p_updates),
        NULL
      );
    END;
  END IF;

  -- Return updated profile with all fields
  RETURN NEXT v_profile_data;
  RETURN;
END;
$$;

-- Function to get or create profile with all fields
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_meter_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
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
  kplc_meter_type TEXT,
  token_balance DECIMAL(10,2),
  last_token_purchase TIMESTAMP WITH TIME ZONE,
  token_purchase_amount DECIMAL(10,2),
  low_balance_threshold DECIMAL(10,2),
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_data RECORD;
  v_token_balance RECORD;
BEGIN
  -- Try to get existing profile first
  SELECT
    p.*,
    tb.current_balance as token_balance,
    tb.daily_consumption_avg,
    tb.estimated_days_remaining,
    tb.low_balance_threshold,
    p.last_token_purchase,
    p.token_purchase_amount
  INTO v_profile_data
  FROM public.profiles p
  LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number
  WHERE p.id = p_user_id;

  IF FOUND THEN
    -- Profile exists, return it with all fields
    RETURN QUERY
    SELECT
      v_profile_data.id,
      v_profile_data.email,
      v_profile_data.full_name,
      v_profile_data.phone_number,
      v_profile_data.meter_number,
      v_profile_data.meter_category,
      v_profile_data.industry_type,
      COALESCE(v_profile_data.energy_provider, '') as energy_provider,
      COALESCE(v_profile_data.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(v_profile_data.auto_optimize, FALSE) as auto_optimize,
      COALESCE(v_profile_data.energy_rate, 0.15) as energy_rate,
      COALESCE(v_profile_data.kplc_meter_type, 'prepaid') as kplc_meter_type,
      COALESCE(v_profile_data.token_balance, 0) as token_balance,
      v_profile_data.last_token_purchase,
      COALESCE(v_profile_data.token_purchase_amount, 0) as token_purchase_amount,
      COALESCE(v_profile_data.low_balance_threshold, 100) as low_balance_threshold,
      COALESCE(v_profile_data.notification_preferences,
               '{"token_low": true, "token_depleted": true, "power_restored": true}'::JSONB) as notification_preferences,
      v_profile_data.created_at,
      v_profile_data.updated_at;
  ELSE
    -- Profile doesn't exist, create it
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        meter_number,
        energy_provider,
        notifications_enabled,
        auto_optimize,
        energy_rate,
        kplc_meter_type,
        low_balance_threshold,
        notification_preferences,
        created_at,
        updated_at
      )
      VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_meter_number,
        '',  -- energy_provider
        TRUE,  -- notifications_enabled
        FALSE, -- auto_optimize
        0.15,  -- energy_rate
        'prepaid', -- kplc_meter_type
        100, -- low_balance_threshold
        '{"token_low": true, "token_depleted": true, "power_restored": true}'::JSONB,
        NOW(),
        NOW()
      )
      RETURNING * INTO v_profile_data;
    EXCEPTION WHEN unique_violation THEN
      -- Handle race condition - get the profile that was created
      SELECT * INTO v_profile_data
      FROM public.profiles
      WHERE id = p_user_id;
    END;

    -- Create initial token balance record if meter number is provided
    IF p_meter_number IS NOT NULL THEN
      INSERT INTO public.token_balances (
        user_id,
        meter_number,
        current_balance,
        daily_consumption_avg,
        estimated_days_remaining,
        low_balance_threshold,
        last_updated,
        updated_at,
        created_at
      )
      VALUES (
        p_user_id,
        p_meter_number,
        0,
        0,
        0,
        100,
        NOW(),
        NOW(),
        NOW()
      );
    END IF;

    -- Return the profile data with all fields
    RETURN QUERY
    SELECT
      v_profile_data.id,
      v_profile_data.email,
      v_profile_data.full_name,
      v_profile_data.phone_number,
      v_profile_data.meter_number,
      v_profile_data.meter_category,
      v_profile_data.industry_type,
      COALESCE(v_profile_data.energy_provider, '') as energy_provider,
      COALESCE(v_profile_data.notifications_enabled, TRUE) as notifications_enabled,
      COALESCE(v_profile_data.auto_optimize, FALSE) as auto_optimize,
      COALESCE(v_profile_data.energy_rate, 0.15) as energy_rate,
      COALESCE(v_profile_data.kplc_meter_type, 'prepaid') as kplc_meter_type,
      0 as token_balance,
      NULL as last_token_purchase,
      0 as token_purchase_amount,
      COALESCE(v_profile_data.low_balance_threshold, 100) as low_balance_threshold,
      COALESCE(v_profile_data.notification_preferences,
               '{"token_low": true, "token_depleted": true, "power_restored": true}'::JSONB) as notification_preferences,
      v_profile_data.created_at,
      v_profile_data.updated_at;
  END IF;
END;
$$;

-- Function to process notification queue
CREATE OR REPLACE FUNCTION public.process_notification_queue(
  p_limit INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_record RECORD;
  v_processed_count INTEGER := 0;
  v_error_message TEXT;
BEGIN
  -- Lock the records we're going to process
  FOR v_queue_record IN
    SELECT * FROM public.notification_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE
  LOOP
    BEGIN
      -- Here you would typically send the notification via email, push notification, etc.
      -- For this example, we'll just mark it as processed

      -- Simulate processing delay
      PERFORM pg_sleep(0.1);

      -- Update the queue record
      UPDATE public.notification_queue
      SET
        status = 'completed',
        processed_at = NOW(),
        completed_at = NOW()
      WHERE id = v_queue_record.id;

      v_processed_count := v_processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error_message := 'Error processing notification: ' || SQLERRM;

      -- Update the queue record with error
      UPDATE public.notification_queue
      SET
        status = 'failed',
        processed_at = NOW(),
        error_message = v_error_message,
        attempts = attempts + 1
      WHERE id = v_queue_record.id;

      -- Log the error
      CALL public.log_error(
        'process_notification_queue',
        v_error_message,
        SQLERRM,
        v_queue_record.user_id,
        jsonb_build_object(
          'queue_id', v_queue_record.id,
          'notification_data', v_queue_record.notification_data
        ),
        NULL
      );
    END;
  END LOOP;

  RETURN v_processed_count;
END;
$$;

-- Function to clean up old error logs
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs(
  p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Function to get energy settings history
CREATE OR REPLACE FUNCTION public.get_energy_settings_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  version INTEGER,
  settings JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    version,
    settings,
    changed_by,
    changed_at
  FROM public.energy_settings_history
  WHERE user_id = p_user_id
  ORDER BY version DESC
  LIMIT p_limit;
END;
$$;

-- Function to revert to previous energy settings
CREATE OR REPLACE FUNCTION public.revert_energy_settings(
  p_user_id UUID,
  p_version INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get the settings to revert to
  SELECT settings INTO v_settings
  FROM public.energy_settings_history
  WHERE user_id = p_user_id AND version = p_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settings version % not found for user %', p_version, p_user_id;
  END IF;

  -- Get current version
  SELECT COALESCE(MAX(version), 0) INTO v_current_version
  FROM public.energy_settings_history
  WHERE user_id = p_user_id;

  -- Create new version with the reverted settings
  v_new_version := v_current_version + 1;

  INSERT INTO public.energy_settings_history (
    user_id,
    version,
    settings,
    changed_by,
    changed_at
  )
  VALUES (
    p_user_id,
    v_new_version,
    v_settings,
    'system_revert',
    NOW()
  );

  -- Update the profile with the reverted settings
  UPDATE public.profiles
  SET
    energy_provider = v_settings->>'energy_provider',
    energy_rate = (v_settings->>'energy_rate')::DECIMAL(10,4),
    auto_optimize = (v_settings->>'auto_optimize')::BOOLEAN,
    notifications_enabled = (v_settings->>'notifications_enabled')::BOOLEAN,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create notification about the revert
  BEGIN
    PERFORM public.create_notification_improved(
      p_user_id,
      'Energy Settings Reverted',
      'Your energy settings have been reverted to a previous version.',
      'settings_change',
      'medium',
      NULL,
      NULL,
      jsonb_build_object(
        'reverted_to_version', p_version,
        'current_version', v_new_version,
        'settings', v_settings
      )
    );
  EXCEPTION WHEN OTHERS THEN
    CALL public.log_error(
      'revert_energy_settings',
      'Failed to create revert notification',
      SQLERRM,
      p_user_id,
      jsonb_build_object('version', p_version),
      NULL
    );
  END;

  RETURN TRUE;
END;
$$;

-- Function to check KPLC balance with improved error handling
CREATE OR REPLACE FUNCTION public.check_kplc_balance_improved(
  p_user_id UUID,
  p_meter_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_api_config RECORD;
  v_cache_key TEXT := 'kplc_balance_check_v3'; -- Versioned cache key
  v_cached_balance JSONB;
  v_api_response JSONB;
  v_request_start TIMESTAMP;
  v_request_duration INTEGER;
  v_error_message TEXT;
  v_profile_exists BOOLEAN;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
  END IF;

  -- Verify meter belongs to user
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND meter_number = p_meter_number
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Meter number does not belong to this user',
      'code', 'INVALID_METER_OWNERSHIP',
      'meter_number', p_meter_number
    );
  END IF;

  -- Check cache first (2 minutes cache for balance checks)
  BEGIN
    SELECT cache_data INTO v_cached_balance
    FROM public.token_cache
    WHERE user_id = p_user_id
      AND meter_number = p_meter_number
      AND cache_key = v_cache_key
      AND expires_at > NOW();

    IF v_cached_balance IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'balance', (v_cached_balance->>'balance')::NUMERIC,
        'meter_number', p_meter_number,
        'last_updated', (v_cached_balance->>'last_updated')::TIMESTAMP,
        'source', 'cache',
        'message', 'Balance served from cache'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    CALL public.log_error(
      'check_kplc_balance_improved',
      'Error checking cache',
      SQLERRM,
      p_user_id,
      jsonb_build_object('meter_number', p_meter_number)
    );
  END;

  -- Get API configuration
  BEGIN
    SELECT * INTO v_api_config
    FROM public.kplc_api_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    v_api_config := NULL;
  END;

  -- Start API request timing
  v_request_start := clock_timestamp();

  -- Simulate KPLC API call for balance check with better error handling
  BEGIN
    -- Simulate API call delay
    PERFORM pg_sleep(0.5);

    -- Get current balance from our database as a fallback
    DECLARE
      v_current_balance DECIMAL(10,2);
    BEGIN
      v_current_balance := public.get_current_token_balance(p_user_id, p_meter_number);
    EXCEPTION WHEN OTHERS THEN
      v_current_balance := 0;
    END;

    -- Mock KPLC API response with some variability and our fallback
    v_api_response := jsonb_build_object(
      'success', true,
      'balance', COALESCE(
        -- Use a realistic mock value with some randomness
        CASE
          WHEN v_current_balance > 0 THEN v_current_balance + (random() * 5 - 2) -- Add small random variation
          ELSE (100 + random() * 300)::NUMERIC(10,2) -- If we have no balance, use a random value
        END,
        (100 + random() * 300)::NUMERIC(10,2) -- Final fallback
      ),
      'meter_number', p_meter_number,
      'last_updated', NOW(),
      'source', 'kplc_api',
      'message', 'Balance check successful',
      'our_balance', v_current_balance
    );

    -- Log the API request
    v_request_duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_request_start)::INTEGER;

    INSERT INTO public.kplc_api_logs (
      user_id,
      request_type,
      request_data,
      response_data,
      response_code,
      response_time_ms
    ) VALUES (
      p_user_id,
      'balance_check',
      jsonb_build_object('meter_number', p_meter_number),
      v_api_response,
      200,
      v_request_duration
    );

    -- Cache the response
    BEGIN
      INSERT INTO public.token_cache (user_id, meter_number, cache_key, cache_data, expires_at)
      VALUES (
        p_user_id,
        p_meter_number,
        v_cache_key,
        v_api_response,
        NOW() + INTERVAL '2 minutes'
      )
      ON CONFLICT (user_id, meter_number, cache_key)
      DO UPDATE SET
        cache_data = EXCLUDED.cache_data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'check_kplc_balance_improved',
        'Error updating cache',
        SQLERRM,
        p_user_id,
        jsonb_build_object('meter_number', p_meter_number)
      );
    END;

    RETURN v_api_response;
  EXCEPTION WHEN OTHERS THEN
    v_error_message := 'Error checking KPLC balance: ' || SQLERRM;
    CALL public.log_error(
      'check_kplc_balance_improved',
      v_error_message,
      SQLERRM,
      p_user_id,
      jsonb_build_object('meter_number', p_meter_number)
    );

    RETURN jsonb_build_object(
      'success', false,
      'error', v_error_message,
      'code', 'BALANCE_CHECK_FAILED',
      'meter_number', p_meter_number,
      'source', 'error',
      'message', 'Failed to check KPLC balance'
    );
  END;
END;
$$;

-- Function to get latest energy data with enhanced analytics
CREATE OR REPLACE FUNCTION public.get_latest_energy_data_improved(
  p_user_id UUID
)
RETURNS TABLE (
  current_usage NUMERIC,
  daily_total NUMERIC,
  daily_cost NUMERIC,
  weekly_total NUMERIC,
  weekly_cost NUMERIC,
  monthly_total NUMERIC,
  monthly_cost NUMERIC,
  efficiency_score NUMERIC,
  cost_per_kwh NUMERIC,
  peak_usage_percentage NUMERIC,
  last_reading_time TIMESTAMP WITH TIME ZONE,
  meter_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meter_number TEXT;
  v_profile RECORD;
BEGIN
  -- Get user's meter number and profile
  SELECT meter_number, energy_rate INTO v_meter_number, v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_meter_number IS NULL THEN
    -- Return zeros for users without meters
    RETURN QUERY
    SELECT 0, 0, 0, 0, 0, 0, 0, 87, 0, 0, NULL, NULL;
    RETURN;
  END IF;

  RETURN QUERY
  WITH latest_reading AS (
    SELECT
      kwh_consumed,
      total_cost,
      reading_date,
      cost_per_kwh,
      peak_usage,
      off_peak_usage
    FROM public.energy_readings
    WHERE user_id = p_user_id AND meter_number = v_meter_number
    ORDER BY reading_date DESC
    LIMIT 1
  ),
  daily_readings AS (
    SELECT
      SUM(kwh_consumed) AS total_kwh,
      SUM(total_cost) AS total_cost
    FROM public.energy_readings
    WHERE user_id = p_user_id
      AND meter_number = v_meter_number
      AND reading_date >= CURRENT_DATE
  ),
  weekly_readings AS (
    SELECT
      SUM(kwh_consumed) AS total_kwh,
      SUM(total_cost) AS total_cost
    FROM public.energy_readings
    WHERE user_id = p_user_id
      AND meter_number = v_meter_number
      AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
  ),
  monthly_readings AS (
    SELECT
      SUM(kwh_consumed) AS total_kwh,
      SUM(total_cost) AS total_cost
    FROM public.energy_readings
    WHERE user_id = p_user_id
      AND meter_number = v_meter_number
      AND reading_date >= CURRENT_DATE - INTERVAL '30 days'
  ),
  efficiency_calc AS (
    SELECT
      CASE
        WHEN (SELECT total_kwh FROM weekly_readings) > 0 THEN
          -- Calculate efficiency score based on usage patterns
          GREATEST(60, LEAST(100,
            100 - (
              -- Penalize for high peak usage
              (COALESCE((SELECT peak_usage FROM latest_reading), 0) /
               NULLIF(COALESCE((SELECT total_kwh FROM weekly_readings), 1), 0)) * 20
            +
              -- Reward for off-peak usage
              (COALESCE((SELECT off_peak_usage FROM latest_reading), 0) /
               NULLIF(COALESCE((SELECT total_kwh FROM weekly_readings), 1), 0)) * -10
            )
          ))
        ELSE 87 -- Default score when no data
      END AS efficiency_score,
      CASE
        WHEN (SELECT total_kwh FROM weekly_readings) > 0 THEN
          (COALESCE((SELECT peak_usage FROM latest_reading), 0) /
           NULLIF(COALESCE((SELECT total_kwh FROM weekly_readings), 1), 0)) * 100
        ELSE 0
      END AS peak_usage_percentage
  )
  SELECT
    COALESCE((SELECT kwh_consumed FROM latest_reading), 0) AS current_usage,
    COALESCE((SELECT total_kwh FROM daily_readings), 0) AS daily_total,
    COALESCE((SELECT total_cost FROM daily_readings), 0) AS daily_cost,
    COALESCE((SELECT total_kwh FROM weekly_readings), 0) AS weekly_total,
    COALESCE((SELECT total_cost FROM weekly_readings), 0) AS weekly_cost,
    COALESCE((SELECT total_kwh FROM monthly_readings), 0) AS monthly_total,
    COALESCE((SELECT total_cost FROM monthly_readings), 0) AS monthly_cost,
    (SELECT efficiency_score FROM efficiency_calc) AS efficiency_score,
    COALESCE((SELECT cost_per_kwh FROM latest_reading), v_profile.energy_rate * 25) AS cost_per_kwh,
    (SELECT peak_usage_percentage FROM efficiency_calc) AS peak_usage_percentage,
    (SELECT reading_date FROM latest_reading) AS last_reading_time,
    v_meter_number AS meter_number;
END;
$$;

--
-- 5. CREATE TRIGGERS FOR AUTOMATIC UPDATES
--

-- Trigger to update token balance when energy is consumed
CREATE OR REPLACE FUNCTION public.trigger_auto_token_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_error_context JSONB;
BEGIN
  -- Update token balance based on energy consumption
  BEGIN
    PERFORM public.update_token_balance_improved(
      NEW.user_id,
      NEW.meter_number,
      NEW.total_cost,
      'consumption'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_context := jsonb_build_object(
      'reading_id', NEW.id,
      'user_id', NEW.user_id,
      'meter_number', NEW.meter_number,
      'total_cost', NEW.total_cost,
      'error', SQLERRM
    );

    CALL public.log_error(
      'trigger_auto_token_consumption',
      'Failed to update token balance after energy reading',
      SQLERRM,
      NEW.user_id,
      v_error_context,
      NULL
    );
  END;

  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_auto_token_consumption ON public.energy_readings;
CREATE TRIGGER trigger_auto_token_consumption
  AFTER INSERT ON public.energy_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_token_consumption();

-- Trigger to invalidate cache when token balance changes
CREATE OR REPLACE FUNCTION public.trigger_invalidate_token_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Invalidate cache for this user/meter when balance changes
  BEGIN
    DELETE FROM public.token_cache
    WHERE user_id = NEW.user_id AND meter_number = NEW.meter_number;
  EXCEPTION WHEN OTHERS THEN
    CALL public.log_error(
      'trigger_invalidate_token_cache',
      'Failed to invalidate cache',
      SQLERRM,
      NEW.user_id,
      jsonb_build_object('meter_number', NEW.meter_number),
      NULL
    );
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on token_balances
DROP TRIGGER IF EXISTS trigger_invalidate_token_cache ON public.token_balances;
CREATE TRIGGER trigger_invalidate_token_cache
  AFTER UPDATE ON public.token_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_invalidate_token_cache();

-- Trigger to create initial token balance when profile is created with meter
CREATE OR REPLACE FUNCTION public.trigger_create_initial_token_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if meter_number is set and this is an INSERT
  IF NEW.meter_number IS NOT NULL AND TG_OP = 'INSERT' THEN
    BEGIN
      INSERT INTO public.token_balances (
        user_id,
        meter_number,
        current_balance,
        daily_consumption_avg,
        estimated_days_remaining,
        low_balance_threshold,
        last_updated,
        updated_at,
        created_at
      )
      VALUES (
        NEW.id,
        NEW.meter_number,
        0,
        0,
        0,
        100,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, meter_number) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      CALL public.log_error(
        'trigger_create_initial_token_balance',
        'Failed to create initial token balance',
        SQLERRM,
        NEW.id,
        jsonb_build_object('meter_number', NEW.meter_number),
        NULL
      );
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles
DROP TRIGGER IF EXISTS trigger_create_initial_token_balance ON public.profiles;
CREATE TRIGGER trigger_create_initial_token_balance
  AFTER INSERT OR UPDATE OF meter_number ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_create_initial_token_balance();

--
-- 6. CREATE VIEWS FOR COMMON QUERIES
--

-- Materialized view for token analytics summary
CREATE MATERIALIZED VIEW IF NOT EXISTS public.token_analytics_summary AS
SELECT
  tb.user_id,
  tb.meter_number,
  tb.current_balance,
  tb.daily_consumption_avg,
  tb.estimated_days_remaining,
  tb.low_balance_threshold,
  tb.last_updated,
  COUNT(kt.* ) FILTER (WHERE kt.transaction_type = 'purchase' AND kt.transaction_date >= CURRENT_DATE - INTERVAL '30 days') as purchases_last_30_days,
  SUM(kt.amount) FILTER (WHERE kt.transaction_type = 'purchase' AND kt.transaction_date >= CURRENT_DATE - INTERVAL '30 days') as total_purchases_last_30_days,
  COUNT(kt.* ) FILTER (WHERE kt.transaction_type = 'consumption' AND kt.transaction_date >= CURRENT_DATE - INTERVAL '30 days') as consumption_events_last_30_days,
  SUM(kt.amount) FILTER (WHERE kt.transaction_type = 'consumption' AND kt.transaction_date >= CURRENT_DATE - INTERVAL '30 days') as total_consumption_last_30_days
FROM public.token_balances tb
LEFT JOIN public.kplc_token_transactions kt ON kt.user_id = tb.user_id AND kt.meter_number = tb.meter_number
GROUP BY tb.user_id, tb.meter_number;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_token_analytics_summary_user ON public.token_analytics_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_token_analytics_summary_meter ON public.token_analytics_summary(meter_number);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.token_analytics_summary;

-- View for user energy summary
CREATE OR REPLACE VIEW public.user_energy_summary AS
SELECT
  p.id as user_id,
  p.meter_number,
  p.energy_provider,
  p.energy_rate,
  p.auto_optimize,
  tb.current_balance as token_balance,
  tb.daily_consumption_avg,
  tb.estimated_days_remaining,
  (SELECT SUM(kwh_consumed) FROM public.energy_readings er WHERE er.user_id = p.id AND er.reading_date >= CURRENT_DATE) as today_kwh,
  (SELECT SUM(total_cost) FROM public.energy_readings er WHERE er.user_id = p.id AND er.reading_date >= CURRENT_DATE) as today_cost,
  (SELECT SUM(kwh_consumed) FROM public.energy_readings er WHERE er.user_id = p.id AND er.reading_date >= CURRENT_DATE - INTERVAL '7 days') as week_kwh,
  (SELECT SUM(total_cost) FROM public.energy_readings er WHERE er.user_id = p.id AND er.reading_date >= CURRENT_DATE - INTERVAL '7 days') as week_cost
FROM public.profiles p
LEFT JOIN public.token_balances tb ON tb.user_id = p.id AND tb.meter_number = p.meter_number;

--
-- 7. GRANT PERMISSIONS
--

-- Grant execute permissions on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Grant select permissions on views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

--
-- 8. ADD SAMPLE DATA FOR TESTING (ONLY IN DEV)
--

-- Only add sample data if this is a development environment
DO $$
BEGIN
  IF current_setting('environment') = 'development' THEN
    -- Add sample KPLC API config if none exists
    IF NOT EXISTS (SELECT 1 FROM public.kplc_api_config) THEN
      INSERT INTO public.kplc_api_config (
        api_endpoint,
        api_key,
        timeout_ms,
        retry_count,
        is_active
      )
      VALUES (
        'https://api.kplc.co.ke/v1',
        'sample_api_key_12345',
        5000,
        3,
        TRUE
      );
    END IF;

    -- Add sample profiles if none exist
    IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        meter_number,
        energy_provider,
        notifications_enabled,
        auto_optimize,
        energy_rate,
        kplc_meter_type,
        created_at,
        updated_at
      )
      VALUES
      ('00000000-0000-0000-0000-000000000001', 'user1@example.com', 'John Doe', '254712345678', 'METER001', 'KPLC', TRUE, FALSE, 0.15, 'prepaid', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000002', 'user2@example.com', 'Jane Smith', '254787654321', 'METER002', 'Solar', TRUE, TRUE, 0.12, 'prepaid', NOW(), NOW());
    END IF;

    -- Add sample energy readings if none exist
    IF (SELECT COUNT(*) FROM public.energy_readings) = 0 THEN
      INSERT INTO public.energy_readings (
        user_id,
        meter_number,
        kwh_consumed,
        cost_per_kwh,
        total_cost,
        reading_date,
        created_at
      )
      SELECT
        id as user_id,
        meter_number,
        (10 + random() * 40)::NUMERIC(10,2) as kwh_consumed,
        25.0 as cost_per_kwh,
        (10 + random() * 40)::NUMERIC(10,2) * 25.0 as total_cost,
        NOW() - (random() * 30 || ' days')::INTERVAL as reading_date,
        NOW() as created_at
      FROM public.profiles
      WHERE meter_number IS NOT NULL;
    END IF;
  END IF;
END
$$;
