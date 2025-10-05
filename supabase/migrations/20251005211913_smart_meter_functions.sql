-- Deploy only the functions required for smart meter to work
-- This avoids the conflicts with other functions

-- Drop the energy reading functions if they exist
DROP FUNCTION IF EXISTS public.insert_energy_reading_improved(UUID, TEXT, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.update_token_balance_improved(UUID, TEXT, DECIMAL, TEXT, BOOLEAN, TEXT, TEXT, TEXT);

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
            'amount', p_amount,
            'transaction_type', p_transaction_type
          )
        );
        v_notification_created := TRUE;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        v_error_message := SQLERRM;
        CALL public.log_error(
          'update_token_balance_improved',
          'Failed to create low balance notification',
          v_error_message,
          p_user_id,
          jsonb_build_object(
            'user_id', p_user_id,
            'meter_number', p_meter_number,
            'balance', v_new_balance,
            'transaction_type', p_transaction_type
          ),
          v_transaction_id
        );
      END;
    END IF;

    RETURN v_new_balance;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error
    v_error_message := SQLERRM;
    CALL public.log_error(
      'update_token_balance_improved',
      'Unexpected error in update_token_balance_improved',
      v_error_message,
      p_user_id,
      jsonb_build_object(
        'user_id', p_user_id,
        'meter_number', p_meter_number,
        'amount', p_amount,
        'transaction_type', p_transaction_type
      ),
      v_transaction_id
    );
    RAISE;
  END;
END;
$$;