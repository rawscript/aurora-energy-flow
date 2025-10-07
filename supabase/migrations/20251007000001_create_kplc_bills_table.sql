-- Create kplc_bills table for storing KPLC bill data fetched via puppeteer
CREATE TABLE IF NOT EXISTS public.kplc_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT,
  account_number TEXT,
  meter_number TEXT NOT NULL,
  current_reading DECIMAL(10,2),
  previous_reading DECIMAL(10,2),
  consumption DECIMAL(10,2),
  bill_amount DECIMAL(10,2),
  due_date TEXT,
  billing_period TEXT,
  last_payment_date TEXT,
  last_payment_amount DECIMAL(10,2),
  outstanding_balance DECIMAL(10,2),
  address TEXT,
  tariff TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'disconnected')),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kplc_bills_user_id ON public.kplc_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_kplc_bills_meter_number ON public.kplc_bills(meter_number);
CREATE INDEX IF NOT EXISTS idx_kplc_bills_fetched_at ON public.kplc_bills(fetched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.kplc_bills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own KPLC bills" ON public.kplc_bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert KPLC bills" ON public.kplc_bills
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update KPLC bills" ON public.kplc_bills
  FOR UPDATE USING (true);