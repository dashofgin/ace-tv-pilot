const express = require('express');
const { checkChannel, checkAll, getCheckStatus } = require('../services/checker');

const router = express.Router();

// POST /api/check/:id - check single channel
router.post('/:id', async (req, res) => {
  try {
    const channel = await checkChannel(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Kanał nie znaleziony' });
    }
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Błąd sprawdzania kanału' });
  }
});

// POST /api/check/all - check all channels (runs in background)
router.post('/', async (req, res) => {
  const status = getCheckStatus();
  if (status.running) {
    return res.json({ message: 'Sprawdzanie już trwa', ...status });
  }
  checkAll().catch(err => console.error('Check all error:', err));
  res.json({ message: 'Rozpoczęto sprawdzanie wszystkich kanałów' });
});

// GET /api/check/status
router.get('/status', (req, res) => {
  res.json(getCheckStatus());
});

module.exports = router;
