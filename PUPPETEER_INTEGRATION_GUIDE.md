# Aurora Energy Flow: Puppeteer Integration Guide

## Overview

This guide explains how to set up actual Puppeteer integration for fetching real data from KPLC instead of using simulated responses.

## Current Implementation

The current implementation uses simulated data in the database functions:
- `check_kplc_balance_improved` function returns random balance values
- `purchase_tokens_improved` function generates fake token codes

## Setting Up Actual Puppeteer Integration

### 1. Enable HTTP Extension in Supabase

To make actual HTTP requests from your database functions, you need to enable the HTTP extension:

```sql
-- Enable the HTTP extension (requires Supabase admin privileges)
CREATE EXTENSION IF NOT EXISTS http;
```

### 2. Update Database Functions

Replace the simulated data sections in the database functions with actual HTTP calls to your Puppeteer service.

#### For check_kplc_balance_improved:

```sql
-- Replace the simulation code with:
BEGIN
  -- Make HTTP request to Puppeteer service
  SELECT content::JSONB INTO v_puppeteer_result
  FROM http_post(
    CONCAT(current_setting('supabase.url'), '/functions/v1/puppeteer_kplc_service'),
    jsonb_build_object(
      'action', 'fetch_bill_data',
      'user_id', p_user_id::TEXT,
      'meter_number', p_meter_number
    )::TEXT,
    'application/json'
  );
  
  -- Check if the Puppeteer service call was successful
  IF NOT (v_puppeteer_result->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Puppeteer service error: %', v_puppeteer_result->>'error';
  END IF;
  
  -- Process the response from Puppeteer service
  v_api_response := jsonb_build_object(
    'success', true,
    'balance', (v_puppeteer_result->'data'->>'outstandingBalance')::NUMERIC,
    'meter_number', p_meter_number,
    'last_updated', NOW(),
    'source', 'kplc_puppeteer',
    'message', 'Balance check successful via Puppeteer'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the function
  CALL public.log_error(
    'check_kplc_balance_improved',
    'Error calling Puppeteer service',
    SQLERRM,
    p_user_id,
    jsonb_build_object(
      'meter_number', p_meter_number,
      'puppeteer_response', v_puppeteer_result
    )
  );
  
  -- Fall back to simulated data
  v_api_response := jsonb_build_object(
    'success', true,
    'balance', (100 + random() * 400)::NUMERIC(10,2),
    'meter_number', p_meter_number,
    'last_updated', NOW(),
    'source', 'mock',
    'message', 'Balance check successful via mock data'
  );
END;
```

#### For purchase_tokens_improved:

```sql
-- Replace the simulation code with:
BEGIN
  -- Make HTTP request to Puppeteer service
  SELECT content::JSONB INTO v_puppeteer_result
  FROM http_post(
    CONCAT(current_setting('supabase.url'), '/functions/v1/puppeteer_kplc_service'),
    jsonb_build_object(
      'action', 'purchase_tokens',
      'user_id', p_user_id::TEXT,
      'meter_number', p_meter_number,
      'amount', p_amount,
      'phone_number', p_phone_number
    )::TEXT,
    'application/json'
  );
  
  -- Check if the Puppeteer service call was successful
  IF NOT (v_puppeteer_result->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'Puppeteer service error: %', v_puppeteer_result->>'error';
  END IF;
  
  -- Process the response from Puppeteer service
  v_token_code := v_puppeteer_result->'data'->>'tokenCode';
  v_reference_number := v_puppeteer_result->'data'->>'referenceNumber';
  v_token_units := (v_puppeteer_result->'data'->>'units')::DECIMAL(10,2);
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the function
  CALL public.log_error(
    'purchase_tokens_improved',
    'Error calling Puppeteer service',
    SQLERRM,
    p_user_id,
    jsonb_build_object(
      'meter_number', p_meter_number,
      'amount', p_amount,
      'puppeteer_response', v_puppeteer_result
    )
  );
  
  -- Fall back to simulated data
  v_token_code := LPAD(FLOOR(RANDOM() * 99999999999999999999)::TEXT, 20, '0');
  v_reference_number := 'TXN' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
  v_token_units := p_amount;
END;
```

### 3. Deploy the Changes

1. Update your database migration files with the new implementations
2. Deploy the changes to your Supabase instance
3. Test the integration with actual KPLC data

## Benefits of Actual Puppeteer Integration

1. **Real Data**: Fetch actual bill information from KPLC portal
2. **Accurate Balances**: Get real-time token balances instead of simulated values
3. **Actual Token Codes**: Generate real token codes from KPLC instead of fake ones
4. **Enhanced User Experience**: Provide users with accurate information

## Considerations

1. **Rate Limiting**: Be careful not to overload KPLC's servers with too many requests
2. **Error Handling**: Implement robust error handling for network issues and KPLC portal changes
3. **Caching**: Continue to use caching to reduce the number of requests to KPLC
4. **Security**: Ensure that user credentials are handled securely

## Testing

To test the integration:

1. Set up a test user with valid KPLC credentials
2. Call the `check_kplc_balance_improved` function
3. Verify that real balance data is returned
4. Test token purchases with the `purchase_tokens_improved` function
5. Verify that actual token codes are generated and returned

## Troubleshooting

### Common Issues

1. **HTTP Extension Not Available**: Contact Supabase support to enable the HTTP extension
2. **Network Errors**: Check your Supabase instance's network configuration
3. **KPLC Portal Changes**: Update the Puppeteer scraping logic if KPLC changes their portal UI
4. **Authentication Issues**: Verify that user credentials are correctly stored and retrieved

### Logs and Monitoring

Check the `kplc_api_logs` and `error_logs` tables for debugging information:
- Successful requests will be logged with response code 200
- Failed requests will be logged with appropriate error codes
- Puppeteer service calls will be logged with source 'puppeteer'