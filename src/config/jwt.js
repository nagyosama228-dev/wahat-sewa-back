import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_refresh_secret';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

// Token blacklist for logout functionality
const tokenBlacklist = new Set();

export const addToBlacklist = (token) => {
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Clean up expired tokens from blacklist periodically
setInterval(() => {
  const now = Date.now();
  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp * 1000 < now) {
        tokenBlacklist.delete(token);
      }
    } catch (err) {
      tokenBlacklist.delete(token);
    }
  }
}, 3600000); // Clean up every hour
