const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { checkAuth } = require('../middleware/auth'); // Only checkAuth middleware is needed

// Create a new template (Authenticated users only)
router.post('/templates', checkAuth, (req, res) => {
  const { title, description, questions, tags } = req.body;
  const userId = req.user.id; // Now req.user contains the logged-in user's data, including the id

  if (!title || !questions || questions.length === 0) {
    return res.status(400).send('Template title and questions are required');
  }

  // Insert the template into the database, including the user_id
  const query = 'INSERT INTO templates (title, description, user_id, tags) VALUES (?, ?, ?, ?)';
  
  db.query(query, [title, description, userId, JSON.stringify(tags)], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error creating template');
    }

    const templateId = result.insertId;

    // Insert questions into the questions table
    const questionsQuery = 'INSERT INTO questions (template_id, type, value, options) VALUES ?';
    const questionData = questions.map(question => [templateId, question.type, question.value, question.options]);

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
    WHERE id = ? AND user_id=?
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

// Route to handle form submission
// Route to handle form submission
router.post('/submitForm/:formId', checkAuth, async (req, res) => {
  const { formId } = req.params;
  const { responses } = req.body;
  const userId = req.user.id; // Assuming you have user info in req.user from JWT token

  // Check if responses are provided
  if (!responses) {
    return res.status(400).send('Responses are required');
  }

  try {
    // Insert the form responses into the database
    const result = db.query(
      'INSERT INTO form_responses (user_id, form_id, response_data) VALUES (?, ?, ?)',
      [userId, formId, JSON.stringify(responses)]
    );

    // Optionally, check if the insertion was successful
    if (result.affectedRows === 0) {
      return res.status(500).send('No response was submitted');
    }

    res.status(200).json({ message: 'Form submitted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting form' });
  }
});


router.get('/formResponses/:formId', checkAuth, (req, res) => {
  const { formId } = req.params;
  const userId = req.user.id;

  // First, check if the current user is the creator of the form
  db.query(
    'SELECT user_id FROM templates WHERE id = ?',
    [formId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error checking form creator' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Form not found' });
      }

      const formCreatorId = results[0].user_id;

      // If the user is not the creator, deny access
      if (formCreatorId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to view these responses' });
      }

      // If the user is the creator, fetch the form responses
      db.query(
        'SELECT * FROM form_responses WHERE form_id = ?',
        [formId],
        (err, responses) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error fetching responses' });
          }

          res.status(200).json(responses); // Send the responses as JSON
        }
      );
    }
  );
});



module.exports = router;
