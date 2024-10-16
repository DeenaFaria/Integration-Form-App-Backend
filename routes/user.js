const express = require('express');
const router = express.Router();
const db = require('../config/db');
const cloudinary = require('../config/cloud');
const { checkAuth, checkAccess, optionalAuth } = require('../middleware/auth'); // Only checkAuth middleware is needed
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

// Fetch all users
router.get('/users', checkAuth, (req, res) => {
  const query = 'SELECT id, username, email FROM users'; // Adjust columns as necessary

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching users');
    }
    res.json(results);
  });
});

// Create a new template (Authenticated users only)
// Create a new template route
router.post('/templates', checkAuth, upload.single('image'), async (req, res) => {
  const { title, description, questions, tags, topic } = req.body;  // Added topic
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

  // Save template data to the database with topic included
  const query = `
    INSERT INTO templates (title, description, user_id, tags, image_url, topic) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [title, description, userId, JSON.stringify(tags), imageUrl, topic], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error creating template' });
    }

    const templateId = result.insertId;

    // Insert questions into the questions table
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





router.get('/templates', (req, res) => {
  const userId = req.user ? req.user.id : null; // Get user ID from auth middleware if available

  // Fetch all templates
  const query = 'SELECT * FROM templates';
  db.query(query, (err, templates) => {
    if (err) {
      return res.status(500).send('Error fetching templates');
    }

    // Initialize an array to hold templates with access information
    const templatesWithAccess = [];

    // Process each template to check access settings
    let templatesProcessed = 0;

    templates.forEach(template => {
      const templateId = template.id;

      // Fetch access settings for the current template
      const accessQuery = `
        SELECT user_id, can_access FROM access_settings 
        WHERE template_id = ?`;
        
      db.query(accessQuery, [templateId], (err, accessResults) => {
        if (err) {
          return res.status(500).send('Error checking access');
        }

        // Case 1: No access settings exist for this template
        if (accessResults.length === 0) {
          // Allow access by default if no settings exist
          template.canAccess = true;
        } else {
          // Case 2: Access settings exist, check if the user has access
          const userAccess = accessResults.find(result => result.user_id === userId && result.can_access);

          if (userAccess) {
            // User is allowed access
            template.canAccess = true;
          } else {
            // User is denied access
            template.canAccess = false;
          }
        }

        // Add the modified template to the array
        templatesWithAccess.push(template);

        // Track the number of processed templates
        templatesProcessed++;

        // If all templates have been processed, send the response
        if (templatesProcessed === templates.length) {
          res.json(templatesWithAccess);
        }
      });
    });

    // Handle the case where no templates are found
    if (templates.length === 0) {
      res.json(templatesWithAccess); // This will be an empty array
    }
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

    const template = templateResults[0];

    // Query to fetch the questions associated with this template
    const questionsQuery = 'SELECT * FROM questions WHERE template_id = ?';
    
    db.query(questionsQuery, [id], (err, questionResults) => {
      if (err) {
        return res.status(500).send('Error fetching questions');
      }

      template.questions = questionResults;
      
      // Send back the template with its questions
      res.json(template);
    });
  });
});


// Routes
// Update an existing template
router.put('/templates/:id', checkAuth, checkAccess, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { title, description, questions, tags, topic } = req.body;  // Added topic
  const imageFile = req.file;

  console.log('Received request to update template:', { id, title, description, questions, tags, topic });
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

  // Update the template details including topic, title, description, tags, and possibly image URL
  const updateTemplateQuery = `
    UPDATE templates 
    SET title = ?, description = ?, tags = ?, topic = ?, image_url = IFNULL(?, image_url) 
    WHERE id = ? ${req.user.isAdmin ? '' : 'AND user_id = ?'}
  `;

  db.query(updateTemplateQuery, [title, description, tags, topic, imageUrl, id, req.user.id], (err, result) => {
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

// GET /search?query=your_search_term
router.get('/search', (req, res) => {
  const searchTerm = req.query.query;

  const sqlQuery = `
    SELECT DISTINCT t.id, t.title, t.description
    FROM templates t
    LEFT JOIN questions q ON t.id = q.template_id
    LEFT JOIN comments c ON t.id = c.template_id
    WHERE 
      MATCH(t.title, t.description) AGAINST (? IN BOOLEAN MODE)
      OR MATCH(q.value) AGAINST (? IN BOOLEAN MODE)
      OR MATCH(c.content) AGAINST (? IN BOOLEAN MODE);
  `;

  db.query(sqlQuery, [searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.status(200).json({ templates: results });
  });
});

router.get('/analytics/templates/:id/', checkAuth, (req, res) => {
  const templateId = req.params.id;

  // Step 1: Retrieve raw data
  const sqlQuery = `
    SELECT
      q.value AS question_text,
      q.type AS question_type,
      r.response_data,
      q.id
    FROM questions q
    LEFT JOIN form_responses r ON q.template_id = r.form_id
    WHERE q.template_id = ?;
  `;

  db.query(sqlQuery, [templateId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No data found for this template.' });
    }

    console.log('Raw results from DB:', results);  // Debugging log

   // Step 2: Process the data
const processedResults = results.reduce((acc, row) => {
  const { question_text, question_type, response_data } = row;

  console.log('Current row:', row);  // Debugging log
  console.log('response_data:', response_data);  // Debugging log

  let responseValue = {};
  if (response_data) {
    // Check if response_data is already an object
    if (typeof response_data === 'object') {
      responseValue = response_data;  // Use it directly
    } else if (typeof response_data === 'string') {
      try {
        responseValue = JSON.parse(response_data);  // Parse if it's a string
      } catch (error) {
        console.error('Error parsing response_data:', response_data);
        return acc;  // Skip this entry if parsing fails
      }
    }
  }

  // Check if there are any entries in responseValue to process
  if (Object.keys(responseValue).length === 0) {
    return acc;  // Skip if there's no response data
  }

  // Now we need to process each entry in responseValue
  Object.entries(responseValue).forEach(([responseKey, responseEntry]) => {
    // Only process if the responseKey matches a known question ID
    if (responseKey) {
      // Check if the question is a string or radio option
      if (question_type === 'string' || question_type === 'radio') {
        if (responseEntry) {
          if (!acc[question_text]) {
            acc[question_text] = { numericValues: [], stringValues: [] };
          }
          acc[question_text].stringValues.push(responseEntry);  // Store the selected option
        }

        // Additionally, check if the responseEntry is a numeric value
        const numericValue = parseFloat(responseEntry);
        if (!isNaN(numericValue)) {
          acc[question_text].numericValues.push(numericValue); // Aggregate numeric values
        }
      }

      // Check if the question is numeric explicitly (in case there are numeric questions as well)
      if (question_type === 'numeric') {
        const numericValue = parseFloat(responseEntry);
        if (!isNaN(numericValue)) {
          if (!acc[question_text]) {
            acc[question_text] = { numericValues: [], stringValues: [] };
          }
          acc[question_text].numericValues.push(numericValue);
        }
      }
    }
  });

  return acc;
}, {});


   // Step 3: Calculate averages and most common string values
const finalResults = Object.entries(processedResults).map(([question, data]) => {
  let avgNumericValue;
  let mostCommonStringValue;

  // Handle numeric values
  if (data.numericValues.length > 0) {
    avgNumericValue = (data.numericValues.reduce((sum, value) => sum + value, 0) / data.numericValues.length);
  } else {
    avgNumericValue = 'N/A'; // If no numeric values, set to N/A
  }

  // Handle string values
  if (data.stringValues.length > 0) {
    const countMap = data.stringValues.reduce((countMap, value) => {
      countMap[value] = (countMap[value] || 0) + 1;
      return countMap;
    }, {});
    
    mostCommonStringValue = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])[0][0];
  } else {
    mostCommonStringValue = 'N/A'; // If no string values, set to N/A
  }

  return {
    question_text: question,
    avg_numeric_value: avgNumericValue,
    most_common_string_value: mostCommonStringValue,
  };
});

    console.log('Processed results:', finalResults); // Log the final processed results

    return res.status(200).json(finalResults);
  });
});

// Get access settings for a specific template
router.get('/access-settings/:templateId', (req, res) => {
  const templateId = req.params.templateId;
  
  // Use a callback function for the query
  db.query('SELECT user_id, can_access FROM access_settings WHERE template_id = ?', [templateId], (error, settings) => {
    if (error) {
      console.error('Error fetching access settings:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(settings);
  });
});


// Update access settings
router.post('/access-settings', checkAuth, (req, res) => {
  const { templateId, userId, canAccess } = req.body;

  // Validate inputs
  if (!templateId || !userId || typeof canAccess !== 'boolean') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Start a transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (canAccess) {
      // Allow user access
      db.query(
        'INSERT INTO access_settings (template_id, user_id, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = ?',
        [templateId, userId, true, true],
        (error) => {
          if (error) {
            return db.rollback(() => {
              console.error('Error allowing access:', error);
              return res.status(500).json({ error: 'Internal Server Error' });
            });
          }

          // Remove them from the denied list if previously denied
          db.query(
            'DELETE FROM access_settings WHERE template_id = ? AND user_id = ? AND can_access = ?',
            [templateId, userId, false],
            (error) => {
              if (error) {
                return db.rollback(() => {
                  console.error('Error deleting denied access:', error);
                  return res.status(500).json({ error: 'Internal Server Error' });
                });
              }

              // Commit the transaction
              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Transaction commit error:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                  });
                }
                res.json({ message: 'Access settings updated successfully' });
              });
            }
          );
        }
      );
    } else {
      // Deny user access
      db.query(
        'INSERT INTO access_settings (template_id, user_id, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = ?',
        [templateId, userId, false, false],
        (error) => {
          if (error) {
            return db.rollback(() => {
              console.error('Error denying access:', error);
              return res.status(500).json({ error: 'Internal Server Error' });
            });
          }

          // Remove them from the allowed list if previously allowed
          db.query(
            'DELETE FROM access_settings WHERE template_id = ? AND user_id = ? AND can_access = ?',
            [templateId, userId, true],
            (error) => {
              if (error) {
                return db.rollback(() => {
                  console.error('Error deleting allowed access:', error);
                  return res.status(500).json({ error: 'Internal Server Error' });
                });
              }

              // Commit the transaction
              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Transaction commit error:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                  });
                }
                res.json({ message: 'Access settings updated successfully' });
              });
            }
          );
        }
      );
    }
  });
});

// Backend route to delete a template
router.delete('/templates/:id', checkAuth, checkAccess, (req, res) => {
  const { id } = req.params;

  const deleteTemplateQuery = 'DELETE FROM templates WHERE id = ?';

  db.query(deleteTemplateQuery, [id], (err, result) => {
    if (err) {
      return res.status(500).send('Error deleting template');
    }
    return res.status(200).send('Template deleted successfully');
  });
});


// Route to get all unique tags from templates
router.get('/tags', (req, res) => {
  const query = `
    SELECT tags FROM templates;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }

    // Collect all tags from the templates
    let allTags = [];
    results.forEach(row => {
      const tags = JSON.parse(row.tags); // Assuming the tags are stored as JSON array
      allTags = [...allTags, ...tags];
    });

    // Remove duplicates
    const uniqueTags = [...new Set(allTags)];

    res.json(uniqueTags);
  });
});

// Route to get templates ordered by likes_count
router.get('/most-liked', (req, res) => {
  const query = `
    SELECT id, title, description, topic, tags, image_url, likes_count 
    FROM templates
    ORDER BY likes_count DESC
    LIMIT 5;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching most liked templates:', err);
      return res.status(500).json({ error: 'Failed to fetch most liked templates' });
    }
    res.json(results);
  });
});

router.get('/latest', (req, res) => {
  const query = `
    SELECT t.id, t.title, t.description, t.image_url, u.username as author 
    FROM templates t
    LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
    LIMIT 6;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching latest templates:', err);
      return res.status(500).json({ error: 'Failed to fetch latest templates' });
    }
    res.json(results);
  });
});

module.exports = router;
