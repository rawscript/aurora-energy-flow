-- Create the get_latest_energy_data function
CREATE OR REPLACE FUNCTION public.get_latest_energy_data(p_user_id UUID)
RETURNS TABLE (
  current_usage NUMERIC,
  daily_total NUMERIC,
  daily_cost NUMERIC,
  efficiency_score NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH latest_reading AS (
    SELECT 
      kwh_consumed,
      total_cost,
      reading_date
    FROM 
      energy_readings
    WHERE 
      user_id = p_user_id
    ORDER BY 
      reading_date DESC
    LIMIT 1
  ),
  daily_readings AS (
    SELECT 
      SUM(kwh_consumed) AS total_kwh,
      SUM(total_cost) AS total_cost
    FROM 
      energy_readings
    WHERE 
      user_id = p_user_id
      AND reading_date >= CURRENT_DATE
  )
  SELECT
    COALESCE((SELECT kwh_consumed FROM latest_reading), 0) AS current_usage,
    COALESCE((SELECT total_kwh FROM daily_readings), 0) AS daily_total,
    COALESCE((SELECT total_cost FROM daily_readings), 0) AS daily_cost,
    -- Calculate efficiency score (simplified version)
    CASE 
      WHEN (SELECT total_kwh FROM daily_readings) > 0 THEN
        GREATEST(60, LEAST(100, 100 - ((SELECT total_kwh FROM daily_readings) * 2)))
      ELSE 87 -- Default score when no data
    END AS efficiency_score;
END;
$$;

-- Check if insert_energy_reading function exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'insert_energy_reading' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Create the insert_energy_reading function
    CREATE OR REPLACE FUNCTION public.insert_energy_reading(
      p_user_id UUID,
      p_meter_number TEXT,
      p_kwh_consumed NUMERIC,
      p_cost_per_kwh NUMERIC DEFAULT 25.0
    )
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_total_cost NUMERIC;
      v_reading_id UUID;
    BEGIN
      -- Calculate total cost
      v_total_cost := p_kwh_consumed * p_cost_per_kwh;
      
      -- Insert the reading
      INSERT INTO energy_readings (
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
        v_total_cost,
        NOW()
      )
      RETURNING id INTO v_reading_id;
      
      RETURN v_reading_id::TEXT;
    END;
    $$;
  END IF;
END
$$;