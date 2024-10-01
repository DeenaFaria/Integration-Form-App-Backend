const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkAuth, isAdmin } = require('../middleware/auth'); // Middleware to ensure the user is authenticated

// Create a new template (Authenticated users only)
router.post('/templates', checkAuth, (req, res) => {
  const { templateName, questions } = req.body;
  const userId = req.user.id; // User's ID from the authenticated session

  if (!templateName || !questions) {
    return res.status(400).send('Template name and questions are required');
  }

  const query = 'INSERT INTO templates (name, createdBy, questions) VALUES (?, ?, ?)';
  db.query(query, [templateName, userId, JSON.stringify(questions)], (err, result) => {
    if (err) {
      return res.status(500).send('Error creating template');
    }
    res.send('Template created successfully');
  });
});

// Get all templates (Accessible by all users, authenticated or not)
router.get('/templates', (req, res) => {
  const query = 'SELECT * FROM templates';
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching templates');
    }
    res.json(results);
  });
});

module.exports = router;
