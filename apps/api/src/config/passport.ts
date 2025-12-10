import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prisma';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              image: profile.photos?.[0]?.value,
              emailVerified: new Date(), // Google accounts are pre-verified
            },
          });

          // Create account link
          await prisma.account.create({
            data: {
              userId: user.id,
              type: 'oauth',
              provider: 'google',
              providerAccountId: profile.id,
              access_token: accessToken,
              refresh_token: refreshToken,
              token_type: 'Bearer',
              scope: 'openid profile email',
            },
          });
        } else {
          // Update existing user's Google account info
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: user.id,
              provider: 'google',
            },
          });

          if (existingAccount) {
            // Update tokens
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: accessToken,
                refresh_token: refreshToken,
              },
            });
          } else {
            // Link Google account to existing user
            await prisma.account.create({
              data: {
                userId: user.id,
                type: 'oauth',
                provider: 'google',
                providerAccountId: profile.id,
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: 'openid profile email',
              },
            });
          }

          // Update user profile
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName,
              image: profile.photos?.[0]?.value,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
