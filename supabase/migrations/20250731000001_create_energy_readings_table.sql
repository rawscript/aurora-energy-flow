-- Check if energy_readings table exists, if not create it
CREATE TABLE IF NOT EXISTS energy_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meter_number TEXT NOT NULL,
  kwh_consumed NUMERIC NOT NULL,
  cost_per_kwh NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  reading_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  peak_usage NUMERIC,
  off_peak_usage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add CHECK constraints to enforce data integrity
ALTER TABLE energy_readings 
ADD CONSTRAINT check_kwh_consumed_non_negative CHECK (kwh_consumed >= 0),
ADD CONSTRAINT check_cost_per_kwh_non_negative CHECK (cost_per_kwh >= 0),
ADD CONSTRAINT check_total_cost_non_negative CHECK (total_cost >= 0),
ADD CONSTRAINT check_peak_usage_non_negative CHECK (peak_usage IS NULL OR peak_usage >= 0),
ADD CONSTRAINT check_off_peak_usage_non_negative CHECK (off_peak_usage IS NULL OR off_peak_usage >= 0),
ADD CONSTRAINT check_billing_period_logical CHECK (
  billing_period_start IS NULL OR 
  billing_period_end IS NULL OR 
  billing_period_start <= billing_period_end
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS energy_readings_user_id_idx ON energy_readings(user_id);
CREATE INDEX IF NOT EXISTS energy_readings_meter_number_idx ON energy_readings(meter_number);
CREATE INDEX IF NOT EXISTS energy_readings_reading_date_idx ON energy_readings(reading_date);

-- Add RLS policies
ALTER TABLE energy_readings ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'energy_readings' 
    AND policyname = 'users_select_own_readings'
  ) THEN
    CREATE POLICY users_select_own_readings ON energy_readings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy for users to insert only their own readings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'energy_readings' 
    AND policyname = 'users_insert_own_readings'
  ) THEN
    CREATE POLICY users_insert_own_readings ON energy_readings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;