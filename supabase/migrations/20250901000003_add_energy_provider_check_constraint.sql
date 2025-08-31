-- Add a check constraint to ensure energy_provider values are valid
ALTER TABLE profiles 
ADD CONSTRAINT valid_energy_provider 
CHECK (energy_provider IN ('KPLC', 'Solar', 'KenGEn', 'IPP', 'Other', ''));

-- Add a comment to explain the constraint
COMMENT ON CONSTRAINT valid_energy_provider ON profiles 
IS 'Ensures energy_provider is one of the valid values: KPLC, Solar, KenGEn, IPP, Other, or empty string';