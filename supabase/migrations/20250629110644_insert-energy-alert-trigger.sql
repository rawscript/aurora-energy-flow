-- Enable real-time functionality
ALTER TABLE public.energy_readings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_readings;

-- Create function to insert smart meter readings
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

-- Grant permission to call the function
GRANT EXECUTE ON FUNCTION public.insert_energy_reading(uuid, text, numeric, numeric) TO anon, authenticated;

-- Comment helps Supabase schema cache pick it up
COMMENT ON FUNCTION public.insert_energy_reading(uuid, text, numeric, numeric) IS 'Insert new smart meter reading with cost calculation';

-- Create function to fetch user’s latest energy data
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

-- Grant permission to fetch energy insights
GRANT EXECUTE ON FUNCTION public.get_latest_energy_data(uuid) TO authenticated;

-- Optional: Allow users to call energy_reading-related functions
CREATE POLICY "Allow energy insights access"
  ON public.energy_readings
  FOR ALL
  USING (auth.uid() = user_id);
