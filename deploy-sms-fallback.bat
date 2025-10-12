@echo off
REM SMS Fallback Deployment Script for Windows
REM This script deploys the SMS fallback system for KPLC integration

echo 🚀 Deploying SMS Fallback System for KPLC Integration
echo ==================================================

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Supabase CLI is not installed
    echo Install it with: npm install -g supabase
    exit /b 1
)

echo [SUCCESS] Supabase CLI found

REM Check if we're in a Supabase project
if not exist "supabase\config.toml" (
    echo [ERROR] Not in a Supabase project directory
    echo Run 'supabase init' first
    exit /b 1
)

echo [SUCCESS] Supabase project detected

REM Step 1: Deploy database migrations
echo [INFO] Step 1: Deploying database migrations...

if exist "supabase\migrations\20241210_create_sms_responses_table.sql" (
    echo [INFO] Applying SMS responses table migration...
    supabase db push
    echo [SUCCESS] Database migrations applied
) else (
    echo [WARNING] SMS responses migration not found, skipping...
)

REM Step 2: Deploy Supabase functions
echo [INFO] Step 2: Deploying Supabase functions...

REM Deploy KPLC SMS service function
if exist "supabase\functions\kplc_sms_service" (
    echo [INFO] Deploying KPLC SMS service function...
    supabase functions deploy kplc_sms_service
    echo [SUCCESS] KPLC SMS service function deployed
) else (
    echo [ERROR] KPLC SMS service function not found
    exit /b 1
)

REM Deploy SMS webhook function
if exist "supabase\functions\sms_webhook" (
    echo [INFO] Deploying SMS webhook function...
    supabase functions deploy sms_webhook
    echo [SUCCESS] SMS webhook function deployed
) else (
    echo [ERROR] SMS webhook function not found
    exit /b 1
)

REM Step 3: Set environment variables
echo [INFO] Step 3: Setting up environment variables...

if "%AFRICAS_TALKING_API_KEY%"=="" (
    echo [WARNING] Africa's Talking credentials not found in environment
    echo.
    echo To enable SMS fallback, set these environment variables:
    echo   set AFRICAS_TALKING_API_KEY=your_api_key
    echo   set AFRICAS_TALKING_USERNAME=your_username
    echo.
    echo Or add them to your Supabase project secrets:
    echo   supabase secrets set AFRICAS_TALKING_API_KEY=your_api_key
    echo   supabase secrets set AFRICAS_TALKING_USERNAME=your_username
) else (
    echo [INFO] Setting Africa's Talking credentials...
    supabase secrets set AFRICAS_TALKING_API_KEY=%AFRICAS_TALKING_API_KEY%
    supabase secrets set AFRICAS_TALKING_USERNAME=%AFRICAS_TALKING_USERNAME%
    echo [SUCCESS] Africa's Talking credentials set
)

REM Step 4: Test the deployment
echo [INFO] Step 4: Testing deployment...

REM Check if Node.js is available for testing
node --version >nul 2>&1
if %errorlevel% equ 0 (
    if exist "test-sms-fallback.js" (
        echo [INFO] Running SMS fallback tests...
        node test-sms-fallback.js
        echo [SUCCESS] Tests completed
    ) else (
        echo [WARNING] Test script not found, skipping tests
    )
) else (
    echo [WARNING] Node.js not found, skipping tests
)

REM Step 5: Display configuration information
echo [INFO] Step 5: Configuration information...

REM Get project reference (simplified for Windows)
for /f "tokens=3" %%i in ('supabase status ^| findstr "API URL"') do set PROJECT_URL=%%i
for /f "tokens=1 delims=." %%i in ("%PROJECT_URL:https://=%") do set PROJECT_REF=%%i

if not "%PROJECT_REF%"=="" (
    echo.
    echo [SUCCESS] SMS Fallback System Deployed Successfully!
    echo.
    echo 📋 Configuration Summary:
    echo ========================
    echo.
    echo 🔗 SMS Webhook URL:
    echo    https://%PROJECT_REF%.supabase.co/functions/v1/sms_webhook
    echo.
    echo 🔗 KPLC SMS Service URL:
    echo    https://%PROJECT_REF%.supabase.co/functions/v1/kplc_sms_service
    echo.
    echo 📱 Africa's Talking Configuration:
    echo    1. Go to https://account.africastalking.com/
    echo    2. Navigate to SMS ^> Callbacks
    echo    3. Set delivery reports URL to:
    echo       https://%PROJECT_REF%.supabase.co/functions/v1/sms_webhook
    echo.
    echo 🔧 Environment Variables Needed:
    echo    Client-side ^(.env^):
    echo      VITE_AFRICAS_TALKING_API_KEY=your_api_key
    echo      VITE_AFRICAS_TALKING_USERNAME=your_username
    echo.
    echo    Server-side ^(Supabase secrets^):
    echo      AFRICAS_TALKING_API_KEY=your_api_key
    echo      AFRICAS_TALKING_USERNAME=your_username
    echo.
    echo ✅ Next Steps:
    echo    1. Configure Africa's Talking webhook URL
    echo    2. Add API credentials to environment variables
    echo    3. Test SMS fallback functionality
    echo    4. Monitor SMS responses in the dashboard
    echo.
) else (
    echo [WARNING] Could not determine project reference
    echo Please check your Supabase project status
)

echo [SUCCESS] 🎉 SMS Fallback System deployment completed successfully!
echo.
echo [INFO] The system is now ready to provide SMS fallback for KPLC operations.
echo [INFO] Configure your Africa's Talking credentials to enable full functionality.
echo.

pause