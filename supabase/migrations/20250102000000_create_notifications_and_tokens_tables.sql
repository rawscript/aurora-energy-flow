-- Create notifications table for better notification management
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'success', 'token_low', 'token_purchase', etc.
  severity TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  is_read BOOLEAN NOT NULL DEFAULT false,
  token_balance DECIMAL(10,2) NULL, -- For token-related notifications
  estimated_days INTEGER NULL, -- For token depletion notifications
  metadata JSONB NULL, -- Additional data for notifications
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL -- Optional expiration for notifications
);

-- Create KPLC token transactions table for proper token management
CREATE TABLE IF NOT EXISTS public.kplc_token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meter_number TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'consumption', 'refund', 'adjustment'
  amount DECIMAL(10,2) NOT NULL, -- Amount in KSh
  token_units DECIMAL(10,2) NULL, -- Token units (kWh equivalent)
  token_code TEXT NULL, -- The actual token code for purchases
  reference_number TEXT NULL, -- Transaction reference
  vendor TEXT NULL, -- 'M-PESA', 'Airtel Money', 'Bank', etc.
  payment_method TEXT NULL, -- Payment method details
  balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
  metadata JSONB NULL, -- Additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create token balance tracking table
CREATE TABLE IF NOT EXISTS public.token_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meter_number TEXT NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  daily_consumption_avg DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_days_remaining INTEGER NOT NULL DEFAULT 0,
  low_balance_threshold DECIMAL(10,2) NOT NULL DEFAULT 50, -- Alert when balance goes below this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, meter_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_kplc_transactions_user_id ON public.kplc_token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_kplc_transactions_meter ON public.kplc_token_transactions(meter_number);
CREATE INDEX IF NOT EXISTS idx_kplc_transactions_date ON public.kplc_token_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_kplc_transactions_type ON public.kplc_token_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_token_balances_user_id ON public.token_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_token_balances_meter ON public.token_balances(meter_number);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kplc_token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for KPLC token transactions
CREATE POLICY "Users can view their own token transactions" ON public.kplc_token_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own token transactions" ON public.kplc_token_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own token transactions" ON public.kplc_token_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for token balances
CREATE POLICY "Users can view their own token balances" ON public.token_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own token balances" ON public.token_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own token balances" ON public.token_balances
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update token balance
CREATE OR REPLACE FUNCTION public.update_token_balance(
  p_user_id UUID,
  p_meter_number TEXT,
  p_amount DECIMAL(10,2),
  p_transaction_type TEXT DEFAULT 'consumption'
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
  -- Get current balance or create new record
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
    last_updated,
    updated_at
  )
  VALUES (
    p_user_id, 
    p_meter_number, 
    v_new_balance, 
    v_daily_avg, 
    v_estimated_days,
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
  
  -- Create low balance notification if needed
  IF v_new_balance <= 50 AND p_transaction_type = 'consumption' THEN
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
  END IF;
  
  RETURN v_new_balance;
END;
$$;

-- Create function to purchase tokens
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
  
  -- Create success notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    severity,
    token_balance,
    metadata
  )
  VALUES (
    p_user_id,
    'Token Purchase Successful',
    'Successfully purchased KSh ' || p_amount || ' worth of tokens for meter ' || p_meter_number,
    'token_purchase',
    'low',
    v_balance_after,
    jsonb_build_object(
      'token_code', v_token_code,
      'reference_number', v_reference_number,
      'amount', p_amount,
      'meter_number', p_meter_number
    )
  );
  
  -- Return transaction details
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'token_code', v_token_code,
    'reference_number', v_reference_number,
    'amount', p_amount,
    'token_units', v_token_units,
    'balance_after', v_balance_after,
    'message', 'Token purchase successful'
  );
END;
$$;

-- Create function to get token analytics
CREATE OR REPLACE FUNCTION public.get_token_analytics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_balance_info RECORD;
  v_monthly_spending DECIMAL(10,2);
  v_last_purchase_date TIMESTAMP WITH TIME ZONE;
  v_consumption_trend TEXT;
BEGIN
  -- Get balance information
  SELECT 
    current_balance,
    daily_consumption_avg,
    estimated_days_remaining,
    last_updated
  INTO v_balance_info
  FROM public.token_balances 
  WHERE user_id = p_user_id
  ORDER BY last_updated DESC
  LIMIT 1;
  
  -- Get monthly spending
  SELECT COALESCE(SUM(amount), 0) INTO v_monthly_spending
  FROM public.kplc_token_transactions
  WHERE user_id = p_user_id 
    AND transaction_type = 'purchase'
    AND transaction_date >= DATE_TRUNC('month', NOW());
  
  -- Get last purchase date
  SELECT transaction_date INTO v_last_purchase_date
  FROM public.kplc_token_transactions
  WHERE user_id = p_user_id 
    AND transaction_type = 'purchase'
  ORDER BY transaction_date DESC
  LIMIT 1;
  
  -- Determine consumption trend (simplified)
  SELECT 
    CASE 
      WHEN AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '7 days') > 
           AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '14 days' AND transaction_date < NOW() - INTERVAL '7 days') * 1.1
      THEN 'increasing'
      WHEN AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '7 days') < 
           AVG(amount) FILTER (WHERE transaction_date >= NOW() - INTERVAL '14 days' AND transaction_date < NOW() - INTERVAL '7 days') * 0.9
      THEN 'decreasing'
      ELSE 'stable'
    END INTO v_consumption_trend
  FROM public.kplc_token_transactions
  WHERE user_id = p_user_id 
    AND transaction_type = 'consumption'
    AND transaction_date >= NOW() - INTERVAL '14 days';
  
  -- Build result
  v_result := jsonb_build_object(
    'current_balance', COALESCE(v_balance_info.current_balance, 0),
    'daily_consumption_avg', COALESCE(v_balance_info.daily_consumption_avg, 0),
    'estimated_days_remaining', COALESCE(v_balance_info.estimated_days_remaining, 0),
    'monthly_spending', v_monthly_spending,
    'last_purchase_date', v_last_purchase_date,
    'consumption_trend', COALESCE(v_consumption_trend, 'stable'),
    'last_updated', v_balance_info.last_updated
  );
  
  RETURN v_result;
END;
$$;