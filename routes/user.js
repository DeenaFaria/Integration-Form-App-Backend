const express = require('express');
const router = express.Router();
const db = require('../config/db');
const cloudinary = require('../config/cloud');
const { checkAuth } = require('../middleware/auth'); // Only checkAuth middleware is needed
const multer = require('multer');


// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Local directory to store uploaded files temporarily
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Naming files uniquely
  },
});

const upload = multer({ storage });

// Create a new template (Authenticated users only)
// Create a new template route
router.post('/templates', checkAuth, upload.single('image'), async (req, res) => {
  const { title, description, questions, tags } = req.body;
  const userId = req.user.id;
  const imageFile = req.file;

  console.log('Image File:', req.file);


  let imageUrl = null;

  // If an image is uploaded, handle Cloudinary upload
  if (imageFile) {
    try {
      const result = await cloudinary.uploader.upload(imageFile.path);
      imageUrl = result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ message: 'Error uploading image' });
    }
  }

  // Save template data to database
  const query = 'INSERT INTO templates (title, description, user_id, tags, image_url) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [title, description, userId, JSON.stringify(tags), imageUrl], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error creating template' });
    }

    const templateId = result.insertId;
    const questionsQuery = 'INSERT INTO questions (template_id, type, value, options) VALUES ?';
    const questionData = questions.map(q => [templateId, q.type, q.value, JSON.stringify(q.options)]);

    db.query(questionsQuery, [questionData], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error saving questions' });
      }

      res.json({ message: 'Template and questions created successfully' });
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
// Update an existing template
router.put('/templates/:id', checkAuth,upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { title, description, questions, tags } = req.body;
  const imageFile = req.file; // Again assuming multer or similar middleware is used
  console.log('Received request to update template:', { id, title, description, questions, tags });
  console.log('Image file:', imageFile); // Log the image file details

  let imageUrl = null;

  // If a new image was uploaded, upload to Cloudinary
  if (imageFile) {
    try {
      const result = await cloudinary.uploader.upload(imageFile.path);
      imageUrl = result.secure_url; // Get the uploaded image URL
    } catch (err) {
      console.error('Error uploading image to Cloudinary:', err);
      return res.status(500).send('Error uploading image');
    }
  }

  // First, update the template details (title, description, tags, and possibly image URL)
  const updateTemplateQuery = `
    UPDATE templates 
    SET title = ?, description = ?, tags = ?, image_url = IFNULL(?, image_url) 
    WHERE id = ? AND user_id = ?
  `;

  db.query(updateTemplateQuery, [title, description, tags, imageUrl, id, req.user.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error updating template details' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found or you do not have permission to update it' });
    }

    // Now update the questions
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

router.post('/templates/:id/comments', checkAuth, (req, res) => {
  const { text } = req.body;
  const userId = req.user.id; // User ID from middleware
  const templateId = req.params.id;

  // Validate the input
  if (!text) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  db.query(
    'INSERT INTO comments (template_id, user_id, content) VALUES (?, ?, ?)',
    [templateId, userId, text], // Correct use of 'text'
    (error, results) => {
      if (error) {
        console.error(error); // Log the error
        return res.status(500).send('Server error');
      }
      res.status(201).json({ id: results.insertId, userId, text, createdAt: new Date() });
    }
  );
});



// POST /templates/:id/like
router.post('/templates/:id/like', checkAuth, (req, res) => {
  const templateId = req.params.id;
  const userId = req.user.id;

  // Check if the user has already liked the template
  db.query('SELECT * FROM likes WHERE user_id = ? AND template_id = ?', [userId, templateId], (error, likeResults) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }

    if (likeResults.length > 0) {
      return res.status(400).json({ message: 'You have already liked this template' });
    }

    // Insert the like into the likes table
    db.query('INSERT INTO likes (user_id, template_id) VALUES (?, ?)', [userId, templateId], (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
      }

      // Increment the likes count for the template and return the updated count
      db.query('UPDATE templates SET likes_count = likes_count + 1 WHERE id = ?', [templateId], (error) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Server error' });
        }

        // Query the updated likes_count and send it in the response
        db.query('SELECT likes_count FROM templates WHERE id = ?', [templateId], (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error' });
          }
          console.log('Likes count being returned:', result[0].likes_count); 
          return res.status(200).json({ likes_count: result[0].likes_count });
        });
      });
    });
  });
});



// DELETE /templates/:id/unlike
router.delete('/templates/:id/unlike', checkAuth, (req, res) => {
  const templateId = req.params.id;
  const userId = req.user.id;

  // Check if the user has liked the template
  db.query('SELECT * FROM likes WHERE user_id = ? AND template_id = ?', [userId, templateId], (error, likeResults) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }

    if (likeResults.length === 0) {
      return res.status(400).json({ message: 'You have not liked this template' });
    }

    // Delete the like and decrement the likes count
    db.query('DELETE FROM likes WHERE user_id = ? AND template_id = ?', [userId, templateId], (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
      }

      // Decrement the likes count for the template and return the updated count
      db.query('UPDATE templates SET likes_count = likes_count - 1 WHERE id = ?', [templateId], (error) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Server error' });
        }

        // Query the updated likes_count and send it in the response
        db.query('SELECT likes_count FROM templates WHERE id = ?', [templateId], (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Server error' });
          }

          return res.status(200).json({ likes_count: result[0].likes_count });
        });
      });
    });
  });
});

// Add a comment to a template
router.post('/templates/:id/comments', checkAuth, (req, res) => {
  const templateId = req.params.id;
  const { content } = req.body; // Use 'content' based on your table structure

  // Prepare the comment data
  const comment = {
    content: content,
    user_id: req.user.id, // Assuming you're using user ID from the authenticated user
    template_id: templateId,
  };

  // Insert the comment into the database
  const query = 'INSERT INTO comments (template_id, user_id, content) VALUES (?, ?, ?)';

  db.query(query, [templateId, req.user.id, content], (err, result) => {
    if (err) {
      return res.status(400).json({ message: 'Error adding comment', error: err });
    }

    // Optionally, update the template's comment count if needed
    const updateQuery = 'UPDATE templates SET comment_count = comment_count + 1 WHERE id = ?';

    db.query(updateQuery, [templateId], (updateErr) => {
      if (updateErr) {
        return res.status(400).json({ message: 'Error updating template', error: updateErr });
      }

      // Send back the inserted comment (optionally include the created_at timestamp)
      res.status(201).json({
        comment: {
          ...comment,
          id: result.insertId, // Get the auto-generated ID
          created_at: new Date().toISOString(), // You can also get this from the DB if desired
        },
      });
    });
  });
});

// Get Comments for Template
// GET /templates/:id/comments
router.get('/templates/:id/comments', (req, res) => {
  const templateId = req.params.id;

  const query = `
    SELECT comments.id, comments.template_id, comments.user_id, comments.content, comments.created_at, users.username
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.template_id = ?;
  `;

  db.query(query, [templateId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }

    return res.status(200).json(results);
  });
});


module.exports = router;
