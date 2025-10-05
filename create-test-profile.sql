-- Create a test user profile for smart meter testing
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  meter_number,
  energy_provider,
  notifications_enabled,
  auto_optimize,
  energy_rate,
  kplc_meter_type,
  notification_preferences
) VALUES (
  '12345678-1234-1234-1234-123456789012',
  'test@example.com',
  'Test User',
  'TEST-METER-123456',
  'KPLC',
  true,
  false,
  0.15,
  'prepaid',
  '{"token_low": true, "token_depleted": true, "power_restored": true}'
)
ON CONFLICT (id) 
DO UPDATE SET
  meter_number = EXCLUDED.meter_number,
  updated_at = NOW();

-- Verify the profile was created
SELECT id, email, full_name, meter_number FROM public.profiles WHERE id = '12345678-1234-1234-1234-123456789012';