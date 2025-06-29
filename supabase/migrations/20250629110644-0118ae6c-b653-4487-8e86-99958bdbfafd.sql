
-- Enable real-time functionality for energy_readings table
ALTER TABLE public.energy_readings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_readings;

-- Create a function to insert smart meter readings
CREATE OR REPLACE FUNCTION public.insert_energy_reading(
  p_user_id uuid,
  p_meter_number text,
  p_kwh_consumed numeric,
  p_cost_per_kwh numeric DEFAULT 25.0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reading_id uuid;
BEGIN
  INSERT INTO public.energy_readings (
    user_id,
    meter_number,
    kwh_consumed,
    cost_per_kwh,
    total_cost,
    reading_date
  ) VALUES (
    p_user_id,
    p_meter_number,
    p_kwh_consumed,
    p_cost_per_kwh,
    p_kwh_consumed * p_cost_per_kwh,
    now()
  )
  RETURNING id INTO reading_id;
  
  RETURN reading_id;
END;
$$;

-- Create a function to get latest readings for a user
CREATE OR REPLACE FUNCTION public.get_latest_energy_data(p_user_id uuid)
RETURNS TABLE (
  current_usage numeric,
  daily_total numeric,
  daily_cost numeric,
  efficiency_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT kwh_consumed 
      FROM public.energy_readings 
      WHERE user_id = p_user_id 
      ORDER BY reading_date DESC 
      LIMIT 1
    ), 0) as current_usage,
    COALESCE((
      SELECT SUM(kwh_consumed) 
      FROM public.energy_readings 
      WHERE user_id = p_user_id 
      AND DATE(reading_date) = CURRENT_DATE
    ), 0) as daily_total,
    COALESCE((
      SELECT SUM(total_cost) 
      FROM public.energy_readings 
      WHERE user_id = p_user_id 
      AND DATE(reading_date) = CURRENT_DATE
    ), 0) as daily_cost,
    -- Calculate efficiency score based on usage patterns
    CASE 
      WHEN COALESCE((
        SELECT AVG(kwh_consumed) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
      ), 0) < 5 THEN 95
      WHEN COALESCE((
        SELECT AVG(kwh_consumed) 
        FROM public.energy_readings 
        WHERE user_id = p_user_id 
        AND reading_date >= CURRENT_DATE - INTERVAL '7 days'
      ), 0) < 8 THEN 87
      ELSE 75
    END as efficiency_score;
END;
$$;

-- Create RLS policies for the new functions
CREATE POLICY "Users can call energy functions" 
  ON public.energy_readings 
  FOR ALL 
  USING (auth.uid() = user_id);
