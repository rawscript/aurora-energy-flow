-- Add solar-specific columns to energy_readings table
ALTER TABLE energy_readings 
ADD COLUMN IF NOT EXISTS battery_state NUMERIC,
ADD COLUMN IF NOT EXISTS power_generated NUMERIC,
ADD COLUMN IF NOT EXISTS load_consumption NUMERIC,
ADD COLUMN IF NOT EXISTS battery_count INTEGER;

-- Add CHECK constraints to enforce data integrity for new columns
ALTER TABLE energy_readings 
ADD CONSTRAINT check_battery_state_non_negative CHECK (battery_state IS NULL OR battery_state >= 0),
ADD CONSTRAINT check_power_generated_non_negative CHECK (power_generated IS NULL OR power_generated >= 0),
ADD CONSTRAINT check_load_consumption_non_negative CHECK (load_consumption IS NULL OR load_consumption >= 0),
ADD CONSTRAINT check_battery_count_non_negative CHECK (battery_count IS NULL OR battery_count >= 0);