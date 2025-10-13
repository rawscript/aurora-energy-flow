# Aurora SMS Alert System

The Aurora SMS Alert System provides comprehensive SMS notification capabilities using Africa's Talking API with "AURORA" as the sender name.

## Features

- ✅ Send individual SMS alerts
- ✅ Send bulk SMS alerts
- ✅ Delivery status tracking
- ✅ User preference management
- ✅ Cost tracking
- ✅ Multiple alert types
- ✅ Template system
- ✅ Phone number validation
- ✅ Automatic status updates via webhooks

## Setup

### 1. Deploy Functions

```bash
# Deploy Aurora SMS alerts function
supabase functions deploy aurora_sms_alerts

# The existing sms_webhook function handles delivery reports
supabase functions deploy sms_webhook
```

### 2. Apply Database Migration

Run the SQL migration in your Supabase dashboard:
```sql
-- Copy content from supabase/migrations/20241210_create_sms_alerts_table.sql
```

### 3. Configure Africa's Talking

1. **SMS Delivery Reports**: Set webhook URL in Africa's Talking dashboard:
   ```
   https://your-project-id.supabase.co/functions/v1/sms_webhook
   ```

2. **Sender ID**: Register "AURORA" as your alphanumeric sender ID

## Usage

### React Hook

```tsx
import { useAuroraSMS } from '../hooks/useAuroraSMS';

function MyComponent() {
  const { sendSMSAlert, loading, error } = useAuroraSMS();

  const handleSendAlert = async () => {
    try {
      await sendSMSAlert('+254712345678', 'Hello from Aurora!', {
        alert_type: 'general'
      });
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  };

  return (
    <button onClick={handleSendAlert} disabled={loading}>
      Send Alert
    </button>
  );
}
```

### Utility Functions

```tsx
import { AuroraSMSUtils } from '../utils/auroraSMSUtils';

// Send energy low alert
await AuroraSMSUtils.sendEnergyLowAlert({
  phoneNumber: '+254712345678',
  userId: 'user-id',
  units: 50
});

// Send bill due alert
await AuroraSMSUtils.sendBillDueAlert({
  phoneNumber: '+254712345678',
  userId: 'user-id',
  amount: 1500,
  dueDate: '2024-12-15'
});

// Send token purchase confirmation
await AuroraSMSUtils.sendTokenPurchaseAlert({
  phoneNumber: '+254712345678',
  userId: 'user-id',
  amount: 500,
  units: 500,
  token: '12345678901234567890'
});
```

### SMS Alert Manager Component

```tsx
import { SMSAlertManager } from '../components/SMSAlertManager';

function Dashboard() {
  return (
    <div>
      <SMSAlertManager className="mb-6" />
    </div>
  );
}
```

## Alert Types

| Type | Description | Use Case |
|------|-------------|----------|
| `general` | General notifications | Any general message |
| `energy_low` | Low energy balance | When units are running low |
| `bill_due` | Bill payment reminder | Payment due dates |
| `token_purchase` | Purchase confirmation | Successful token purchases |
| `system_alert` | System notifications | System updates, changes |
| `maintenance` | Maintenance notices | Scheduled maintenance |
| `emergency` | Emergency alerts | Critical issues |

## API Reference

### Send Individual Alert

```typescript
POST /functions/v1/aurora_sms_alerts
{
  "action": "send_alert",
  "user_id": "uuid",
  "phone_number": "+254712345678",
  "message": "Your alert message",
  "alert_type": "general",
  "metadata": {}
}
```

### Send Bulk Alerts

```typescript
POST /functions/v1/aurora_sms_alerts
{
  "action": "send_bulk_alerts",
  "recipients": [
    {
      "phone_number": "+254712345678",
      "message": "Custom message",
      "user_id": "uuid"
    }
  ],
  "alert_type": "general",
  "metadata": {}
}
```

### Get Alert Status

```typescript
POST /functions/v1/aurora_sms_alerts
{
  "action": "get_alert_status",
  "alert_id": "uuid"
}
```

## Database Schema

### sms_alerts Table

```sql
CREATE TABLE sms_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, sent, delivered, failed, expired
  message_id TEXT, -- Africa's Talking message ID
  cost DECIMAL(10,4),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

### Profile Extensions

```sql
-- Added to profiles table
ALTER TABLE profiles ADD COLUMN sms_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN alert_preferences JSONB DEFAULT '{
  "energy_low": true,
  "bill_due": true,
  "token_purchase": true,
  "system_alert": true,
  "maintenance": false,
  "emergency": true
}';
```

## Webhook Integration

The system automatically handles delivery reports from Africa's Talking:

1. **Incoming SMS** (from KPLC): Processed for KPLC responses
2. **Delivery Reports**: Updates SMS alert status automatically
3. **Status Mapping**:
   - `Success/Delivered` → `delivered`
   - `Sent` → `sent`
   - `Failed/Rejected/Expired` → `failed`

## Cost Tracking

- Automatic cost tracking per SMS
- User statistics available
- Cost estimation utilities
- Bulk operation cost summaries

## Security Features

- Row Level Security (RLS) enabled
- Users can only access their own alerts
- Service role has full access
- Phone number validation
- Rate limiting (handled by Africa's Talking)

## Best Practices

1. **Phone Number Format**: Always use international format (+254...)
2. **Message Length**: Keep under 160 characters for single SMS
3. **User Preferences**: Check user preferences before sending
4. **Error Handling**: Always handle SMS sending errors gracefully
5. **Cost Monitoring**: Monitor SMS costs and set budgets
6. **Template Usage**: Use predefined templates for consistency

## Integration Examples

### Energy Management Integration

```typescript
// In your energy monitoring system
import { AuroraSMSUtils } from '../utils/auroraSMSUtils';

async function checkEnergyLevels(userId: string, currentUnits: number) {
  if (currentUnits < 50) {
    const user = await getUserProfile(userId);
    
    if (await AuroraSMSUtils.shouldSendAlert(userId, 'energy_low')) {
      await AuroraSMSUtils.sendEnergyLowAlert({
        phoneNumber: user.phone_number,
        userId: userId,
        units: currentUnits
      });
    }
  }
}
```

### Token Purchase Integration

```typescript
// After successful token purchase
import { AuroraSMSUtils } from '../utils/auroraSMSUtils';

async function onTokenPurchaseSuccess(purchase: TokenPurchase) {
  if (await AuroraSMSUtils.shouldSendAlert(purchase.userId, 'token_purchase')) {
    await AuroraSMSUtils.sendTokenPurchaseAlert({
      phoneNumber: purchase.phoneNumber,
      userId: purchase.userId,
      amount: purchase.amount,
      units: purchase.units,
      token: purchase.tokenCode,
      referenceNumber: purchase.referenceNumber
    });
  }
}
```

## Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check Africa's Talking credentials
   - Verify phone number format
   - Check user SMS preferences

2. **Delivery Reports Not Working**
   - Verify webhook URL in Africa's Talking dashboard
   - Check webhook function deployment
   - Review function logs

3. **High SMS Costs**
   - Implement message length optimization
   - Use bulk sending for multiple recipients
   - Monitor and set cost alerts

### Monitoring

- Check Supabase function logs
- Monitor SMS delivery rates
- Track cost trends
- Review user preferences regularly

## Future Enhancements

- [ ] SMS scheduling
- [ ] A/B testing for messages
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] SMS campaigns
- [ ] Integration with other providers

---

The Aurora SMS Alert System provides a robust, scalable solution for SMS notifications with comprehensive tracking and management capabilities.