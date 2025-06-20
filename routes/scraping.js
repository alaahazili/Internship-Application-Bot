const express = require('express');
const router = express.Router();

// Example route: GET /api/scraping
router.get('/', (req, res) => {
  res.json({ message: 'Scraping route is working!' });
});

// POST /api/scraping/trigger - trigger real scraping
router.post('/trigger', async (req, res) => {
  try {
    const jobScrapingService = global.jobScrapingService;
    if (!jobScrapingService) {
      return res.status(500).json({ error: 'JobScrapingService not available' });
    }
    await jobScrapingService.manualScrape();
    res.json({ message: 'Scraping started. Check logs for progress.' });
  } catch (err) {
    console.error('Error triggering scraping:', err);
    res.status(500).json({ error: 'Failed to start scraping' });
  }
});

module.exports = router; 