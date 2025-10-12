#!/bin/bash

# SMS Fallback Deployment Script
# This script deploys the SMS fallback system for KPLC integration

set -e

echo "🚀 Deploying SMS Fallback System for KPLC Integration"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

print_success "Supabase CLI found"

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    print_error "Not in a Supabase project directory"
    echo "Run 'supabase init' first"
    exit 1
fi

print_success "Supabase project detected"

# Step 1: Deploy database migrations
print_status "Step 1: Deploying database migrations..."

if [ -f "supabase/migrations/20241210_create_sms_responses_table.sql" ]; then
    print_status "Applying SMS responses table migration..."
    supabase db push
    print_success "Database migrations applied"
else
    print_warning "SMS responses migration not found, skipping..."
fi

# Step 2: Deploy Supabase functions
print_status "Step 2: Deploying Supabase functions..."

# Deploy KPLC SMS service function
if [ -d "supabase/functions/kplc_sms_service" ]; then
    print_status "Deploying KPLC SMS service function..."
    supabase functions deploy kplc_sms_service
    print_success "KPLC SMS service function deployed"
else
    print_error "KPLC SMS service function not found"
    exit 1
fi

# Deploy SMS webhook function
if [ -d "supabase/functions/sms_webhook" ]; then
    print_status "Deploying SMS webhook function..."
    supabase functions deploy sms_webhook
    print_success "SMS webhook function deployed"
else
    print_error "SMS webhook function not found"
    exit 1
fi

# Step 3: Set environment variables
print_status "Step 3: Setting up environment variables..."

# Check if Africa's Talking credentials are set
if [ -z "$AFRICAS_TALKING_API_KEY" ] || [ -z "$AFRICAS_TALKING_USERNAME" ]; then
    print_warning "Africa's Talking credentials not found in environment"
    echo ""
    echo "To enable SMS fallback, set these environment variables:"
    echo "  export AFRICAS_TALKING_API_KEY=your_api_key"
    echo "  export AFRICAS_TALKING_USERNAME=your_username"
    echo ""
    echo "Or add them to your Supabase project secrets:"
    echo "  supabase secrets set AFRICAS_TALKING_API_KEY=your_api_key"
    echo "  supabase secrets set AFRICAS_TALKING_USERNAME=your_username"
else
    print_status "Setting Africa's Talking credentials..."
    supabase secrets set AFRICAS_TALKING_API_KEY="$AFRICAS_TALKING_API_KEY"
    supabase secrets set AFRICAS_TALKING_USERNAME="$AFRICAS_TALKING_USERNAME"
    print_success "Africa's Talking credentials set"
fi

# Step 4: Test the deployment
print_status "Step 4: Testing deployment..."

# Check if Node.js is available for testing
if command -v node &> /dev/null; then
    if [ -f "test-sms-fallback.js" ]; then
        print_status "Running SMS fallback tests..."
        node test-sms-fallback.js
        print_success "Tests completed"
    else
        print_warning "Test script not found, skipping tests"
    fi
else
    print_warning "Node.js not found, skipping tests"
fi

# Step 5: Display webhook URL
print_status "Step 5: Configuration information..."

# Get project reference
PROJECT_REF=$(supabase status | grep "API URL" | awk '{print $3}' | sed 's/https:\/\///' | sed 's/\.supabase\.co//')

if [ ! -z "$PROJECT_REF" ]; then
    echo ""
    print_success "SMS Fallback System Deployed Successfully!"
    echo ""
    echo "📋 Configuration Summary:"
    echo "========================"
    echo ""
    echo "🔗 SMS Webhook URL:"
    echo "   https://${PROJECT_REF}.supabase.co/functions/v1/sms_webhook"
    echo ""
    echo "🔗 KPLC SMS Service URL:"
    echo "   https://${PROJECT_REF}.supabase.co/functions/v1/kplc_sms_service"
    echo ""
    echo "📱 Africa's Talking Configuration:"
    echo "   1. Go to https://account.africastalking.com/"
    echo "   2. Navigate to SMS > Callbacks"
    echo "   3. Set delivery reports URL to:"
    echo "      https://${PROJECT_REF}.supabase.co/functions/v1/sms_webhook"
    echo ""
    echo "🔧 Environment Variables Needed:"
    echo "   Client-side (.env):"
    echo "     VITE_AFRICAS_TALKING_API_KEY=your_api_key"
    echo "     VITE_AFRICAS_TALKING_USERNAME=your_username"
    echo ""
    echo "   Server-side (Supabase secrets):"
    echo "     AFRICAS_TALKING_API_KEY=your_api_key"
    echo "     AFRICAS_TALKING_USERNAME=your_username"
    echo ""
    echo "✅ Next Steps:"
    echo "   1. Configure Africa's Talking webhook URL"
    echo "   2. Add API credentials to environment variables"
    echo "   3. Test SMS fallback functionality"
    echo "   4. Monitor SMS responses in the dashboard"
    echo ""
else
    print_warning "Could not determine project reference"
    echo "Please check your Supabase project status"
fi

# Step 6: Create deployment summary
print_status "Creating deployment summary..."

cat > SMS_DEPLOYMENT_SUMMARY.md << EOF
# SMS Fallback Deployment Summary

## Deployment Date
$(date)

## Components Deployed

### ✅ Database Components
- \`sms_responses\` table for storing SMS responses
- Enhanced \`kplc_bills\` and \`token_transactions\` tables with source tracking
- RLS policies for data security
- Helper functions for SMS processing

### ✅ Supabase Functions
- \`kplc_sms_service\`: Main SMS service for KPLC operations
- \`sms_webhook\`: Webhook handler for incoming SMS from Africa's Talking

### ✅ Client Components
- \`AfricasTalkingSMSService\`: Core SMS service class
- \`useKPLCTokensWithSMS\`: Enhanced hook with SMS fallback
- \`SMSFallbackStatus\`: Status component for dashboard
- Enhanced \`KPLCPuppeteerService\` with SMS fallback logic

## Configuration Required

### Africa's Talking Setup
1. Sign up at https://account.africastalking.com/
2. Get API credentials from dashboard
3. Configure webhook URL: https://${PROJECT_REF}.supabase.co/functions/v1/sms_webhook

### Environment Variables
\`\`\`bash
# Client-side (.env)
VITE_AFRICAS_TALKING_API_KEY=your_api_key
VITE_AFRICAS_TALKING_USERNAME=your_username

# Server-side (Supabase secrets)
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
\`\`\`

## Testing
Run the test suite with:
\`\`\`bash
node test-sms-fallback.js
\`\`\`

## Features Available
- ✅ Automatic fallback from Puppeteer to SMS
- ✅ Balance inquiry via SMS (BAL command)
- ✅ Token purchase via SMS (BUY command)
- ✅ USSD integration support
- ✅ Real-time SMS response processing
- ✅ Data consistency across sources
- ✅ Visual status indicators

## Monitoring
- SMS responses are logged in \`sms_responses\` table
- All operations include source tracking
- Error handling and retry mechanisms
- Performance metrics available

## Support
For issues or questions, refer to:
- SMS_FALLBACK_IMPLEMENTATION.md (detailed documentation)
- test-sms-fallback.js (testing and validation)
- Supabase function logs for debugging
EOF

print_success "Deployment summary created: SMS_DEPLOYMENT_SUMMARY.md"

echo ""
print_success "🎉 SMS Fallback System deployment completed successfully!"
echo ""
print_status "The system is now ready to provide SMS fallback for KPLC operations."
print_status "Configure your Africa's Talking credentials to enable full functionality."
echo ""