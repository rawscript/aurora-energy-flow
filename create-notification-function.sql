-- Create the create_notification_improved function
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
DECLARE
  v_notification_id UUID;
BEGIN
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

  -- Insert the notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    severity,
    token_balance,
    estimated_days,
    metadata,
    created_at,
    updated_at
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
    NOW(),
    NOW()
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;