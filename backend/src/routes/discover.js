const express = require('express');
const { getSportsChannels } = require('../services/httpaceproxy');

const router = express.Router();

// GET /api/discover/sports
router.get('/sports', async (req, res) => {
  try {
    const channels = await getSportsChannels();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania kanałów sportowych' });
  }
});

module.exports = router;
