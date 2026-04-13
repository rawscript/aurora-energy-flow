# Aurora API Reference

Integrate real-time energy telemetry into your own applications using our high-performance REST and GraphQL interfaces.

## Authentication
All API requests require a Bearer Token. You can generate production API keys from your dashboard's Developer Settings.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \ 
  https://api.auroraenergy.app/v1/telemetry
```

## Endpoints

- `GET /v1/meters`: List all smart meters active on your account.
- `GET /v1/meters/{id}/telemetry`: Retrieve real-time consumption data for a specific meter.
- `POST /v1/forecast`: Generate an AI-powered bill forecast based on historical data.

## Rate Limiting
Professional accounts are limited to 1,000 requests per minute. Enterprise accounts feature unlimited throughput via dedicated edge nodes.
