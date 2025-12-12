# Credit System Implementation Guide

## Overview
The credit system has been successfully implemented across all video processing services. The system enforces the following rules:

- **1 credit = 60 seconds of video processing**
- **Free tier users**: Start with 10 credits, videos include watermark
- **Paid tier users** (Basic, Premium, Enterprise): No watermark, must purchase credits

## Features Implemented

### 1. Credit Service (`apps/api/src/services/credit.service.ts`)
Core service for managing credits:

- `calculateCreditsRequired(duration)` - Calculate credits for video duration
- `checkUserCredits(userId, required)` - Check if user has enough credits
- `deductCredits(userId, amount, description)` - Deduct credits and log transaction
- `addCredits(userId, amount, type, description)` - Add credits (purchase/bonus)
- `getUserCreditInfo(userId)` - Get balance and transaction history
- `shouldApplyWatermark(userId)` - Check if watermark needed (free tier only)
- `validateAndPrepareProcessing(userId, duration, feature)` - Complete validation

### 2. Watermark Service Updated (`apps/api/src/services/watermark.service.ts`)
- Now accepts `userId` parameter
- Automatically skips watermark for paid tier users (Basic, Premium, Enterprise)
- Free tier users get large center watermark (95% width, 95% opacity)

### 3. Services Integrated with Credits

#### Auto-Subtitles (`apps/api/src/services/auto-subtitles.service.ts`)
- ✅ Credit validation before processing
- ✅ Automatic credit deduction after success
- ✅ Watermark based on subscription tier
- ✅ Transaction logging with video metadata

#### Clip Generation (`apps/api/src/services/clip-generation.service.ts`)
- ✅ Credit validation per clip
- ✅ Automatic credit deduction
- ✅ Watermark based on subscription tier
- ✅ Transaction logging

#### Workers Updated (`apps/api/src/workers/index.ts`)
- ✅ Subtitle generation worker now requires `userId`
- ✅ Clip generation workers updated with `userId` parameter
- ✅ Smart clipper updated to fetch userId before processing

### 4. API Routes (`apps/api/src/routes/credits.ts`)
New credit management endpoints:

```
GET  /api/credits/balance        - Get user's credit balance and stats
POST /api/credits/calculate      - Calculate credits for duration
POST /api/credits/validate       - Validate if user has enough credits
GET  /api/credits/transactions   - Get transaction history
```

## Usage Examples

### Frontend - Check Credits Before Upload
\`\`\`typescript
// Calculate required credits
const response = await fetch('/api/credits/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoDuration: 180 }) // 3 minutes
});
const { creditsRequired } = await response.json();
// creditsRequired = 3

// Validate user has enough credits
const validation = await fetch('/api/credits/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ 
    videoDuration: 180,
    featureName: 'Auto-Subtitles'
  })
});
const { canProcess, message, shouldWatermark } = await validation.json();
\`\`\`

### Backend - Service Usage
\`\`\`typescript
import { CreditService } from './services/credit.service';

// Before processing
const validation = await CreditService.validateAndPrepareProcessing(
  userId,
  videoDuration,
  'Auto-Subtitles'
);

if (!validation.canProcess) {
  throw new Error(validation.message); // "Insufficient credits..."
}

// After successful processing
await CreditService.deductCredits(
  userId,
  validation.creditsRequired,
  'Auto-Subtitles: 180s video',
  { videoId, feature: 'auto-subtitles', videoDuration: 180 }
);
\`\`\`

## Database Schema
Already configured in Prisma:

\`\`\`prisma
model User {
  credits          Int       @default(10)
  totalCreditsUsed Int       @default(0)
  subscriptionTier String    @default("free")
  creditTransactions CreditTransaction[]
}

model CreditTransaction {
  id           String   @id @default(cuid())
  userId       String
  amount       Int      // Negative for usage, positive for purchase
  type         String   // 'usage', 'purchase', 'refund', 'bonus', 'subscription'
  description  String
  balanceAfter Int
  metadata     Json?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}
\`\`\`

## Subscription Tiers

### Free Tier
- **Credits**: 10 free on signup
- **Watermark**: YES (large center watermark, 95% width, 95% opacity)
- **Features**: All features available with watermark

### Basic / Premium / Enterprise Tiers
- **Credits**: Must purchase (not included by default)
- **Watermark**: NO - clean videos
- **Features**: All features without watermark

## Frontend Integration Tasks

### 1. Update Upload Components
Add credit validation before allowing uploads:
- Show required credits based on video duration
- Display warning if insufficient credits
- Block upload if not enough credits
- Show "Upgrade" button for free tier users

### 2. Update Credits Display Component
\`apps/web/components/credits-display.tsx\` needs:
- Real-time balance from `/api/credits/balance`
- Show tier badge (Free/Basic/Premium/Enterprise)
- Watermark indicator for free tier
- Link to upgrade/purchase credits

### 3. Add Pre-Upload Validation
In video upload handlers:
\`\`\`typescript
const validateCredits = async (file: File) => {
  const duration = await getVideoDuration(file);
  const response = await fetch('/api/credits/validate', {
    method: 'POST',
    body: JSON.stringify({ videoDuration: duration }),
    credentials: 'include'
  });
  const { canProcess, message } = await response.json();
  if (!canProcess) {
    alert(message);
    return false;
  }
  return true;
};
\`\`\`

### 4. Create Credits Page
New page at \`/credits\` for:
- Current balance display
- Transaction history
- Credit purchase options
- Tier upgrade options
- Watermark explanation

## Worker Updates Required

When calling these workers, pass \`userId\`:

\`\`\`typescript
// Subtitle generation
await subtitleQueue.add('generate-subtitles', {
  videoId,
  s3Key,
  userId  // ← Add this
});

// Clip generation
await smartClipperQueue.add('generate-clip', {
  segmentId,
  videoPath,
  startTime,
  endTime,
  exportSettings,
  projectId,
  userId  // ← Add this
});
\`\`\`

## Error Messages

Users will see clear error messages:
- "Insufficient credits. You have X credits but need Y credits. Please upgrade your plan."
- Credit deduction happens AFTER successful processing (not before)
- If deduction fails, video still completes (logged error only)

## Testing Checklist

- [ ] Free user with 10 credits can process 10 minutes of video
- [ ] Free user videos have watermark
- [ ] Paid user videos have NO watermark
- [ ] Credit deduction happens after processing
- [ ] Transaction history logged correctly
- [ ] API routes return correct credit balance
- [ ] Insufficient credits blocks processing with clear message
- [ ] Credits display updates in real-time

## Next Steps

1. Update all route handlers to pass \`userId\` to workers
2. Add frontend credit validation in upload flows
3. Create credits purchase/upgrade flow
4. Add credit balance display to dashboard
5. Test end-to-end credit flow
6. Add Stripe integration for credit purchases
