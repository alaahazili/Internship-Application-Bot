const express = require('express');
const router = express.Router();

// Example route: GET /api/emails
router.get('/', (req, res) => {
  res.json({ message: 'Emails route is working!' });
});

module.exports = router; 