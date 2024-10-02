const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load environment variables

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract the token after 'Bearer'

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add user info to request object
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message); // Log error for debugging
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next(); // User is an admin, allow access
  } else {
    res.status(403).send('Access denied. Admins only.');
  }
};

module.exports = { checkAuth, isAdmin };
