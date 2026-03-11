import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  allowedOrigins: JSON.parse(process.env.ALLOWED_ORIGINS || '[]'),

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: parseInt(process.env.JWT_EXPIRY || '900', 10),         // 15 min
    refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRY || '28800', 10), // 8 h
    trustedDeviceExpiresIn: 60 * 60 * 24 * 30,                        // 30 days
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  auth: {
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
    passwordResetExpiryMinutes: 60,
    mfaWindowSeconds: 30,           // TOTP window ±1 step either side
  },
}));
