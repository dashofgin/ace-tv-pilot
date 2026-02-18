const express = require('express');
const { getChannels, saveChannels } = require('../services/storage');

const router = express.Router();

// GET /api/export
router.get('/export', (req, res) => {
  try {
    const data = getChannels();
    res.setHeader('Content-Disposition', 'attachment; filename=ace-tv-channels.json');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Błąd eksportu' });
  }
});

// POST /api/import
router.post('/import', (req, res) => {
  try {
    const imported = req.body;
    if (!imported || !Array.isArray(imported.channels)) {
      return res.status(400).json({ error: 'Nieprawidłowy format danych' });
    }
    saveChannels(imported);
    res.json({ ok: true, message: `Zaimportowano ${imported.channels.length} kanałów` });
  } catch (err) {
    res.status(500).json({ error: 'Błąd importu' });
  }
});

module.exports = router;
