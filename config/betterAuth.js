const { betterAuth } = require('better-auth');
const { mongodbAdapter } = require('better-auth/adapters/mongodb');
const mongoose = require('mongoose');

/**
 * better-auth instance.
 * We use better-auth primarily to manage Google OAuth handshake + session/account
 * linking in MongoDB. Credential login/registration and protected-route checks
 * in this codebase use our own JWT (see middleware/auth.js, utils/token.js) for
 * simplicity and to keep all role-based logic (Tenant/Owner/Admin) in one place.
 *
 * On successful Google sign-in, the route in routes/auth.js reads/creates the
 * corresponding User document, defaults role to 'Tenant', issues our own JWT,
 * and redirects to the client's /auth/callback page with the token.
 */
const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.getClient().db()),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: false, // handled by our custom /api/auth routes (bcrypt + JWT)
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${process.env.BETTER_AUTH_URL || 'http://localhost:5000'}/api/auth/callback/google`,
    },
  },
});

module.exports = auth;
