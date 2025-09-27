#!/bin/bash
# Script to verify that all required functions are deployed to Supabase
# Run with: chmod +x verify-deployment.sh && ./verify-deployment.sh

echo "🔍 Verifying Supabase function deployment..."

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

# List deployed functions
echo "\n📋 Deployed Edge Functions:"
supabase functions list

# Check database functions by connecting to the database
echo "\n📋 Checking database functions..."

# Get project ref
PROJECT_REF=$(supabase config | grep "Project ref" | awk '{print $3}')
if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not determine project ref"
    exit 1
fi

echo "✅ Project ref: $PROJECT_REF"

# Check if required functions exist in database
REQUIRED_FUNCTIONS=(
    "get_or_create_profile"
    "get_notification_preferences"
    "get_user_notifications_safe"
    "initialize_user_notifications"
    "create_notification"
)

echo "\n🔍 Checking each required function:"

for func in "${REQUIRED_FUNCTIONS[@]}"; do
    echo "\n   Checking $func..."
    
    # Try to get function definition
    # This is a simplified check - in practice, you'd want to connect to the DB directly
    echo "   Function: $func - Status: Unknown (requires direct DB connection)"
done

echo "\n💡 To fully verify database functions, connect to your Supabase database directly with:"
echo "   psql -h db.$PROJECT_REF.supabase.co -p 5432 -U postgres -d postgres"
echo "   Then run: \\df $func_name"

echo "\n✅ Verification script completed"