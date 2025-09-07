-- Test script to verify that all required functions exist and work properly

-- Test get_or_create_profile function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_or_create_profile'
) as get_or_create_profile_exists;

-- Test safe_update_profile function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'safe_update_profile'
) as safe_update_profile_exists;

-- Test get_notification_preferences function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_notification_preferences'
) as get_notification_preferences_exists;

-- Test initialize_user_notifications function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'initialize_user_notifications'
) as initialize_user_notifications_exists;

-- Test get_user_notifications_safe function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_user_notifications_safe'
) as get_user_notifications_safe_exists;

-- Test get_token_analytics_cached function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_token_analytics_cached'
) as get_token_analytics_cached_exists;

-- Test get_token_transactions_cached function
SELECT EXISTS (
  SELECT 1 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'get_token_transactions_cached'
) as get_token_transactions_cached_exists;

-- Check if profiles table has all required columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('energy_provider', 'notifications_enabled', 'auto_optimize', 'energy_rate')
ORDER BY column_name;