-- Create SMS alerts table for storing outgoing SMS alerts via Aurora
CREATE TABLE IF NOT EXISTS sms_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'general' CHECK (alert_type IN ('general', 'energy_low', 'bill_due', 'token_purchase', 'system_alert', 'maintenance', 'emergency')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
  message_id TEXT, -- Africa's Talking message ID
  cost DECIMAL(10,4) DEFAULT 0, -- SMS cost in KES
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_alerts_user_id ON sms_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_phone_number ON sms_alerts(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_status ON sms_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_alert_type ON sms_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_created_at ON sms_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_alerts_message_id ON sms_alerts(message_id) WHERE message_id IS NOT NULL;

-- Enable RLS
ALTER TABLE sms_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own SMS alerts" ON sms_alerts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own SMS alerts" ON sms_alerts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all SMS alerts" ON sms_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update SMS alert status
CREATE OR REPLACE FUNCTION update_sms_alert_status(
  p_message_id TEXT,
  p_status TEXT,
  p_delivery_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sms_alerts 
  SET 
    status = p_status,
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
    updated_at = NOW(),
    metadata = metadata || p_delivery_metadata
  WHERE message_id = p_message_id;
END;
$$;

-- Create function to get user SMS alert stats
CREATE OR REPLACE FUNCTION get_user_sms_stats(p_user_id UUID)
RETURNS TABLE(
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_cost DECIMAL,
  last_alert_sent TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    COALESCE(SUM(cost), 0) as total_cost,
    MAX(sent_at) as last_alert_sent
  FROM sms_alerts 
  WHERE user_id = p_user_id;
END;
$$;

-- Create function to clean up old SMS alerts (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_sms_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM sms_alerts 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_alerts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_sms_alerts_updated_at
  BEFORE UPDATE ON sms_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_alerts_updated_at();

-- Add alert preferences to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alert_preferences JSONB DEFAULT '{
  "energy_low": true,
  "bill_due": true,
  "token_purchase": true,
  "system_alert": true,
  "maintenance": false,
  "emergency": true
}'::jsonb;

COMMENT ON TABLE sms_alerts IS 'Stores outgoing SMS alerts sent via Aurora (Africa''s Talking)';
COMMENT ON FUNCTION update_sms_alert_status IS 'Updates SMS alert delivery status from Africa''s Talking webhooks';
COMMENT ON FUNCTION get_user_sms_stats IS 'Returns SMS statistics for a specific user';
COMMENT ON FUNCTION cleanup_old_sms_alerts IS 'Removes SMS alerts older than 90 days to keep the table clean';