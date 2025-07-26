-- Add KPLC token tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN kplc_meter_type text DEFAULT 'prepaid' CHECK (kplc_meter_type IN ('prepaid', 'postpaid')),
ADD COLUMN token_balance numeric(10,2) DEFAULT 0,
ADD COLUMN last_token_purchase timestamp with time zone,
ADD COLUMN token_purchase_amount numeric(10,2) DEFAULT 0,
ADD COLUMN low_balance_threshold numeric(10,2) DEFAULT 100,
ADD COLUMN notification_preferences jsonb DEFAULT '{"token_low": true, "token_depleted": true, "power_restored": true}';

-- Create KPLC token transactions table
CREATE TABLE public.kplc_token_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'refund')),
  amount numeric(10,2) NOT NULL,
  token_units numeric(10,2),
  transaction_date timestamp with time zone NOT NULL DEFAULT now(),
  reference_number text,
  vendor text,
  meter_number text NOT NULL,
  balance_before numeric(10,2),
  balance_after numeric(10,2),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for token transactions
ALTER TABLE public.kplc_token_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for token transactions
CREATE POLICY "Users can view their own token transactions" 
  ON public.kplc_token_transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert token transactions" 
  ON public.kplc_token_transactions FOR INSERT 
  WITH CHECK (true);

-- Create function to update token balance
CREATE OR REPLACE FUNCTION public.update_token_balance(
  p_user_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_token_units numeric DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_vendor text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  current_balance numeric;
  new_balance numeric;
  transaction_id uuid;
  user_meter_number text;
BEGIN
  -- Get current balance and meter number
  SELECT token_balance, meter_number 
  INTO current_balance, user_meter_number
  FROM public.profiles 
  WHERE id = p_user_id;

  -- Calculate new balance
  CASE p_transaction_type
    WHEN 'purchase' THEN
      new_balance := current_balance + COALESCE(p_token_units, p_amount);
    WHEN 'consumption' THEN
      new_balance := GREATEST(0, current_balance - p_amount);
    WHEN 'refund' THEN
      new_balance := current_balance + p_amount;
    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END CASE;

  -- Insert transaction record
  INSERT INTO public.kplc_token_transactions (
    user_id,
    transaction_type,
    amount,
    token_units,
    reference_number,
    vendor,
    meter_number,
    balance_before,
    balance_after
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    p_token_units,
    p_reference_number,
    p_vendor,
    user_meter_number,
    current_balance,
    new_balance
  )
  RETURNING id INTO transaction_id;

  -- Update user's token balance
  UPDATE public.profiles 
  SET 
    token_balance = new_balance,
    last_token_purchase = CASE 
      WHEN p_transaction_type = 'purchase' THEN now() 
      ELSE last_token_purchase 
    END,
    token_purchase_amount = CASE 
      WHEN p_transaction_type = 'purchase' THEN p_amount 
      ELSE token_purchase_amount 
    END
  WHERE id = p_user_id;

  -- Check if we need to create low balance alert
  IF new_balance <= (SELECT low_balance_threshold FROM public.profiles WHERE id = p_user_id) THEN
    INSERT INTO public.ai_alerts (
      user_id,
      alert_type,
      title,
      message,
      severity,
      recommended_actions
    ) VALUES (
      p_user_id,
      CASE 
        WHEN new_balance <= 0 THEN 'token_depleted'
        ELSE 'token_low'
      END,
      CASE 
        WHEN new_balance <= 0 THEN 'KPLC Tokens Depleted'
        ELSE 'Low KPLC Token Balance'
      END,
      CASE 
        WHEN new_balance <= 0 THEN 'Your electricity tokens have been depleted. Please purchase new tokens immediately.'
        ELSE 'Your token balance is running low (KSh ' || new_balance::text || '). Consider purchasing more tokens soon.'
      END,
      CASE 
        WHEN new_balance <= 0 THEN 'critical'
        WHEN new_balance <= 50 THEN 'high'
        ELSE 'medium'
      END,
      jsonb_build_object(
        'tokenBalance', new_balance,
        'recommendedPurchase', GREATEST(200, new_balance * 2)
      )
    );
  END IF;

  RETURN transaction_id;
END;
$;

-- Grant permission to call the function
GRANT EXECUTE ON FUNCTION public.update_token_balance(uuid, text, numeric, numeric, text, text) TO authenticated;

-- Create function to get token balance and usage prediction
CREATE OR REPLACE FUNCTION public.get_token_analytics(p_user_id uuid)
RETURNS TABLE (
  current_balance numeric,
  daily_consumption_avg numeric,
  estimated_days_remaining integer,
  monthly_spending numeric,
  last_purchase_date timestamp with time zone,
  consumption_trend text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.token_balance as current_balance,
    
    COALESCE((
      SELECT AVG(total_cost) 
      FROM public.energy_readings 
      WHERE user_id = p_user_id 
      AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
    ), 0) as daily_consumption_avg,
    
    CASE 
      WHEN COALESCE((
        SELECT AVG(total_cost) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
      ), 0) > 0 THEN
        (p.token_balance / COALESCE((
          SELECT AVG(total_cost) 
          FROM public.energy_readings 
          WHERE user_id = p_user_id 
          AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
        ), 1))::integer
      ELSE 0
    END as estimated_days_remaining,
    
    COALESCE((
      SELECT SUM(amount) 
      FROM public.kplc_token_transactions 
      WHERE user_id = p_user_id 
      AND transaction_type = 'purchase'
      AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    ), 0) as monthly_spending,
    
    p.last_token_purchase,
    
    CASE 
      WHEN COALESCE((
        SELECT AVG(total_cost) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '3 days'
      ), 0) > COALESCE((
        SELECT AVG(total_cost) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
        AND reading_date < CURRENT_DATE - INTERVAL '3 days'
      ), 0) THEN 'increasing'
      WHEN COALESCE((
        SELECT AVG(total_cost) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '3 days'
      ), 0) < COALESCE((
        SELECT AVG(total_cost) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
        AND reading_date < CURRENT_DATE - INTERVAL '3 days'
      ), 0) THEN 'decreasing'
      ELSE 'stable'
    END as consumption_trend
    
  FROM public.profiles p
  WHERE p.id = p_user_id;
END;
$;

-- Grant permission to call the analytics function
GRANT EXECUTE ON FUNCTION public.get_token_analytics(uuid) TO authenticated;

-- Create trigger to automatically update token balance based on energy consumption
CREATE OR REPLACE FUNCTION public.auto_update_token_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  -- Update token balance based on energy consumption
  PERFORM public.update_token_balance(
    NEW.user_id,
    'consumption',
    NEW.total_cost,
    NULL,
    NULL,
    'Auto-consumption'
  );
  
  RETURN NEW;
END;
$;

-- Create trigger on energy readings
CREATE TRIGGER trigger_auto_token_consumption
  AFTER INSERT ON public.energy_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_token_consumption();

-- Add some sample token data for testing
INSERT INTO public.kplc_token_transactions (user_id, transaction_type, amount, token_units, reference_number, vendor, meter_number, balance_before, balance_after)
SELECT 
  id as user_id,
  'purchase' as transaction_type,
  500.00 as amount,
  500.00 as token_units,
  'TXN' || EXTRACT(epoch FROM now())::text as reference_number,
  'M-PESA' as vendor,
  COALESCE(meter_number, 'METER001') as meter_number,
  0 as balance_before,
  500.00 as balance_after
FROM public.profiles
WHERE meter_number IS NOT NULL;

-- Update profiles with initial token balance
UPDATE public.profiles 
SET token_balance = 500.00, 
    last_token_purchase = now(),
    token_purchase_amount = 500.00
WHERE meter_number IS NOT NULL;