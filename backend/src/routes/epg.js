const express = require('express');
const { fetchAndParseEPG, getEpgForChannel } = require('../services/epg');
const { getEpgCache } = require('../services/storage');

const router = express.Router();

// GET /api/epg - get cached EPG
router.get('/', (req, res) => {
  try {
    const cache = getEpgCache();
    res.json(cache);
  } catch (err) {
    res.status(500).json({ error: 'Błąd odczytu EPG' });
  }
});

// GET /api/epg/channel/:epgName
router.get('/channel/:epgName', (req, res) => {
  try {
    const result = getEpgForChannel(req.params.epgName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Błąd odczytu EPG kanału' });
  }
});

// POST /api/epg/refresh - force refresh
router.post('/refresh', async (req, res) => {
  try {
    const cache = await fetchAndParseEPG();
    res.json({ ok: true, programs: cache.programs.length });
  } catch (err) {
    res.status(500).json({ error: `Błąd aktualizacji EPG: ${err.message}` });
  }
});

module.exports = router;
