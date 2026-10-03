import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { googleLogin, getMe, getAuthConfig } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { config } from '../config';

const router = Router();


// Public auth configuration (e.g. public Google Client ID)
router.get('/config', getAuthConfig);


// 1. Passport OAuth Redirect Flow
router.get(
  '/google',
  (req: Request, res: Response, next: NextFunction) => {
    if (!config.googleClientId || !config.googleClientSecret) {
      return res.status(500).json({
        success: false,
        error:
          'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in server/.env.',
        timestamp: new Date().toISOString(),
      });
    }
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })(req, res, next);
  }
);

// 2. Passport OAuth Callback Flow
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/?error=auth_failed',
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) {
      return res.redirect('/?error=no_user');
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with JWT token in query param
    const clientUrl = config.corsOrigins[0] || 'http://localhost:3000';
    res.redirect(`${clientUrl}/?token=${token}`);
  }
);

// 3. Direct Credential/Token exchange API
router.post('/google', googleLogin);

// 4. Current user info
router.get('/me', requireAuth, getMe);

export default router;
