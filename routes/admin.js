const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAdmin } = require('../middleware/auth'); // Ensure this path is correct

// Get all admins
// Fetch all users (Admin only)
router.get('/users', isAdmin, (req, res) => {
  const query = 'SELECT id, username, email, is_blocked, is_admin FROM users'; // Adjust columns as necessary

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Error fetching users');
    }
    res.json(results);
  });
});
// Block a user (Admin only)
router.post('/block/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const query = 'UPDATE users SET is_blocked = TRUE WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).send('Error blocking user');
    }
    res.send('User blocked successfully');
  });
});

// Unblock a user (Admin only)
router.post('/unblock/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const query = 'UPDATE users SET is_blocked = FALSE WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).send('Error unblocking user');
    }
    res.send('User unblocked successfully');
  });
});

// Delete a user (Admin only)
router.delete('/delete/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const query = 'DELETE FROM users WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).send('Error deleting user');
    }
    res.send('User deleted successfully');
  });
});

// Add a user to admins
router.post('/promote/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const query = 'UPDATE users SET is_admin = TRUE WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error promoting user' });
    }
    res.status(200).json({ message: 'User promoted to admin' });
  });
});


// Remove a user from admins
router.post('/demote/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const query = 'UPDATE users SET is_admin = FALSE WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error demoting user' });
    }
    
    // If the user is demoting themselves
    if (userId == req.user.id) {
      return res.status(200).json({ message: 'You removed your own admin access' });
    }

    res.status(200).json({ message: 'User removed from admin role' });
  });
});



module.exports = router;
