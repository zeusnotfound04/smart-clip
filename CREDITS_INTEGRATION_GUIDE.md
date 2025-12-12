# Credits and Subscription System Integration Guide

## Overview
This document provides a complete guide on how the credits and subscription system has been integrated into the SmartClips platform.

## System Architecture

### Database Models
- **User**: Extended with credits, subscription tier, and Stripe customer information
- **CreditTransaction**: Tracks all credit operations (usage, purchase, refund, bonus)
- **SubscriptionHistory**: Complete history of user subscriptions
- **SubscriptionPlan**: Available subscription tiers and pricing

### Subscription Tiers
1. **Free Trial** (10 credits, with watermark)
2. **Basic Plan** (100 credits/month, no watermark) - $9.99/month or $99.99/year
3. **Pro Plan** (300 credits/month, no watermark) - $29.99/month or $299.99/year
4. **Premium Plan** (Unlimited, no watermark) - $99.99/month or $999.99/year

### Credit System
- **1 Credit = 1 Minute of Video Processing**
- Credits are deducted before processing starts
- Automatic refund if processing fails
- Premium users have unlimited credits (no deduction but tracked for analytics)

## API Endpoints

### Credits Management
```
GET    /api/credits/balance        - Get current balance and stats
GET    /api/credits/history        - Get transaction history
POST   /api/credits/calculate      - Calculate credits for duration
GET    /api/credits/stats          - Get usage statistics
```

### Subscription Management
```
GET    /api/subscriptions/plans    - Get available plans
GET    /api/subscriptions/details  - Get user's subscription
POST   /api/subscriptions/create   - Create new subscription
POST   /api/subscriptions/cancel   - Cancel subscription
POST   /api/subscriptions/resume   - Resume canceled subscription
PUT    /api/subscriptions/update   - Update subscription tier
```

### Stripe Webhooks
```
POST   /api/stripe/webhook         - Handle Stripe events
```

## Integration Guide

### Step 1: Add Credits Middleware to Routes

```typescript
import { checkCredits, addCreditInfoToResponse } from '../middleware/credits.middleware.js';

// Example: Smart Clipper route
router.post(
  '/analyze',
  authenticateToken,
  checkCredits(async (req) => {
    // Calculate based on video duration
    const duration = req.body.videoDuration || 5; // in minutes
    return Math.ceil(duration);
  }),
  addCreditInfoToResponse,
  smartClipperController.analyzeVideo
);
```

### Step 2: Use Credit Processing Helper in Services

```typescript
import { creditProcessingHelper } from '../lib/credit-processing.helper.js';

async function processVideo(userId: string, videoPath: string, duration: number) {
  const result = await creditProcessingHelper.processVideoWithCredits(
    {
      userId,
      videoDuration: duration,
      projectType: 'smart_clipper',
      inputPath: videoPath,
      outputPath: `/path/to/output.mp4`,
      description: 'Smart Clipper video analysis',
    },
    async () => {
      // Your video processing logic here
      return await actualProcessingFunction(videoPath);
    }
  );

  return result; // { success, outputPath, creditsUsed, newBalance }
}
```

### Step 3: Apply Watermark for Free Users

The watermark is automatically applied based on subscription tier:

```typescript
import { watermarkService } from '../services/watermark.service.js';

// Automatic watermark based on tier
const finalPath = await watermarkService.processVideoWithConditionalWatermark(
  processedVideoPath,
  outputPath,
  user.subscriptionTier
);

// Or manual control
if (watermarkService.shouldApplyWatermark(user.subscriptionTier)) {
  await watermarkService.addWatermark(inputPath, outputPath, {
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 24,
    fontColor: 'white',
    text: 'Smart Clip'
  });
}
```

## Integration Checklist for Each Feature

For each video processing feature (Smart Clipper, Auto Subtitles, Video Generation, etc.):

### 1. Route Level
- [ ] Add `checkCredits` middleware to validate credits before processing
- [ ] Add `addCreditInfoToResponse` middleware to include credit info in response
- [ ] Calculate required credits based on video duration

### 2. Controller Level
- [ ] Check credits before queuing job
- [ ] Return credit information in response
- [ ] Handle insufficient credits error

### 3. Service Level
- [ ] Use `creditProcessingHelper.processVideoWithCredits()` wrapper
- [ ] Deduct credits before processing
- [ ] Apply watermark based on subscription tier
- [ ] Refund credits if processing fails

### 4. Worker/Queue Level
- [ ] Check credits again before processing (in case of delays)
- [ ] Update credit transaction with project ID
- [ ] Handle credit refunds on failures

## Example: Complete Feature Integration

```typescript
// routes/feature.routes.ts
import { checkCredits, addCreditInfoToResponse } from '../middleware/credits.middleware.js';

router.post(
  '/process',
  authenticateToken,
  checkCredits(async (req) => {
    const durationInMinutes = parseFloat(req.body.duration) / 60;
    return Math.ceil(durationInMinutes);
  }),
  addCreditInfoToResponse,
  featureController.process
);

// controllers/feature.controller.ts
export const featureController = {
  async process(req: AuthRequest, res: Response) {
    const { videoPath, duration } = req.body;
    
    try {
      const result = await featureService.processWithCredits(
        req.user!.id,
        videoPath,
        duration
      );

      res.json({
        success: true,
        data: result,
        credits: res.locals.creditInfo
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// services/feature.service.ts
import { creditProcessingHelper } from '../lib/credit-processing.helper.js';
import { watermarkService } from '../services/watermark.service.js';

export const featureService = {
  async processWithCredits(userId: string, videoPath: string, durationInMinutes: number) {
    return await creditProcessingHelper.processVideoWithCredits(
      {
        userId,
        videoDuration: durationInMinutes,
        projectType: 'feature_name',
        inputPath: videoPath,
        outputPath: `/output/${Date.now()}.mp4`,
        description: 'Feature processing'
      },
      async () => {
        // Your actual processing logic
        const processed = await processVideo(videoPath);
        return processed;
      }
    );
  }
};
```

## Environment Variables Required

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Watermark Configuration
WATERMARK_TEXT="Smart Clip"
WATERMARK_POSITION=bottom-right
WATERMARK_OPACITY=0.7
WATERMARK_FONT_SIZE=24
WATERMARK_FONT_COLOR=white
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Testing

### Test Credit System
```bash
# Get balance
GET /api/credits/balance

# Calculate credits needed
POST /api/credits/calculate
{
  "durationInMinutes": 5
}

# Get transaction history
GET /api/credits/history?limit=10
```

### Test Subscription
```bash
# Get plans
GET /api/subscriptions/plans

# Create subscription
POST /api/subscriptions/create
{
  "tier": "basic",
  "billingPeriod": "monthly",
  "paymentMethodId": "pm_card_visa"
}
```

## Error Handling

### Insufficient Credits (402 Payment Required)
```json
{
  "success": false,
  "message": "Insufficient credits",
  "error": {
    "required": 10,
    "available": 5,
    "shortfall": 5
  }
}
```

### Processing Failure (Automatic Refund)
When processing fails, credits are automatically refunded with a transaction record.

## Migration Status

✅ **Completed:**
- Database schema with credits and subscription models
- Prisma migration applied
- Stripe SDK installed and configured
- Credits service (deduct, add, refund, calculate)
- Subscription service (create, update, cancel, resume)
- Watermark service (conditional application)
- Credits middleware (check and deduct)
- All controllers (credits, subscription, webhook)
- All routes (credits, subscription, stripe)
- Main app integration (routes registered)
- Helper utilities (credit processing)

⏳ **Remaining:**
- Integration into existing features:
  - Smart Clipper
  - Auto Subtitles  
  - Video Generation
  - Script Generator
  - Fake Conversations
  - Video Processing

## Next Steps

1. **Integrate into Smart Clipper** - Add credits check and watermark
2. **Integrate into Auto Subtitles** - Add credits deduction
3. **Integrate into Video Generation** - Add credits and watermark
4. **Integrate into other features** - Apply same pattern
5. **Frontend Integration** - Create UI for credits and subscriptions
6. **Testing** - Test all flows with real Stripe test cards
7. **Documentation** - API documentation for frontend team

## Support

For issues or questions, refer to:
- Stripe Documentation: https://stripe.com/docs
- Prisma Documentation: https://www.prisma.io/docs
- FFmpeg Watermark: https://ffmpeg.org/ffmpeg-filters.html#drawtext
