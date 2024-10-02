const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkAuth } = require('../middleware/auth'); // Only checkAuth middleware is needed

// Create a new template (Authenticated users only)
router.post('/templates', checkAuth, (req, res) => {
  const { title, description, questions, tags } = req.body;
  const userId = req.user.id; // User's ID from the authenticated session

  if (!title || !questions) {
    return res.status(400).send('Template title and questions are required');
  }

  const query = 'INSERT INTO templates (title, description, user_id, tags) VALUES (?, ?, ?, ?)';
  
  // Use an arrow function to maintain context
  db.query(query, [title, description, userId, JSON.stringify(tags)], (err, result) => {
    if (err) {
      console.error(err); // Log the error to the console for debugging
      return res.status(500).send('Error creating template'); // Ensure `res` is still in context
    }
    res.send('Template created successfully');
  });
});


// Get all templates (Accessible by everyone, authenticated or not)
router.get('/templates', (req, res) => {
  const query = 'SELECT * FROM templates';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching templates');
    }
    res.json(results);
  });
});

// Get a specific template by ID (Authenticated users only)
router.get('/templates/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM templates WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching template');
    }
    if (results.length === 0) {
      return res.status(404).send('Template not found');
    }
    res.json(results[0]); // Return the first (and only) template
  });
});


module.exports = router;
