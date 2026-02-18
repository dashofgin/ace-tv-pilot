const express = require('express');
const acestream = require('../services/acestream');

const ACESTREAM_URL = process.env.ACESTREAM_URL || 'http://acestream:6878';

const router = express.Router();

// POST /api/stream/start/:hash - initialize acestream HLS session
router.post('/start/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const result = await acestream.startStream(hash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Nie udało się uruchomić streamu: ${err.message}` });
  }
});

// GET /api/stream/manifest/:hash - proxy session HLS manifest with URL rewriting
router.get('/manifest/:hash', async (req, res) => {
  const { hash } = req.params;
  const session = acestream.getSession(hash);

  if (!session?.sessionPlaybackUrl) {
    return res.status(404).send('No active session - start stream first');
  }

  try {
    const upstream = await fetch(session.sessionPlaybackUrl, {
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Manifest unavailable');
    }

    let body = await upstream.text();

    // Rewrite internal docker URLs to relative paths accessible via nginx /ace/
    body = body.replace(/http:\/\/acestream:6878/g, '');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(body);
  } catch (err) {
    console.error('[manifest proxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Manifest fetch failed');
    }
  }
});

// GET /api/stream/stats/:hash
router.get('/stats/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const stats = await acestream.getStats(hash);
    if (!stats) {
      return res.status(404).json({ error: 'Brak aktywnej sesji' });
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania statystyk' });
  }
});

// POST /api/stream/stop/:hash
router.post('/stop/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    await acestream.stopStream(hash);
    res.json({ ok: true, message: 'Stream zatrzymany' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd zatrzymywania streamu' });
  }
});

module.exports = router;
