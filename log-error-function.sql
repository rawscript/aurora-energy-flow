-- Create the log_error procedure
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
  -- Create error_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_detail TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    context JSONB,
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
  );

  -- Create index for error logs if it doesn't exist
  CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_error_logs_function ON public.error_logs(function_name);
  CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs(user_id);

  -- Insert the error log
  INSERT INTO public.error_logs (
    function_name,
    error_message,
    error_detail,
    user_id,
    context,
    transaction_id,
    created_at
  )
  VALUES (
    p_function_name,
    p_error_message,
    p_error_detail,
    p_user_id,
    p_context,
    p_transaction_id,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If error logging fails, just continue
  NULL;
END;
$$;