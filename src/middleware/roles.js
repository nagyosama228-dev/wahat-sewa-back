export const resolveRegistrationRole = (req, res, next) => {
  const requestedRole = String(req.body.role || 'user').toLowerCase();
  const providedSecret = req.body.adminSecret || req.headers['x-admin-registration-secret'];
  const adminSecret = process.env.ADMIN_REGISTRATION_SECRET;

  if (requestedRole === 'admin') {
    if (!adminSecret || providedSecret !== adminSecret) {
      req.body.role = 'user';
      return next();
    }

    req.body.role = 'admin';
    return next();
  }

  req.body.role = 'user';
  next();
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have permission to access this resource' });
  }

  next();
};
