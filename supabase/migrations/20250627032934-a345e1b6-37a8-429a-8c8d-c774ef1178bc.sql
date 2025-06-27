
-- Create user profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  phone_number text,
  meter_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create energy readings table for storing Kenya Power data
CREATE TABLE public.energy_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  meter_number text NOT NULL,
  reading_date timestamp with time zone NOT NULL DEFAULT now(),
  kwh_consumed decimal(10,2) NOT NULL,
  peak_usage decimal(10,2),
  off_peak_usage decimal(10,2),
  cost_per_kwh decimal(6,4) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  billing_period_start date,
  billing_period_end date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create AI alerts table for predictive messaging
CREATE TABLE public.ai_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('high_usage', 'cost_spike', 'maintenance', 'efficiency_tip', 'bill_reminder')),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read boolean NOT NULL DEFAULT false,
  prediction_confidence decimal(3,2),
  recommended_actions jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create billing history table
CREATE TABLE public.billing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  billing_month date NOT NULL,
  total_kwh decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create RLS policies for energy readings
CREATE POLICY "Users can view their own energy readings" 
  ON public.energy_readings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert energy readings" 
  ON public.energy_readings FOR INSERT 
  WITH CHECK (true);

-- Create RLS policies for AI alerts
CREATE POLICY "Users can view their own alerts" 
  ON public.ai_alerts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
  ON public.ai_alerts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert alerts" 
  ON public.ai_alerts FOR INSERT 
  WITH CHECK (true);

-- Create RLS policies for billing history
CREATE POLICY "Users can view their own billing history" 
  ON public.billing_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert billing records" 
  ON public.billing_history FOR INSERT 
  WITH CHECK (true);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
