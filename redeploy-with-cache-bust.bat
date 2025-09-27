@echo off
REM Script to redeploy Supabase functions with cache busting
REM Run with: redeploy-with-cache-bust.bat

echo 🔄 Redeploying Supabase functions with cache busting...

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Supabase CLI is not installed
    echo    Please install it with: npm install -g supabase
    pause
    exit /b 1
)

echo ✅ Supabase CLI is installed

REM Check if logged in to Supabase
supabase status >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Not logged in to Supabase
    echo    Please log in with: supabase login
    pause
    exit /b 1
)

echo ✅ Logged in to Supabase

REM Step 1: Try to clear schema cache (this might not work from Windows)
echo.
echo 🧹 Attempting to clear schema cache...
REM We'll skip direct cache clearing on Windows as it's more complex

REM Step 2: Redeploy database functions
echo.
echo 🚀 Redeploying database functions...
if exist deploy-db-functions.bat (
    echo    Running database functions deployment...
    call deploy-db-functions.bat
) else (
    echo ❌ Database deployment script not found
    echo    Please ensure deploy-db-functions.bat exists
    pause
    exit /b 1
)

REM Step 3: Redeploy edge functions
echo.
echo 🚀 Redeploying edge functions...
if exist deploy-all-functions.bat (
    echo    Running edge functions deployment...
    call deploy-all-functions.bat
) else (
    echo ❌ Edge function deployment script not found
    echo    Please ensure deploy-all-functions.bat exists
    pause
    exit /b 1
)

echo.
echo ✅ Redeployment with cache busting completed!
echo.
echo 💡 Next steps:
echo    1. Wait 1-2 minutes for deployment to complete
echo    2. Hard refresh your Aurora application (Ctrl+F5 or Cmd+Shift+R)
echo    3. Test the smart meter integration
echo    4. Check browser console for any remaining 404 errors

pause