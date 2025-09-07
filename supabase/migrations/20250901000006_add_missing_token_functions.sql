-- Add missing token functions
-- This migration adds the token functions that are being called by the frontend but are missing

-- Create function to get token analytics (cached version)
CREATE OR REPLACE FUNCTION public.get_token_analytics_cached(
  p_user_id UUID,
  p_force_refresh BOOLEAN DEFAULT FALSE
  
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- For now, return a default response
  -- In a real implementation, this would get analytics from the token_balances table
  RETURN jsonb_build_object(
    'success', TRUE,
    'current_balance', 0.00,
    'daily_consumption_avg', 0.00,
    'estimated_days_remaining', 0,
    'monthly_spending', 0.00,
    'last_purchase_date', NULL,
    'consumption_trend', 'stable',
    'last_updated', NOW(),
    'data_source', 'default',
    'cache_hit', FALSE
  );
END;
$$;

-- Create function to get token transactions (cached version)
CREATE OR REPLACE FUNCTION public.get_token_transactions_cached(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, return a default response
  -- In a real implementation, this would get transactions from the kplc_token_transactions table
  RETURN jsonb_build_object(
    'success', TRUE,
    'transactions', '[]'::JSON
  );
END;
$$;