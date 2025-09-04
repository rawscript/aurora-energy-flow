@echo off
REM Script to verify that the required functions exist in Supabase

echo Verifying Supabase functions...

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Supabase CLI is not installed. Please install it first:
    echo npm install -g supabase
    pause
    exit /b 1
)

REM Check if we're logged in to Supabase
supabase status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Not logged in to Supabase. Please run 'supabase login' first.
    pause
    exit /b 1
)

REM List all functions
echo Listing all deployed functions:
supabase functions list

REM Check for specific functions
echo.
echo Checking for required functions:

REM Check for get_or_create_profile
supabase functions list | find "get_or_create_profile" >nul
if %ERRORLEVEL% equ 0 (
    echo ✓ get_or_create_profile function exists
) else (
    echo ✗ get_or_create_profile function is missing
)

REM Check for get_notification_preferences
supabase functions list | find "get_notification_preferences" >nul
if %ERRORLEVEL% equ 0 (
    echo ✓ get_notification_preferences function exists
) else (
    echo ✗ get_notification_preferences function is missing
)

REM Check for get_user_notifications_safe
supabase functions list | find "get_user_notifications_safe" >nul
if %ERRORLEVEL% equ 0 (
    echo ✓ get_user_notifications_safe function exists
) else (
    echo ✗ get_user_notifications_safe function is missing
)

REM Check database functions
echo.
echo Checking database functions:

REM Connect to database and check for functions
for /f "tokens=3" %%A in ('supabase config ^| find "Database URL"') do set DB_URL=%%A
if "%DB_URL%"=="" (
    echo Could not determine database URL.
    pause
    exit /b 1
)

REM Extract host and port from DB_URL
for /f "tokens=2 delims=@" %%A in ("%DB_URL%") do set HOST_PORT=%%A
for /f "tokens=1,2 delims=:" %%A in ("%HOST_PORT%") do (
    set HOST=%%A
    set PORT=%%B
)
set PORT=%PORT:/=%
set PORT=%PORT:~0,4%

echo Checking database functions on %HOST%:%PORT%...

REM Check for get_or_create_profile function
psql -h %HOST% -p %PORT% -U postgres -d postgres -c "\df get_or_create_profile" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ get_or_create_profile database function exists
) else (
    echo ✗ get_or_create_profile database function is missing
)

REM Check for get_notification_preferences function
psql -h %HOST% -p %PORT% -U postgres -d postgres -c "\df get_notification_preferences" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ get_notification_preferences database function exists
) else (
    echo ✗ get_notification_preferences database function is missing
)

REM Check for get_user_notifications_safe function
psql -h %HOST% -p %PORT% -U postgres -d postgres -c "\df get_user_notifications_safe" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ✓ get_user_notifications_safe database function exists
) else (
    echo ✗ get_user_notifications_safe database function is missing
)

pause
