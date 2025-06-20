// routes/users.js
const express = require('express');
const router = express.Router();

// Example protected route
router.get('/me', (req, res) => {
  res.json({ message: 'User route is working!' });
});

module.exports = router;