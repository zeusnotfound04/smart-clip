# Email Authentication with OTP - Setup Guide

## Overview
This implementation adds email verification with OTP (One-Time Password) to your authentication flow using the Resend API.

## Features Implemented

### Backend (API)
1. **Email Service** (`apps/api/src/services/email.service.ts`)
   - Beautiful email templates with your logo
   - OTP verification emails
   - Welcome emails after successful signup
   - Gradient designs and professional styling

2. **Updated Auth Routes** (`apps/api/src/routes/auth.ts`)
   - `POST /api/auth/request-otp` - Request OTP for email verification
   - `POST /api/auth/verify-otp` - Verify OTP code
   - `POST /api/auth/signup` - Complete signup with verified OTP

3. **Database Schema** (Prisma)
   - New `EmailVerification` model to store OTP codes
   - OTP expiration (10 minutes)
   - Verification status tracking

### Frontend (Web)
1. **Multi-step Signup Form** (`apps/web/components/auth/signup-form.tsx`)
   - Step 1: Enter name and email
   - Step 2: Verify OTP with countdown timer
   - Step 3: Set password and complete signup
   - Beautiful UI with animations
   - Resend OTP functionality

2. **Updated Auth Context**
   - Support for OTP-based signup
   - Updated API client

## Setup Instructions

### 1. Get Your Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables

Add these to your `apps/api/.env` file:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=onboarding@yourdomain.com  # Or use onboarding@resend.dev for testing

# Frontend URL (for links in emails)
FRONTEND_URL=http://localhost:3000
```

### 3. Domain Setup (For Production)

#### Option A: Use Resend's Testing Domain (Development)
- Use `onboarding@resend.dev` as FROM_EMAIL
- Limited to 100 emails/day
- Can only send to your own email

#### Option B: Add Your Own Domain (Production)
1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides to your domain provider
5. Wait for verification (usually a few minutes)
6. Use `noreply@yourdomain.com` or `hello@yourdomain.com` as FROM_EMAIL

### 4. Run Database Migration

```bash
cd apps/api
pnpm prisma migrate dev --name add_email_verification
```

This will:
- Create the `email_verifications` table
- Update the database schema

### 5. Generate Prisma Client

```bash
cd apps/api
pnpm db:generate
```

### 6. Restart Your Servers

```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

## Testing the Flow

### 1. Test Signup Flow
1. Go to `http://localhost:3000/auth/signup`
2. Enter your name and email
3. Click "Continue"
4. Check your email for the OTP code
5. Enter the 6-digit code
6. Set your password
7. Complete signup

### 2. Check Your Email
You should receive two emails:
1. **Verification Email** - Contains the 6-digit OTP code
2. **Welcome Email** - Sent after successful account creation

## Email Templates

The implementation includes two beautiful email templates:

### OTP Verification Email
- Professional gradient header with your logo
- Large, easy-to-read OTP code
- 10-minute expiration notice
- Responsive design

### Welcome Email
- Personalized greeting
- Feature highlights
- Call-to-action button to dashboard
- Links to help center and settings

## Security Features

1. **OTP Expiration**: Codes expire after 10 minutes
2. **One-time Use**: OTP is deleted after successful signup
3. **Email Uniqueness**: Prevents duplicate accounts
4. **Password Hashing**: Passwords are securely hashed with bcrypt

## Customization

### Change OTP Length
In `apps/api/src/services/email.service.ts`:
```typescript
static generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}
```

### Change OTP Expiration Time
In `apps/api/src/routes/auth.ts`:
```typescript
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
```

### Update Email Design
Edit the HTML templates in `apps/api/src/services/email.service.ts`:
- `generateOTPEmailHTML()` - OTP verification email
- `generateWelcomeEmailHTML()` - Welcome email

### Change Logo
1. Update your logo at `apps/web/public/logo.png`
2. The emails will automatically use the new logo

## Troubleshooting

### OTP Not Received
1. Check spam/junk folder
2. Verify RESEND_API_KEY is correct
3. Check Resend dashboard for delivery status
4. Ensure FROM_EMAIL is verified (if using custom domain)

### Database Migration Fails
```bash
# Reset and try again
cd apps/api
pnpm prisma migrate reset
pnpm prisma migrate dev
```

### TypeScript Errors
```bash
# Regenerate Prisma client
cd apps/api
pnpm db:generate
```

## API Endpoints

### Request OTP
```bash
POST /api/auth/request-otp
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}

Response:
{
  "message": "Verification code sent to your email",
  "expiresIn": 600
}
```

### Verify OTP
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}

Response:
{
  "message": "Email verified successfully",
  "verified": true
}
```

### Complete Signup
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "otp": "123456"
}

Response:
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "credits": 10,
    "emailVerified": "2024-01-08T..."
  },
  "token": "jwt_token_here"
}
```

## Next Steps

1. **Add Password Reset with OTP**: Implement forgot password using the same OTP system
2. **Email Change Verification**: Verify new email when user changes it
3. **2FA**: Add two-factor authentication option
4. **Email Preferences**: Let users customize email notifications

## Support

If you encounter any issues:
1. Check the console logs in both API and web
2. Verify all environment variables are set correctly
3. Check Resend dashboard for email delivery status
4. Ensure database migrations ran successfully
