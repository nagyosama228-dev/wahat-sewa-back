export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({ 
          error: 'A record with this information already exists' 
        });
      case '23503': // Foreign key violation
        return res.status(400).json({ 
          error: 'Referenced record does not exist' 
        });
      case '23502': // Not null violation
        return res.status(400).json({ 
          error: 'Required field is missing' 
        });
      default:
        return res.status(500).json({ 
          error: 'Database error occurred' 
        });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Route not found' });
};
