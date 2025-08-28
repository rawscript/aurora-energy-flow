-- Add energy_provider column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'energy_provider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN energy_provider TEXT;
    COMMENT ON COLUMN profiles.energy_provider IS 'The energy provider for the user (e.g., KPLC, Solar)';
    UPDATE profiles SET energy_provider = 'KPLC' WHERE energy_provider IS NULL;
  END IF;
END $$;
