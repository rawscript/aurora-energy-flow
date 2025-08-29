-- Add missing energy settings columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add notifications_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE;
    COMMENT ON COLUMN profiles.notifications_enabled IS 'Whether notifications are enabled for the user';
  END IF;

  -- Add auto_optimize column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'auto_optimize'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auto_optimize BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN profiles.auto_optimize IS 'Whether auto-optimization is enabled for the user';
  END IF;

  -- Add energy_rate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_rate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN energy_rate DECIMAL(10,4) DEFAULT 0.15;
    COMMENT ON COLUMN profiles.energy_rate IS 'The energy rate in $/kWh for the user';
  END IF;
END $$;
