# 🚀 Quick Start Guide - Credits & Subscriptions

## 5-Minute Setup

### Step 1: Update Environment Variables
Open `apps/api/.env` and replace the placeholder Stripe keys:

```env
# Replace these with your actual Stripe test keys
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Get your keys from: https://dashboard.stripe.com/test/apikeys

### Step 2: Start the Server
```bash
cd apps/api
pnpm dev
```

You should see:
```
✅ All Redis connections established successfully!
🚀 SmartClips API Server started successfully!
📍 Server: http://localhost:5000
```

### Step 3: Test the System
```bash
# Test 1: Check available plans
curl http://localhost:5000/api/subscriptions/plans

# Test 2: Calculate credits (no auth needed)
curl -X POST http://localhost:5000/api/credits/calculate \
     -H "Content-Type: application/json" \
     -d '{"durationInMinutes": 5}'
```

Expected responses:
```json
// Plans response
{
  "success": true,
  "data": {
    "plans": [...]
  }
}

// Calculate response
{
  "success": true,
  "data": {
    "durationInMinutes": 5,
    "creditsRequired": 5,
    "rate": "1 credit per minute"
  }
}
```

### Step 4: Test with User (Requires Auth)
```bash
# Get your JWT token by logging in first
# Then test credit balance
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/credits/balance
```

Expected response:
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

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Plans endpoint returns 3 tiers (basic, pro, premium)
- [ ] Calculate endpoint works
- [ ] New users have 10 credits (check database or API)
- [ ] Credit balance endpoint works

## 🎯 What's Working

### ✅ Fully Functional
- Credits service (add, deduct, refund, calculate)
- Subscription service (create, update, cancel, resume)
- Watermark service (conditional based on tier)
- All API endpoints
- Database models and migrations
- Middleware for credit checks

### ⏳ Needs Configuration
- Stripe API keys (add yours in .env)
- Stripe webhook (setup in Stripe dashboard)
- Feature integration (follow INTEGRATION_EXAMPLE.md)

## 📚 Where to Go Next

### For Testing
→ Read `API_TESTING_GUIDE.md`
- Complete API reference
- Test card numbers
- Webhook testing with Stripe CLI

### For Integration
→ Read `INTEGRATION_EXAMPLE.md`
- How to add credits to features
- Smart Clipper example (before/after)
- Step-by-step checklist

### For Full Documentation
→ Read `CREDITS_INTEGRATION_GUIDE.md`
- System architecture
- All services explained
- Error handling
- Best practices

## 🔧 Common Issues

### "Cannot find module 'stripe'"
```bash
cd apps/api
pnpm install
```

### "STRIPE_SECRET_KEY is not defined"
Update `.env` with your Stripe keys from dashboard.

### "Prisma Client not generated"
```bash
cd apps/api
npx prisma generate
```

### "Database connection error"
Check your `DATABASE_URL` and `DIRECT_URL` in `.env`

## 🎊 You're All Set!

The system is ready to use. Here's what you have:

✅ **10 free credits** for every new user  
✅ **1 credit = 1 minute** of video processing  
✅ **Watermark** for free tier users  
✅ **3 subscription tiers** with Stripe  
✅ **Automatic refunds** on processing failures  
✅ **Complete API** for credits and subscriptions  

**Next:** Integrate credits into your existing features using the examples provided!

## 📞 Need Help?

Check these files:
- `IMPLEMENTATION_COMPLETE.md` - Full summary of what's done
- `CREDITS_INTEGRATION_GUIDE.md` - Complete technical docs
- `API_TESTING_GUIDE.md` - Testing instructions
- `INTEGRATION_EXAMPLE.md` - Code examples

Happy coding! 🎉
