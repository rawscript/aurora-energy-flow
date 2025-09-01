#!/bin/bash

# Script to deploy all Supabase Edge Functions

echo "Deploying Supabase Edge Functions..."

# Deploy profile functions
echo "Deploying get_or_create_profile..."
supabase functions deploy get_or_create_profile

echo "Deploying safe_update_profile..."
supabase functions deploy safe_update_profile

# Deploy notification functions
echo "Deploying get_notification_preferences..."
supabase functions deploy get_notification_preferences

echo "Deploying initialize_user_notifications..."
supabase functions deploy initialize_user_notifications

echo "Deploying get_user_notifications_safe..."
supabase functions deploy get_user_notifications_safe

# Deploy token functions
echo "Deploying get_token_analytics_cached..."
supabase functions deploy get_token_analytics_cached

echo "Deploying get_token_transactions_cached..."
supabase functions deploy get_token_transactions_cached

echo "All functions deployed successfully!"