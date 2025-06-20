const express = require('express');
const router = express.Router();

// Example route: GET /api/applications
router.get('/', (req, res) => {
  res.json({ message: 'Applications route is working!' });
});

module.exports = router; 