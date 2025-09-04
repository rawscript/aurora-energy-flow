#!/bin/bash

# Script to deploy database functions for notification preferences and profile management

echo "Deploying database functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "Not logged in to Supabase. Please run 'supabase login' first."
    exit 1
fi

# Get project ref from supabase config
PROJECT_REF=$(supabase config | grep "Project ref" | awk '{print $3}')
if [ -z "$PROJECT_REF" ]; then
    echo "Could not determine project ref. Make sure you're in a Supabase project directory."
    exit 1
fi

# Deploy database functions using psql
echo "Deploying database functions using psql..."

# Get database connection details
DB_URL=$(supabase config | grep "Database URL" | awk '{print $3}')
if [ -z "$DB_URL" ]; then
    echo "Could not determine database URL."
    exit 1
fi

# Extract host and port from DB_URL
HOST=$(echo $DB_URL | sed 's|postgres://[^@]*@||' | sed 's|:[0-9]*/.*||')
PORT=$(echo $DB_URL | sed 's|.*:||' | sed 's|/.*||')

# Deploy get_or_create_profile function
echo "Deploying get_or_create_profile function..."
psql -h $HOST -p $PORT -U postgres -d postgres -f supabase/migrations/20250902000000_create_get_or_create_profile_function.sql

# Deploy get_notification_preferences function
echo "Deploying get_notification_preferences function..."
psql -h $HOST -p $PORT -U postgres -d postgres -f supabase/migrations/20250902000001_create_get_notification_preferences_function.sql

# Deploy get_user_notifications_safe function
echo "Deploying get_user_notifications_safe function..."
psql -h $HOST -p $PORT -U postgres -d postgres -f supabase/migrations/20250902000003_create_get_user_notifications_safe_function.sql

echo "Database functions deployed successfully!"
