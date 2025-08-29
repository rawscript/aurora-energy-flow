-- Improved Database Functions with Better Error Handling and Documentation
-- This migration enhances existing functions with better error handling, logging, and documentation

-- Create a function to safely log errors
CREATE OR REPLACE FUNCTION public.log_error(
  p_function_name TEXT,
  p_error_message TEXT,
  p_error_detail TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT NULL
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
    created_at
  )
  VALUES (
    p_function_name,
    p_error_message,
    p_error_detail,
    p_user_id,
    p_context,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If error logging fails, just continue
  NULL;
END;
$$;

-- Create error logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_detail TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_function ON public.error_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id);

-- Improved function to update token balance with better error handling
CREATE OR REPLACE FUNCTION public.update_token_balance_improved(
  p_user_id UUID,
  p_meter_number TEXT,
  p_amount DECIMAL(10,2),
  p_transaction_type TEXT DEFAULT 'consumption',
  p_force BOOLEAN DEFAULT FALSE
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
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
  END IF;

  IF p_amount IS NULL THEN
    RAISE EXCEPTION 'Amount is required';
  END IF;

  -- Get current balance or create new record
  BEGIN
    SELECT current_balance, daily_consumption_avg
    INTO v_current_balance, v_daily_avg
    FROM public.token_balances
    WHERE user_id = p_user_id AND meter_number = p_meter_number;

    -- If no balance record exists, create one
    IF v_current_balance IS NULL THEN
      v_current_balance := 0;
      v_daily_avg := 0;
    END IF;

    -- Calculate new balance based on transaction type
    IF p_transaction_type = 'purchase' THEN
      v_new_balance := v_current_balance + p_amount;
    ELSE
      v_new_balance := GREATEST(0, v_current_balance - p_amount);
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

    -- Upsert balance record
    INSERT INTO public.token_balances (
      user_id,
      meter_number,
      current_balance,
      daily_consumption_avg,
      estimated_days_remaining,
      low_balance_threshold,
      last_updated,
      updated_at
    )
    VALUES (
      p_user_id,
      p_meter_number,
      v_new_balance,
      v_daily_avg,
      v_estimated_days,
      50, -- Default low balance threshold
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, meter_number)
    DO UPDATE SET
      current_balance = v_new_balance,
      daily_consumption_avg = v_daily_avg,
      estimated_days_remaining = v_estimated_days,
      last_updated = NOW(),
      updated_at = NOW();

    -- Create low balance notification if needed and not forced
    IF v_new_balance <= 50 AND p_transaction_type = 'consumption' AND NOT p_force THEN
      BEGIN
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          severity,
          token_balance,
          estimated_days
        )
        VALUES (
          p_user_id,
          'Low Token Balance',
          'Your token balance is running low. Consider purchasing more tokens to avoid power interruption.',
          'token_low',
          CASE
            WHEN v_new_balance <= 20 THEN 'critical'
            WHEN v_new_balance <= 50 THEN 'high'
            ELSE 'medium'
          END,
          v_new_balance,
          v_estimated_days
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
            'estimated_days', v_estimated_days
          )
        );
      END;
    END IF;

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
        'force', p_force
      )
    );
    RAISE EXCEPTION '%', v_error_message;
  END;
END;
$$;

-- Improved function to purchase tokens with better error handling and KPLC API simulation
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

    -- Get current balance
    SELECT current_balance INTO v_current_balance
    FROM public.token_balances
    WHERE user_id = p_user_id AND meter_number = p_meter_number;

    IF v_current_balance IS NULL THEN
      v_current_balance := 0;
    END IF;

    -- Update balance
    v_new_balance := v_current_balance + p_amount;

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
      status,
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
      jsonb_build_object(
        'phone_number', p_phone_number,
        'simulated_api_call', true
      )
    )
    RETURNING id INTO v_transaction_id;

    -- Update token balance using the improved function
    PERFORM public.update_token_balance_improved(
      p_user_id,
      p_meter_number,
      p_amount,
      'purchase'
    );

    -- Create success notification
    BEGIN
      v_notification_id := public.create_notification(
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
          'transaction_id', v_transaction_id
        )
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
        )
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
        'units', v_token_units
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
      'balance_after', v_new_balance,
      'payment_method', p_payment_method,
      'status', 'completed',
      'message', 'Token purchase successful',
      'notification_id', v_notification_id
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
      )
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

-- Improved function to get token analytics with better caching and error handling
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
  v_cache_key TEXT := 'token_analytics_v2'; -- Versioned cache key
BEGIN
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
        COALESCE(current_balance, 0) as current_balance,
        COALESCE(daily_consumption_avg, 0) as daily_consumption_avg,
        COALESCE(estimated_days_remaining, 0) as estimated_days_remaining,
        COALESCE(last_updated, NOW()) as last_updated
      FROM public.token_balances
      WHERE user_id = p_user_id AND meter_number = v_meter_number
      LIMIT 1
    ),
    monthly_spend AS (
      SELECT COALESCE(SUM(amount), 0) as total
      FROM public.kplc_token_transactions
      WHERE user_id = p_user_id
        AND transaction_type = 'purchase'
        AND transaction_date >= date_trunc('month', NOW())
    ),
    last_purchase AS (
      SELECT transaction_date
      FROM public.kplc_token_transactions
      WHERE user_id = p_user_id
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
        AND transaction_type = 'consumption'
        AND transaction_date >= NOW() - INTERVAL '14 days'
    )

    SELECT
      bd.current_balance,
      bd.daily_consumption_avg,
      bd.estimated_days_remaining,
      ms.total as monthly_spending,
      lp.transaction_date as last_purchase_date,
      COALESCE(ct.trend, 'stable') as consumption_trend,
      bd.last_updated
    INTO v_analytics_data
    FROM balance_data bd
    CROSS JOIN monthly_spend ms
    LEFT JOIN last_purchase lp ON true
    LEFT JOIN consumption_trend ct ON true;

    -- If no data found, use defaults
    IF NOT FOUND THEN
      v_analytics_data := ROW(0, 0, 0, 0, NULL, 'stable', NOW());
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
          'last_updated', v_analytics_data.last_updated
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

-- Improved function to check KPLC balance with better error handling
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
  v_cache_key TEXT := 'kplc_balance_check_v2'; -- Versioned cache key
  v_cached_balance JSONB;
  v_api_response JSONB;
  v_request_start TIMESTAMP;
  v_request_duration INTEGER;
  v_error_message TEXT;
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL OR p_meter_number IS NULL THEN
    RAISE EXCEPTION 'User ID and meter number are required';
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
    WHERE id = (SELECT id FROM public.kplc_api_config ORDER BY created_at DESC LIMIT 1);
  EXCEPTION WHEN NO_DATA_FOUND THEN
    v_api_config := NULL;
  END;

  -- Start API request timing
  v_request_start := clock_timestamp();

  -- Simulate KPLC API call for balance check with better error handling
  BEGIN
    -- Simulate API call delay
    PERFORM pg_sleep(0.5);

    -- Mock KPLC API response with some variability
    v_api_response := jsonb_build_object(
      'success', true,
      'balance', (100 + random() * 300)::NUMERIC(10,2),
      'meter_number', p_meter_number,
      'last_updated', NOW(),
      'source', 'kplc_api',
      'message', 'Balance check successful'
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

-- Create a function to clean up old error logs
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
