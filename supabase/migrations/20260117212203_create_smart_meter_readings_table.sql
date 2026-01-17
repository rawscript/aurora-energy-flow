-- Create smart meter readings table
CREATE TABLE IF NOT EXISTS public.smart_meter_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meter_id TEXT NOT NULL,
    voltage_rms NUMERIC(10,2),
    current_rms NUMERIC(10,4),
    power NUMERIC(10,2),
    energy NUMERIC(12,4),
    temperature NUMERIC(6,2),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_user_id ON public.smart_meter_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_meter_id ON public.smart_meter_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_timestamp ON public.smart_meter_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_smart_meter_readings_created_at ON public.smart_meter_readings(created_at);

-- Enable RLS
ALTER TABLE public.smart_meter_readings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own smart meter readings" 
ON public.smart_meter_readings 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own smart meter readings" 
ON public.smart_meter_readings 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smart meter readings" 
ON public.smart_meter_readings 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smart meter readings" 
ON public.smart_meter_readings 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_smart_meter_readings_updated_at ON public.smart_meter_readings;
CREATE TRIGGER update_smart_meter_readings_updated_at
    BEFORE UPDATE ON public.smart_meter_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO public.smart_meter_readings (meter_id, voltage_rms, current_rms, power, energy, temperature, raw_payload)
VALUES 
    ('SM-001-AURORA', 230.5, 2.15, 495.58, 12.5, 28.3, '{"test": "sample_data_1"}'),
    ('4410627882', 228.7, 1.89, 432.24, 8.7, 26.8, '{"test": "sample_data_2"}')
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON public.smart_meter_readings TO authenticated;
GRANT ALL ON public.smart_meter_readings TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;