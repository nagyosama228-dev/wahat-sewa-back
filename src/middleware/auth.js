import { verifyAccessToken, isTokenBlacklisted } from '../config/jwt.js';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = verifyAccessToken(token);
    
    // Fetch latest user from DB to ensure claims like role are up to date
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = {
      ...decoded,
      role: user.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (!isTokenBlacklisted(token)) {
        try {
          const decoded = verifyAccessToken(token);
          const user = await User.findById(decoded.id);
          if (user) {
            req.user = {
              ...decoded,
              role: user.role
            };
          }
        } catch (err) {
          // Token invalid, but we continue without authentication
        }
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};
