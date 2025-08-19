-- Create meter_history table to store historical meter configurations
CREATE TABLE IF NOT EXISTS meter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meter_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  location TEXT,
  meter_category meter_category_enum DEFAULT 'household',
  industry_type industry_type_enum DEFAULT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add CHECK constraints to enforce data integrity
ALTER TABLE meter_history 
ADD CONSTRAINT check_meter_number_not_empty CHECK (LENGTH(TRIM(meter_number)) > 0),
ADD CONSTRAINT check_full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0),
ADD CONSTRAINT check_industry_type_only_for_industry CHECK (
  (meter_category = 'industry' AND industry_type IS NOT NULL) OR 
  (meter_category != 'industry' AND industry_type IS NULL)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS meter_history_user_id_idx ON meter_history(user_id);
CREATE INDEX IF NOT EXISTS meter_history_meter_number_idx ON meter_history(meter_number);
CREATE INDEX IF NOT EXISTS meter_history_is_current_idx ON meter_history(is_current);
CREATE INDEX IF NOT EXISTS meter_history_created_at_idx ON meter_history(created_at DESC);

-- Add RLS policies
ALTER TABLE meter_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own meter history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meter_history' 
    AND policyname = 'users_select_own_meter_history'
  ) THEN
    CREATE POLICY users_select_own_meter_history ON meter_history
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy for users to insert only their own meter history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meter_history' 
    AND policyname = 'users_insert_own_meter_history'
  ) THEN
    CREATE POLICY users_insert_own_meter_history ON meter_history
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy for users to update only their own meter history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meter_history' 
    AND policyname = 'users_update_own_meter_history'
  ) THEN
    CREATE POLICY users_update_own_meter_history ON meter_history
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy for users to delete only their own meter history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'meter_history' 
    AND policyname = 'users_delete_own_meter_history'
  ) THEN
    CREATE POLICY users_delete_own_meter_history ON meter_history
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_meter_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_meter_history_updated_at_trigger ON meter_history;
CREATE TRIGGER update_meter_history_updated_at_trigger
  BEFORE UPDATE ON meter_history
  FOR EACH ROW
  EXECUTE FUNCTION update_meter_history_updated_at();

-- Function to ensure only one current meter per user
CREATE OR REPLACE FUNCTION ensure_single_current_meter()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a meter as current, unset all other current meters for this user
  IF NEW.is_current = TRUE THEN
    UPDATE meter_history 
    SET is_current = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_current = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one current meter per user
DROP TRIGGER IF EXISTS ensure_single_current_meter_trigger ON meter_history;
CREATE TRIGGER ensure_single_current_meter_trigger
  BEFORE INSERT OR UPDATE ON meter_history
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_meter();

-- Add comment to explain the table
COMMENT ON TABLE meter_history IS 'Stores historical meter configurations for users';
COMMENT ON COLUMN meter_history.is_current IS 'Indicates if this is the currently active meter for the user';
COMMENT ON COLUMN meter_history.meter_category IS 'Type of meter: household, SME, or industry';
COMMENT ON COLUMN meter_history.industry_type IS 'For industry category only: heavyduty, medium, or light';