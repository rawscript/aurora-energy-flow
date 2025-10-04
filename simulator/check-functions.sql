-- Check what functions exist in the database
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%energy%'
ORDER BY routine_name;

-- Check specifically for the functions we need
SELECT 
    routine_name, 
    routine_type, 
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_energy_reading_improved', 'update_token_balance_improved', 'get_notification_preferences')
ORDER BY routine_name;

-- Check function parameters for insert_energy_reading_improved
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'insert_energy_reading_improved';

-- Check function parameters for update_token_balance_improved
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'update_token_balance_improved';