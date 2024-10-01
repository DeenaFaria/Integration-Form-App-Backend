const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { isAdmin } = require('../middleware/auth'); // Ensure this path is correct

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

module.exports = router;
