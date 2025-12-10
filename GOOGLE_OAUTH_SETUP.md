# Google OAuth Setup Guide

## Setup Complete ✅

The following has been configured:

1. **NextAuth.js installed** with Google OAuth and Credentials providers
2. **Prisma adapter** integrated for session management
3. **Authentication UI** updated with Google sign-in buttons
4. **Environment variables** template created

## Next Steps

### 1. Generate NextAuth Secret

Run this command to generate a secure secret:

```powershell
# Using Node.js crypto
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and add it to your `.env` file as `NEXTAUTH_SECRET`.

### 2. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/auth/callback/google`
     - Production: `https://yourdomain.com/api/auth/callback/google`
   - Click "Create"

5. Copy your **Client ID** and **Client Secret**

### 3. Update Environment Variables

Edit `.env` file in the root directory:

```env
# NextAuth.js
NEXTAUTH_SECRET="your-generated-secret-from-step-1"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 4. Database Migration (if needed)

Your Prisma schema already has the required NextAuth models. If you haven't run migrations yet:

```powershell
cd apps/api
pnpm prisma migrate dev --name add-nextauth
```

### 5. Start the Application

```powershell
# From root directory
pnpm dev
```

## What's Been Implemented

### Authentication Files

- `apps/web/lib/auth.ts` - NextAuth configuration with GoogleProvider and CredentialsProvider
- `apps/web/app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler
- `apps/web/types/next-auth.d.ts` - TypeScript type definitions (already existed)

### UI Components Updated

- `apps/web/components/auth/signin-form.tsx` - Added Google sign-in button
- `apps/web/components/auth/signup-form.tsx` - Added Google sign-up button

### Features

✅ Google OAuth authentication with offline access
✅ Existing credentials authentication preserved
✅ Prisma adapter for session management
✅ JWT strategy with user ID in token
✅ Automatic account creation for new Google users
✅ Password hashing with bcryptjs
✅ Session callbacks for user data

## Testing

1. Start your application: `pnpm dev`
2. Navigate to: `http://localhost:3000/auth/signin`
3. Click "Continue with Google"
4. Authorize the application
5. You should be redirected to `/dashboard`

## Troubleshooting

### "Invalid client" error
- Check that your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Verify the redirect URI in Google Cloud Console matches exactly

### "Configuration error" on startup
- Ensure `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your development URL

### Database connection issues
- Check `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Run migrations if needed

## Security Notes

- Never commit `.env` file to version control
- Use different credentials for development and production
- Rotate secrets regularly in production
- Enable 2FA on your Google Cloud Console account

## Production Deployment

1. Generate a new `NEXTAUTH_SECRET` for production
2. Create production OAuth credentials in Google Cloud Console
3. Add production redirect URI: `https://yourdomain.com/api/auth/callback/google`
4. Update environment variables on your hosting platform
5. Ensure `NEXTAUTH_URL` matches your production domain
