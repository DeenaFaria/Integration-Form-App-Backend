const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const createSalesforceAccountAndContact = require('../config/sales');


// Register Route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], 
        async (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to register user', error: err });
          }

          // User registered in MySQL successfully, now create an account in Salesforce
          try {
            await createSalesforceAccountAndContact({
              firstName: username,
              lastName: '-', // Adjust as needed
              email: email,
              companyName: 'itransition' // Adjust as needed
            });
           // console.log('Salesforce token:', response.data.access_token);
            res.status(201).json({ message: 'User registered successfully and added to Salesforce' });
          } catch (salesforceError) {
            console.error('Salesforce integration error:', salesforceError);
            res.status(201).json({ message: 'User registered successfully, but Salesforce integration failed' });
          }
        }
      );
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
  

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Check if user exists
      db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
          if (err) {
              return res.status(500).json({ message: 'Database error', error: err });
          }

          if (results.length === 0) {
              return res.status(400).json({ message: 'Invalid email or password' });
          }

          const user = results[0];

          // Check if the user is blocked
          if (user.is_blocked) {
              return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
          }

          // Compare password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
              return res.status(400).json({ message: 'Invalid email or password' });
          }

          // Ensure isAdmin exists in the user data
          console.log("User data:", user); // Debugging: log user data

          // Create JWT token
          const payload = {
              id: user.id,
              email: user.email,
              isAdmin: user.is_admin, // Ensure this exists in your database
              username: user.username 
          };
          const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

          return res.json({ token });
      });
  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
});




module.exports = router;
