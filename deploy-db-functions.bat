@echo off
REM Script to deploy database functions for notification preferences and profile management

echo Deploying database functions...

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

REM Get project ref from supabase config
for /f "tokens=3" %%A in ('supabase config ^| find "Project ref"') do set PROJECT_REF=%%A
if "%PROJECT_REF%"=="" (
    echo Could not determine project ref. Make sure you're in a Supabase project directory.
    pause
    exit /b 1
)

REM Get database connection details
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

echo Deploying database functions using psql...
echo Host: %HOST%
echo Port: %PORT%

REM Deploy get_or_create_profile function
echo Deploying get_or_create_profile function...
psql -h %HOST% -p %PORT% -U postgres -d postgres -f supabase/migrations/20250902000000_create_get_or_create_profile_function.sql

REM Deploy get_notification_preferences function
echo Deploying get_notification_preferences function...
psql -h %HOST% -p %PORT% -U postgres -d postgres -f supabase/migrations/20250902000001_create_get_notification_preferences_function.sql

REM Deploy get_user_notifications_safe function
echo Deploying get_user_notifications_safe function...
psql -h %HOST% -p %PORT% -U postgres -d postgres -f supabase/migrations/20250902000003_create_get_user_notifications_safe_function.sql

echo Database functions deployed successfully!
pause
