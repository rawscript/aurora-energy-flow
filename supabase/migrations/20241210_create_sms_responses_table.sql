-- Create SMS responses table for storing incoming SMS from KPLC
CREATE TABLE IF NOT EXISTS sms_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('balance', 'token', 'general')),
  sender TEXT DEFAULT '95551',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_responses_phone_type ON sms_responses(phone_number, type);
CREATE INDEX IF NOT EXISTS idx_sms_responses_created_at ON sms_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_responses_processed ON sms_responses(processed);

-- Enable RLS
ALTER TABLE sms_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SMS responses" ON sms_responses
  FOR SELECT USING (
    phone_number IN (
      SELECT phone_number FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all SMS responses" ON sms_responses
  FOR ALL USING (auth.role() = 'service_role');

-- Add source column to existing tables to track SMS vs Puppeteer data
ALTER TABLE kplc_bills ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'puppeteer' CHECK (source IN ('puppeteer', 'sms', 'manual'));
ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'puppeteer' CHECK (source IN ('puppeteer', 'sms', 'manual'));

-- Create function to handle incoming SMS webhook
CREATE OR REPLACE FUNCTION handle_incoming_sms(
  p_phone_number TEXT,
  p_message TEXT,
  p_sender TEXT DEFAULT '95551'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT := 'general';
BEGIN
  -- Determine SMS type based on content
  IF p_message ~* 'balance|bal|amount|bill' THEN
    v_type := 'balance';
  ELSIF p_message ~* 'token|units|ksh|purchase' THEN
    v_type := 'token';
  END IF;

  -- Insert SMS response
  INSERT INTO sms_responses (phone_number, message, type, sender, metadata)
  VALUES (
    p_phone_number,
    p_message,
    v_type,
    p_sender,
    jsonb_build_object(
      'received_at', NOW(),
      'auto_classified', true,
      'classification_confidence', 
      CASE 
        WHEN v_type != 'general' THEN 'high'
        ELSE 'low'
      END
    )
  );
END;
$$;

-- Create function to clean up old SMS responses (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_sms_responses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM sms_responses 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Create a scheduled job to clean up old SMS responses (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-sms-responses', '0 2 * * *', 'SELECT cleanup_old_sms_responses();');

COMMENT ON TABLE sms_responses IS 'Stores incoming SMS responses from KPLC for processing';
COMMENT ON FUNCTION handle_incoming_sms IS 'Processes incoming SMS from KPLC and stores them with automatic classification';
COMMENT ON FUNCTION cleanup_old_sms_responses IS 'Removes SMS responses older than 30 days to keep the table clean';