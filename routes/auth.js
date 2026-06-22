const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { generateToken } = require('../utils/token');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

/**
 * Google OAuth flow.
 * GET /api/auth/google         -> redirects browser to Google's consent screen
 * GET /api/auth/google/callback -> Google redirects here with `code`; we exchange it,
 *                                   fetch the profile, create/find the User (role
 *                                   defaults to 'Tenant'), issue our JWT, and redirect
 *                                   to the Next.js client's /auth/callback page with
 *                                   the token + user info as query params.
 *
 * NOTE: In production, replace the manual fetch-based exchange below with
 * better-auth's built-in Google provider handler (see config/betterAuth.js) once
 * it is mounted via `app.all('/api/auth/*', toNodeHandler(auth))`. This explicit
 * version is included so the flow is fully readable and self-contained.
 */
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BETTER_AUTH_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BETTER_AUTH_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Failed to obtain Google access token');

    // Fetch Google profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    // Find or create user — social signups always default to Tenant role
    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        photo: profile.picture || '',
        googleId: profile.id,
        role: 'Tenant',
        provider: 'google',
      });
    } else if (!user.googleId) {
      user.googleId = profile.id;
      user.provider = 'google';
      await user.save();
    }

    const jwtToken = generateToken(user._id);
    const redirectParams = new URLSearchParams({
      token: jwtToken,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo || '',
    });
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?${redirectParams.toString()}`);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
});

module.exports = router;
