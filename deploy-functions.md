# Deploy Supabase Functions

To deploy the updated KPLC SMS service function, run:

```bash
# Deploy the specific function
supabase functions deploy kplc_sms_service

# Or deploy all functions
supabase functions deploy
```

## Test the Function

After deployment, you can test it with:

```bash
curl -X POST 'https://rcthtxwzsqvwivritzln.supabase.co/functions/v1/kplc_sms_service' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "fetch_bill_data",
    "user_id": "test-user-id",
    "meter_number": "12345678901",
    "phone_number": "+254114841437"
  }'
```

## Check Function Logs

To see what's happening:

```bash
supabase functions logs kplc_sms_service
```

## Environment Variables

Make sure these are set in your Supabase project:

```bash
supabase secrets set AFRICAS_TALKING_API_KEY=atsk_abf334829658cd06977f7626c2c9ce276af06ff5aa490439d75284a3a45480d15c8a1889
supabase secrets set AFRICAS_TALKING_USERNAME=aurora
```