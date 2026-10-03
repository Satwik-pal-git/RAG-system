import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';
import { UserModel } from '../models';

export const configurePassport = () => {
  if (config.googleClientId && config.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.googleClientId,
          clientSecret: config.googleClientSecret,
          callbackURL: '/api/auth/google/callback',
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email =
              profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;

            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }

            const name = profile.displayName || email.split('@')[0];
            const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : '';

            // Upsert User in MongoDB
            const user = await UserModel.findOneAndUpdate(
              { email },
              {
                $set: {
                  googleId: profile.id,
                  name,
                  avatarUrl,
                  lastLoginAt: new Date(),
                },
              },
              { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
            );

            return done(null, {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
            });
          } catch (err: any) {
            console.error('[Passport] Error during Google authentication:', err);
            return done(err, undefined);
          }
        }
      )
    );
    console.log('[Passport] Google OAuth Strategy initialized successfully.');
  } else {
    console.warn(
      '[Passport] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google OAuth redirect flow is inactive.'
    );
  }
};
