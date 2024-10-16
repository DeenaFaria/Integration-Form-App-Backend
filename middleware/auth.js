const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config(); // Load environment variables

// Middleware to check if user is authenticated
const checkAuth = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract the token after 'Bearer'

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded user info to req.user

    // Check if the user is blocked
    const userQuery = 'SELECT is_blocked FROM users WHERE id = ?';
    db.query(userQuery, [req.user.id], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }

      const isBlocked = results[0]?.is_blocked;
      if (isBlocked) {
        // Return 403 if the user is blocked
        return res.status(403).json({ message: 'Your account is blocked. Access denied.' });
      }

      next(); // Proceed if the user is not blocked
    });
  } catch (err) {
    console.error('Token verification failed:', err.message);
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

const isAdminOrCreator = (req, res, next) => {
  const { id } = req.params; // Template ID from the request params
  const authHeader = req.headers.authorization;

  console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('No token provided');
  }

  const token = authHeader.split(' ')[1]; // Extract the token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    const userId = decoded.id; // Change this if your token structure is different
    console.log("User Id from token:", userId);

    // SQL query to check both the creator of the template and the admin status of the user
    const getTemplateAndUserQuery = `
      SELECT templates.user_id AS templateCreatorId, users.is_admin AS isAdmin
      FROM templates
      JOIN users ON users.id = ?
      WHERE templates.id = ?
    `;

    db.query(getTemplateAndUserQuery, [userId, id], (err, result) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).send('Error fetching template or user data');
      }

      if (result.length === 0) {
        return res.status(404).send('Template not found');
      }

      const templateCreatorId = result[0].templateCreatorId;
      const isAdmin = result[0].isAdmin;

      console.log("Template Creator ID:", templateCreatorId);
      console.log("Is Admin:", isAdmin);

      // Check if the user is either an admin or the creator of the template
      if (isAdmin || userId === templateCreatorId) {
        next(); // User is either admin or creator, allow access
      } else {
        res.status(403).send('Access denied. Admins or creators only.');
      }
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).send('Invalid token');
  }
};


const checkAccess = (req, res, next) => {
  const { id } = req.params; // Template ID from URL
  const authHeader = req.headers.authorization;

  console.log("Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error("No token provided");
    return res.status(401).send('No token provided');
  }

  const token = authHeader.split(' ')[1]; // Extract the token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    const userId = decoded.id; // Extract user ID from token
    console.log("User ID from token:", userId);

    // SQL query to fetch template creator and check if the user is an admin
    const getTemplateAndUserQuery = `
      SELECT templates.user_id AS templateCreatorId, users.is_admin AS isAdmin
      FROM templates
      JOIN users ON users.id = ?
      WHERE templates.id = ?
    `;

    db.query(getTemplateAndUserQuery, [userId, id], (err, result) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).send('Error fetching template or user data');
      }

      if (result.length === 0) {
        console.error("Template not found");
        return res.status(404).send('Template not found');
      }

      const templateCreatorId = result[0].templateCreatorId;
      const isAdmin = result[0].isAdmin;

      console.log("Template Creator ID:", templateCreatorId);
      console.log("Is Admin:", isAdmin);

      // Check if the user is either the template creator or an admin
      if (isAdmin || String(userId) === String(templateCreatorId)) {
        console.log("User is either admin or creator, granting access");
        return next(); // Grant access if the user is admin or creator
      }

      // If not admin or creator, check for access settings
      const accessQuery = 'SELECT user_id, can_access FROM access_settings WHERE template_id = ?';

      db.query(accessQuery, [id], (err, accessResults) => {
        if (err) {
          console.error("Error checking access settings:", err);
          return res.status(500).send('Error checking access settings');
        }

        console.log('Access settings results:', accessResults);

        if (accessResults.length > 0) {
          // Check if the user is allowed access
          const userAccessEntry = accessResults.find(entry => entry.user_id === userId);

          if (userAccessEntry && userAccessEntry.can_access) {
            console.log("Authenticated user has access, granting access");
            return next(); // Authenticated user with access can proceed
          } else {
            console.error("Access denied for authenticated user");
            return res.status(403).json({ error: 'Access denied' }); // Access denied for authenticated user
          }
        } else {
          console.log("No access settings found, allowing public access");
          return next(); // No specific access settings, allow public access
        }
      });
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).send('Invalid token');
  }
};





// Optional authentication middleware (not needed if you have JWT handling)
function optionalAuth(req, res, next) {
  // If using session-based authentication, set req.user appropriately
  req.user = req.user || null; // Set req.user to null if no user is found
  next();
}




module.exports = { checkAuth, isAdmin, checkAccess, isAdminOrCreator, optionalAuth };
