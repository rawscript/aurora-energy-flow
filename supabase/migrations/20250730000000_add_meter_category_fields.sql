-- Add meter_category and industry_type columns to profiles table
ALTER TABLE profiles 
ADD COLUMN meter_category VARCHAR(20) DEFAULT NULL,
ADD COLUMN industry_type VARCHAR(20) DEFAULT NULL;

-- Create an enum type for meter categories
CREATE TYPE meter_category_enum AS ENUM ('household', 'SME', 'industry');

-- Create an enum type for industry types
CREATE TYPE industry_type_enum AS ENUM ('heavyduty', 'medium', 'light');

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.meter_category IS 'Type of meter: household, SME, or industry';
COMMENT ON COLUMN profiles.industry_type IS 'For industry category only: heavyduty, medium, or light';