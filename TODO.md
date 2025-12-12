# SmartClips Development Roadmap

## Phase 1 : Database & Schema Setup
- [x] Update Prisma schema with credits and subscription models
- [x] Create database migration

## Phase 2 : Stripe Integration
- [x] Install and configure Stripe SDK
- [x] Create Stripe webhook handler
- [x] Create subscription service with Stripe integration

## Phase 3 :  Credits System
- [x] Create credits service for management and tracking
- [x] Create credits middleware for request validation
- [x] Create credits and subscription API routes
- [x] Create credits and subscription controllers

## Phase 4 :  Feature Integration
- [x] Create watermark service for free users
- [ ] Add watermark to free tier outputs (Helper created - needs integration)
- [ ] Integrate credit deduction in all features
- [ ] Update API routes with credits middleware

## 📝 Integration Status

### ✅ Core System Complete
All core infrastructure for credits and subscriptions is complete:
- Database models and migrations
- Stripe integration with webhooks
- Credits service (add, deduct, refund, calculate)
- Subscription service (create, update, cancel, resume)
- Watermark service (conditional application)
- All API routes and controllers
- Middleware for credit checks
- Helper utilities

### 🔄 Feature Integration Needed
Apply the credit system to each feature:
1. **Smart Clipper** - Add credits middleware and watermark
2. **Auto Subtitles** - Add credits middleware  
3. **Video Generation** - Add credits middleware and watermark
4. **Script Generator** - Add credits middleware
5. **Fake Conversations** - Add credits middleware and watermark
6. **Video Processing** - Add credits middleware and watermark

### 📖 Documentation
- [x] Complete integration guide created: `CREDITS_INTEGRATION_GUIDE.md`
- [ ] Frontend API documentation
- [ ] User documentation

## 🎯 Next Steps for Developer

1. **Review Integration Guide**: See `CREDITS_INTEGRATION_GUIDE.md` for examples
2. **Update Stripe Keys**: Replace placeholders in `.env` with real Stripe keys
3. **Test Credit Flow**: Use test endpoints to verify credit system works
4. **Integrate Features**: Follow the pattern in integration guide for each feature
5. **Setup Stripe Webhook**: Configure webhook URL in Stripe dashboard
6. **Frontend Integration**: Create UI for credits display and subscription management


## Technical Stack

### Backend ✅
- [x] Node.js/Express API (function-based architecture)
- [x] Prisma ORM with PostgreSQL
- [x] Google Cloud APIs (Speech-to-Text, Video Intelligence, Gemini, Text-to-Speech)
- [x] FFmpeg for video processing (@ffmpeg/ffmpeg)
- [x] AWS S3 for file storage with presigned URLs
- [x] Bull/Redis for job queues (implemented)

### Frontend
- Next.js 14 with TypeScript
- React Hook Form with Zod validation
- TailwindCSS for styling
- Framer Motion for animations
- React Player for video preview
- Recharts for analytics

### Infrastructure
- Google Cloud Platform
- Redis for job queues and caching
- PostgreSQL for primary database
- Docker for containerization

## Success Metrics
- Video upload and processing success rate > 95%
- Subtitle accuracy > 90%
- Average processing time < 2 minutes for 10-minute videos
- User retention rate > 60% after first week
- Feature adoption rate > 40% for each core feature