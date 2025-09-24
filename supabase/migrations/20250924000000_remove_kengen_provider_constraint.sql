-- Remove KenGEn from the energy provider constraint
-- First drop the existing constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS valid_energy_provider;

-- Add the updated constraint without KenGEn
ALTER TABLE profiles 
ADD CONSTRAINT valid_energy_provider 
CHECK (energy_provider IN ('KPLC', 'Solar', 'IPP', 'Other', ''));

-- Update the comment to reflect the change
COMMENT ON CONSTRAINT valid_energy_provider ON profiles 
IS 'Ensures energy_provider is one of the valid values: KPLC, Solar, IPP, Other, or empty string';