const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkAuth } = require('../middleware/auth'); // Only checkAuth middleware is needed

// Create a new template (Authenticated users only)
router.post('/templates', checkAuth, (req, res) => {
  const { title, description, questions, tags } = req.body;
  const userId = req.user.id;

  if (!title || !questions || questions.length === 0) {
    return res.status(400).send('Template title and questions are required');
  }

  // First, insert the template into the templates table
  const query = 'INSERT INTO templates (title, description, user_id, tags) VALUES (?, ?, ?, ?)';
  
  db.query(query, [title, description, userId, JSON.stringify(tags)], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating template');
    }

    const templateId = result.insertId;

    // Prepare the SQL for inserting questions
    const questionsQuery = 'INSERT INTO questions (template_id, type, value, options) VALUES ?'; // Modified to include options

    // Map the questions to the format needed for bulk insert
    const questionData = questions.map(question => [templateId, question.type, question.value, question.options]); // Included options

    // Insert the questions into the questions table
    db.query(questionsQuery, [questionData], (err, questionResult) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saving questions');
      }

      res.send('Template and questions created successfully');
    });
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

// Get a specific template by ID
// Get a specific template by ID along with its questions
router.get('/templates/:id', (req, res) => {
  const { id } = req.params;

  // Query to fetch the template
  const templateQuery = 'SELECT * FROM templates WHERE id = ?';

  db.query(templateQuery, [id], (err, templateResults) => {
    if (err) {
      return res.status(500).send('Error fetching template');
    }
    if (templateResults.length === 0) {
      return res.status(404).send('Template not found');
    }

    const template = templateResults[0]; // Get the first (and only) template

    // Query to fetch the questions associated with this template
    const questionsQuery = 'SELECT * FROM questions WHERE template_id = ?';
    
    db.query(questionsQuery, [id], (err, questionResults) => {
      if (err) {
        return res.status(500).send('Error fetching questions');
      }

      // Add questions to the template data
      template.questions = questionResults;
      
      // Send back the template with its questions
      res.json(template);
    });
  });
});

// Routes
router.put('/templates/:id',checkAuth, (req, res) => {
  const { id } = req.params;
  console.log(`Updating template with ID: ${id}`);
  const { title, description, questions, tags } = req.body;

  // First, update the template details (title, description, tags) in the templates table
  const updateTemplateQuery = `
    UPDATE templates 
    SET title = ?, description = ?, tags = ? 
    WHERE id = ? AND user_id = ?
  `;

  db.query(updateTemplateQuery, [title, description, JSON.stringify(tags), id, req.user.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error updating template details' });
    }

    // Check if the template exists and belongs to the user
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found or you do not have permission to update it' });
    }

    // Now update the questions associated with the template
    // First, delete the existing questions to replace them with the updated ones
    const deleteQuestionsQuery = 'DELETE FROM questions WHERE template_id = ?';

    db.query(deleteQuestionsQuery, [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error removing old questions' });
      }

      // Insert the updated questions
      const insertQuestionsQuery = 'INSERT INTO questions (template_id, type, value, options) VALUES ?';
      const questionData = questions.map(question => [id, question.type, question.value, JSON.stringify(question.options)]);

      db.query(insertQuestionsQuery, [questionData], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error saving updated questions' });
        }

        res.json({ message: 'Template and questions updated successfully' });
      });
    });
  });
});

module.exports = router;
