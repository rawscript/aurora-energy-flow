-- Update existing profiles to have empty energy_provider as default instead of KPLC
-- This makes it easier to transition to any energy provider
UPDATE profiles 
SET energy_provider = '' 
WHERE energy_provider = 'KPLC' OR energy_provider IS NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN profiles.energy_provider IS 'The energy provider for the user. Empty string means not set yet. Valid values: KPLC, Solar, KenGEn, IPP, Other';