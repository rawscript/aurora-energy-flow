-- This script combines all the required functions for the smart meter to work

-- Create a function to safely log errors (simplified version)
CREATE OR REPLACE PROCEDURE public.log_error(
  p_function_name TEXT,
  p_error_message TEXT,
  p_error_detail TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple error logging - just output to console
  RAISE NOTICE 'ERROR in %: % (Detail: %)', p_function_name, p_error_message, p_error_detail;
EXCEPTION WHEN OTHERS THEN
  -- If error logging fails, just continue
  NULL;
END;
$$;

-- Create a simple notification function
CREATE OR REPLACE FUNCTION public.create_notification_improved(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_severity TEXT DEFAULT 'low',
  p_token_balance DECIMAL(10,2) DEFAULT NULL,
  p_estimated_days INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple notification - just return a generated UUID
  RETURN gen_random_uuid();
END;
$$;

-- Create the insert_energy_reading_improved function
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

  -- Update token balance for consumption (with error handling)
  BEGIN
    PERFORM public.update_token_balance_improved(
      p_user_id,
      p_meter_number,
      v_total_cost,
      'consumption'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Simple error logging
    RAISE NOTICE 'Failed to update token balance after energy reading: %', SQLERRM;
  END;

  RETURN v_reading_id::TEXT;
END;
$$;

-- Create the update_token_balance_improved function
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

  -- Get current balance or create new record
  BEGIN
    -- Try to get existing balance
    SELECT * INTO v_current_balance
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
    ELSE
      v_daily_avg := v_current_balance.daily_consumption_avg;
    END IF;

    -- Calculate new balance based on transaction type
    IF p_transaction_type = 'purchase' THEN
      v_new_balance := v_current_balance + p_amount;
    ELSIF p_transaction_type = 'refund' THEN
      v_new_balance := v_current_balance + p_amount;
    ELSE -- consumption
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
      p_amount,
      p_reference_number,
      p_vendor,
      p_payment_method,
      v_current_balance,
      v_new_balance,
      'completed',
      NOW(),
      NOW()
    );

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

    RETURN v_new_balance;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Unexpected error in update_token_balance_improved: %', SQLERRM;
    RAISE;
  END;
END;
$$;