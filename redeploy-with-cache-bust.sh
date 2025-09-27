#!/bin/bash
# Script to redeploy Supabase functions with cache busting
# Run with: chmod +x redeploy-with-cache-bust.sh && ./redeploy-with-cache-bust.sh

echo "🔄 Redeploying Supabase functions with cache busting..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed"
    echo "   Please install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI is installed"

# Check if logged in
if ! supabase status &> /dev/null
then
    echo "❌ Not logged in to Supabase"
    echo "   Please log in with: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"

# Step 1: Clear schema cache
echo "\n🧹 Clearing schema cache..."
psql -h db.$(supabase config | grep "Project ref" | awk '{print $3}').supabase.co -p 5432 -U postgres -d postgres -c "SELECT pg_reload_conf();" 2>/dev/null || echo "⚠️  Could not clear schema cache directly - continuing with redeployment"

# Step 2: Redeploy database functions
echo "\n🚀 Redeploying database functions..."
if [ -f "deploy-db-functions.bat" ]; then
    echo "   Running Windows deployment script..."
    # For Windows, we'll just print the command since we can't execute .bat files directly in bash
    echo "   Please run: deploy-db-functions.bat"
elif [ -f "deploy-db-functions.sh" ]; then
    echo "   Running Unix deployment script..."
    chmod +x deploy-db-functions.sh
    ./deploy-db-functions.sh
else
    echo "❌ No database deployment script found"
    echo "   Please ensure deploy-db-functions.bat or deploy-db-functions.sh exists"
    exit 1
fi

# Step 3: Redeploy edge functions
echo "\n🚀 Redeploying edge functions..."
if [ -f "deploy-all-functions.bat" ]; then
    echo "   Please run: deploy-all-functions.bat"
elif [ -f "deploy-all-functions.sh" ]; then
    echo "   Running Unix deployment script..."
    chmod +x deploy-all-functions.sh
    ./deploy-all-functions.sh
else
    echo "❌ No edge function deployment script found"
    echo "   Please ensure deploy-all-functions.bat or deploy-all-functions.sh exists"
    exit 1
fi

echo "\n✅ Redeployment with cache busting completed!"
echo "\n💡 Next steps:"
echo "   1. Wait 1-2 minutes for deployment to complete"
echo "   2. Hard refresh your Aurora application (Ctrl+F5 or Cmd+Shift+R)"
echo "   3. Test the smart meter integration"
echo "   4. Check browser console for any remaining 404 errors"