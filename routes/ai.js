const express = require('express');
const router = express.Router();

// Example route: GET /api/ai
router.get('/', (req, res) => {
  res.json({ message: 'AI route is working!' });
});

module.exports = router; 