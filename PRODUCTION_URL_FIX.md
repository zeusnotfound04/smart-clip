# Environment Configuration Guide

## Production URL Mismatch Fix

### Problem
The application was generating double slashes (`//api/...`) in API requests, causing 404 errors in production.

### Root Cause
The `NEXT_PUBLIC_API_URL` environment variable in production had a trailing slash (e.g., `https://your-domain.com/`), which when concatenated with API paths starting with `/api/...` resulted in `https://your-domain.com//api/...`.

### Solution Applied
1. **Code Fix**: Updated `apps/web/app/dashboard/ai-script-generator/page.tsx` to remove trailing slashes from `NEXT_PUBLIC_API_URL` using `.replace(/\/+$/, '')`.
2. **Environment Variable**: Ensured proper configuration in production.

### Production Environment Setup

#### For Vercel/Netlify/Similar Platforms:
Set the following environment variable in your deployment platform:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

**IMPORTANT**: DO NOT include a trailing slash!

✅ Correct: `https://api.smartclip.com`  
❌ Wrong: `https://api.smartclip.com/`

#### For Docker/Self-Hosted:
Create `apps/web/.env.production` file:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Verification
After deployment, check your browser's Network tab. API requests should show:
- ✅ `https://your-api-domain.com/api/ai-script-generator/voices`
- ❌ NOT `https://your-api-domain.com//api/ai-script-generator/voices`

### Quick Fix for Existing Deployment
If you can't redeploy immediately, remove the trailing slash from your `NEXT_PUBLIC_API_URL` environment variable in your hosting platform:

1. Go to your hosting platform's environment variables settings
2. Find `NEXT_PUBLIC_API_URL`
3. Remove any trailing slash from the value
4. Trigger a rebuild/redeploy

### Local Development
For local development, the `.env.local` file already has the correct configuration:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

No trailing slash is present, so local development should work correctly.
