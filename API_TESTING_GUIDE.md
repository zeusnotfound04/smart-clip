# API Testing Guide - Credits & Subscriptions

## Quick Test Endpoints

### 1. Test Server Health
```bash
curl http://localhost:5000/api/health
```

### 2. Get Available Subscription Plans
```bash
curl http://localhost:5000/api/subscriptions/plans
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "tier": "basic",
        "name": "Basic Plan",
        "credits": 100,
        "monthlyPrice": 9.99,
        "yearlyPrice": 99.99,
        "hasWatermark": false
      },
      {
        "tier": "pro",
        "name": "Pro Plan",
        "credits": 300,
        "monthlyPrice": 29.99,
        "yearlyPrice": 299.99,
        "hasWatermark": false
      },
      {
        "tier": "premium",
        "name": "Premium Plan",
        "credits": -1,
        "monthlyPrice": 99.99,
        "yearlyPrice": 999.99,
        "hasWatermark": false
      }
    ]
  }
}
```

### 3. Get Current Credit Balance
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/credits/balance
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "balance": 10,
    "stats": {
      "totalUsed": 0,
      "currentBalance": 10,
      "transactionCount": 0,
      "averagePerTransaction": 0
    }
  }
}
```

### 4. Calculate Credits for Video Duration
```bash
curl -X POST http://localhost:5000/api/credits/calculate \
     -H "Content-Type: application/json" \
     -d '{"durationInMinutes": 5}'
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "durationInMinutes": 5,
    "creditsRequired": 5,
    "rate": "1 credit per minute"
  }
}
```

### 5. Get Transaction History
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     "http://localhost:5000/api/credits/history?limit=10&offset=0"
```

### 6. Get Subscription Details
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/subscriptions/details
```

### 7. Create Subscription (Test Mode)
```bash
curl -X POST http://localhost:5000/api/subscriptions/create \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "tier": "basic",
       "billingPeriod": "monthly",
       "paymentMethodId": "pm_card_visa"
     }'
```

### 8. Cancel Subscription
```bash
curl -X POST http://localhost:5000/api/subscriptions/cancel \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"cancelAtPeriodEnd": true}'
```

### 9. Resume Subscription
```bash
curl -X POST http://localhost:5000/api/subscriptions/resume \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 10. Update Subscription Tier
```bash
curl -X PUT http://localhost:5000/api/subscriptions/update \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"tier": "pro"}'
```

## Testing with Stripe Test Cards

### Valid Test Cards
```
4242 4242 4242 4242 - Visa (success)
4000 0025 0000 3155 - Visa (requires authentication)
4000 0000 0000 9995 - Visa (insufficient funds)
4000 0000 0000 0002 - Visa (card declined)
```

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Database Queries for Testing

### Check User Credits
```sql
SELECT id, email, credits, subscription_tier, subscription_status 
FROM users 
WHERE email = 'user@example.com';
```

### View Credit Transactions
```sql
SELECT * FROM credit_transactions 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Subscription History
```sql
SELECT * FROM subscription_history 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;
```

### Check All Free Trial Users
```sql
SELECT email, credits, trial_used, subscription_tier 
FROM users 
WHERE subscription_tier = 'free';
```

## Environment Variables to Update

Before testing, update these in `.env`:

```env
# Replace with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Customize watermark
WATERMARK_TEXT="Smart Clip"
WATERMARK_POSITION=bottom-right
WATERMARK_OPACITY=0.7
WATERMARK_FONT_SIZE=24
WATERMARK_FONT_COLOR=white
```

## Webhook Testing with Stripe CLI

### Install Stripe CLI
```bash
# Windows (using Scoop)
scoop install stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### Login to Stripe
```bash
stripe login
```

### Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

This will output a webhook secret like `whsec_xxxxxxxxxxxxx` - copy this to your `.env` file.

### Trigger Test Events
```bash
# Test subscription creation
stripe trigger customer.subscription.created

# Test payment success
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

## Common Issues & Solutions

### Issue: "Insufficient credits"
**Solution:** Check user's current balance:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/credits/balance
```

### Issue: "Webhook signature verification failed"
**Solution:** 
1. Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
2. Use Stripe CLI for local testing
3. Verify webhook endpoint uses raw body (not JSON parsed)

### Issue: "User not found"
**Solution:** Ensure user is authenticated and JWT token is valid

### Issue: Watermark not appearing
**Solution:** 
1. Check user's `subscription_tier` is 'free'
2. Verify FFmpeg is installed and working
3. Check watermark configuration in `.env`

## Testing Workflow

1. **Start Server**
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Start Stripe Webhook Listener**
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```

3. **Test Credit System**
   - Create a test user (or login)
   - Check initial 10 free credits
   - Process a video to deduct credits
   - Verify credits were deducted in database

4. **Test Subscription**
   - Get available plans
   - Create subscription with test card
   - Verify credits added to account
   - Test watermark removal

5. **Test Webhook Events**
   - Trigger test events with Stripe CLI
   - Check database for updates
   - Verify credit renewals

## Success Criteria

✅ User starts with 10 free credits  
✅ Credits deducted based on video duration (1 min = 1 credit)  
✅ Watermark appears on free tier videos  
✅ Subscription creation adds credits  
✅ Watermark removed after subscription  
✅ Premium users have unlimited credits  
✅ Failed processing refunds credits  
✅ Webhook events update database correctly  

## Next Steps After Testing

1. Update Stripe keys with production values
2. Configure production webhook URL
3. Test with real payment methods
4. Set up monitoring and alerts
5. Create frontend UI for credits display
6. Add email notifications for low credits
7. Implement usage analytics dashboard
