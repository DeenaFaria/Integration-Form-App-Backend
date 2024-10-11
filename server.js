const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const db = require('./config/db');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));  // Set the JSON body size limit
app.use(express.urlencoded({ limit: '10mb', extended: true }));  // Set the URL-encoded body size limit

// Middleware
//app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000', // Replace with your frontend's URL
  credentials: true // Allow credentials (such as cookies and tokens)
}));

// Start server
const PORT = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).send('Invalid token');
      }
      console.log('Decoded user:', user); // Debugging line
      req.user = user;
      next();
    });
  } else {
    res.status(401).send('Token not provided');
  }
};

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) { // Assuming user info is in req.user after login
    next(); // Proceed if admin
  } else {
    res.status(403).send('Access denied'); // Forbidden if not admin
  }
};

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.user) { // Assuming req.user is set when logged in
    next();
  } else {
    res.status(401).send('Please log in first'); // Unauthorized for non-authenticated users
  }
};

// Routes

// Auth routes (registration, login)
app.use('/routes/auth', authRoutes);

// Admin routes (protected by admin check)
app.use('/admin', authenticateJWT, isAdmin, adminRoutes);

// User routes (protected selectively, not applied globally)
app.use('/user', userRoutes);
app.use('/routes/user', userRoutes); // Mount user routes at /routes/user

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
