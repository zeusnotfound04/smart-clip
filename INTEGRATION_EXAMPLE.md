# Example: Integrating Credits into Smart Clipper Feature

This file demonstrates how to integrate the credits system into an existing feature (Smart Clipper).

## Original Routes (Before Integration)

```typescript
// routes/smart-clipper.routes.ts
import { Router } from 'express';
import { analyzeVideo } from '../controllers/smart-clipper.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Original route without credits
router.post('/analyze', authMiddleware, analyzeVideo);

export default router;
```

## Updated Routes (After Integration)

```typescript
// routes/smart-clipper.routes.ts
import { Router } from 'express';
import { analyzeVideo } from '../controllers/smart-clipper.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { checkCredits, addCreditInfoToResponse } from '../middleware/credits.middleware.js';

const router: Router = Router();

// Updated route WITH credits middleware
router.post(
  '/analyze',
  authMiddleware,
  // Check if user has enough credits (based on video duration)
  checkCredits(async (req) => {
    // Get video duration from request
    const durationInSeconds = req.body.duration || 300; // default 5 minutes
    const durationInMinutes = durationInSeconds / 60;
    return Math.ceil(durationInMinutes); // 1 credit per minute
  }),
  // Add credit info to response
  addCreditInfoToResponse,
  analyzeVideo
);

export default router;
```

## Original Controller (Before Integration)

```typescript
// controllers/smart-clipper.controller.ts
import { Request, Response } from 'express';
import { analyzeVideoService } from '../services/smart-clipper.service';

export async function analyzeVideo(req: Request, res: Response) {
  try {
    const { videoId, contentType } = req.body;
    const userId = req.user.id;

    const result = await analyzeVideoService(userId, videoId, contentType);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

## Updated Controller (After Integration)

```typescript
// controllers/smart-clipper.controller.ts
import { Request, Response } from 'express';
import { analyzeVideoService } from '../services/smart-clipper.service';

export async function analyzeVideo(req: Request, res: Response) {
  try {
    const { videoId, contentType, duration } = req.body;
    const userId = req.user.id;

    // Service now handles credits and watermark internally
    const result = await analyzeVideoService(userId, videoId, contentType, duration);

    res.json({
      success: true,
      data: result,
      // Credits info automatically added by middleware
      credits: res.locals.creditInfo
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

## Original Service (Before Integration)

```typescript
// services/smart-clipper.service.ts
export async function analyzeVideoService(
  userId: string,
  videoId: string,
  contentType: string
) {
  // Download video
  const videoPath = await downloadVideo(videoId);
  
  // Analyze with Gemini
  const analysis = await geminiAnalyze(videoPath, contentType);
  
  // Generate clips
  const clips = await generateClips(videoPath, analysis);
  
  return { analysis, clips };
}
```

## Updated Service (After Integration)

```typescript
// services/smart-clipper.service.ts
import { creditProcessingHelper } from '../lib/credit-processing.helper.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function analyzeVideoService(
  userId: string,
  videoId: string,
  contentType: string,
  durationInSeconds: number
) {
  const durationInMinutes = durationInSeconds / 60;

  // Process with credits and conditional watermark
  const result = await creditProcessingHelper.processVideoWithCredits(
    {
      userId,
      videoDuration: durationInMinutes,
      projectId: videoId,
      projectType: 'smart_clipper',
      inputPath: '', // will be set in processing
      outputPath: '', // will be set in processing
      description: `Smart Clipper analysis - ${contentType}`,
    },
    async () => {
      // Your original processing logic here
      
      // Download video
      const videoPath = await downloadVideo(videoId);
      
      // Analyze with Gemini
      const analysis = await geminiAnalyze(videoPath, contentType);
      
      // Generate clips
      const clips = await generateClips(videoPath, analysis);
      
      // Save to database
      const project = await prisma.smartClipperProject.create({
        data: {
          userId,
          videoId,
          contentType,
          status: 'completed',
          config: {},
          analysisResults: analysis,
        },
      });

      // Get user's subscription tier for watermark
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      // Apply watermark to clips if free tier
      const finalClips = await Promise.all(
        clips.map(async (clip: any) => {
          if (user?.subscriptionTier === 'free') {
            const watermarked = await addWatermarkToClip(clip.path);
            return { ...clip, path: watermarked, hasWatermark: true };
          }
          return { ...clip, hasWatermark: false };
        })
      );

      return {
        projectId: project.id,
        analysis,
        clips: finalClips,
      };
    }
  );

  return result;
}
```

## Alternative: Manual Credit Handling

If you prefer more control, you can handle credits manually:

```typescript
// services/smart-clipper.service.ts
import { creditsService } from './credits.service.js';
import { watermarkService } from './watermark.service.js';

export async function analyzeVideoService(
  userId: string,
  videoId: string,
  contentType: string,
  durationInSeconds: number
) {
  const durationInMinutes = durationInSeconds / 60;
  const creditsNeeded = Math.ceil(durationInMinutes);

  // 1. Check credits
  const hasCredits = await creditsService.hasEnoughCredits(userId, creditsNeeded);
  if (!hasCredits) {
    const balance = await creditsService.getBalance(userId);
    throw new Error(
      `Insufficient credits. Required: ${creditsNeeded}, Available: ${balance}`
    );
  }

  // 2. Deduct credits
  await creditsService.deductCredits({
    userId,
    amount: creditsNeeded,
    projectId: videoId,
    projectType: 'smart_clipper',
    videoDuration: durationInMinutes,
    description: `Smart Clipper analysis - ${contentType}`,
  });

  try {
    // 3. Process video
    const videoPath = await downloadVideo(videoId);
    const analysis = await geminiAnalyze(videoPath, contentType);
    const clips = await generateClips(videoPath, analysis);

    // 4. Get user tier for watermark
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    // 5. Apply watermark if needed
    const finalClips = await Promise.all(
      clips.map(async (clip: any) => {
        if (watermarkService.shouldApplyWatermark(user!.subscriptionTier)) {
          const outputPath = watermarkService.createWatermarkedPath(clip.path);
          await watermarkService.addWatermark(clip.path, outputPath);
          return { ...clip, path: outputPath, hasWatermark: true };
        }
        return { ...clip, hasWatermark: false };
      })
    );

    return { analysis, clips: finalClips };
  } catch (error: any) {
    // 6. Refund credits on failure
    await creditsService.refundCredits({
      userId,
      amount: creditsNeeded,
      projectId: videoId,
      reason: `Processing failed: ${error.message}`,
    });

    throw error;
  }
}
```

## Integration Checklist

When integrating credits into a feature, ensure you:

- [ ] Add `checkCredits` middleware to route
- [ ] Add `addCreditInfoToResponse` middleware to route
- [ ] Calculate credits based on video duration
- [ ] Deduct credits before processing
- [ ] Apply watermark for free tier users
- [ ] Refund credits if processing fails
- [ ] Include credit info in response
- [ ] Update error handling for insufficient credits
- [ ] Test with different subscription tiers
- [ ] Test credit refund on failures

## Testing the Integration

```bash
# 1. Check user has free trial credits (10)
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/credits/balance

# 2. Process a video (should deduct credits)
curl -X POST http://localhost:5000/api/smart-clipper/analyze \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "videoId": "video123",
       "contentType": "gaming",
       "duration": 300
     }'

# Response should include:
# {
#   "success": true,
#   "data": { ... },
#   "credits": {
#     "deducted": 5,
#     "newBalance": 5
#   }
# }

# 3. Verify credits were deducted
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/credits/balance

# 4. Check transaction history
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/credits/history
```

## Apply Same Pattern to All Features

Use this same integration pattern for:

1. ✅ **Smart Clipper** (example above)
2. **Auto Subtitles** - Same pattern with subtitle duration
3. **Video Generation** - Calculate based on script length/duration
4. **Script Generator** - Estimate duration from script
5. **Fake Conversations** - Calculate from message count/duration
6. **Video Processing** - Based on video duration

Each feature follows the same flow:
1. Check credits (middleware)
2. Deduct credits (service)
3. Process video
4. Apply watermark if free tier
5. Refund on failure
6. Return with credit info
