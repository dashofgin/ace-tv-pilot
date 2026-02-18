const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getChannels, saveChannels } = require('../services/storage');

const router = express.Router();

function extractHash(input) {
  if (!input) return null;
  const cleaned = input.trim();
  // acestream://hash or just hash
  const match = cleaned.match(/(?:acestream:\/\/)?([a-f0-9]{40})/i);
  return match ? match[1] : null;
}

// GET /api/channels
router.get('/', (req, res) => {
  try {
    const data = getChannels();
    res.json(data.channels);
  } catch (err) {
    res.status(500).json({ error: 'Błąd odczytu kanałów' });
  }
});

// POST /api/channels
router.post('/', (req, res) => {
  try {
    const { name, category, logo, epgName, links } = req.body;

    if (!name || !links || !links.length) {
      return res.status(400).json({ error: 'Nazwa i przynajmniej jeden link są wymagane' });
    }

    const processedLinks = links.map((link, i) => {
      const hash = extractHash(link.hash || link);
      if (!hash) return null;
      return {
        hash,
        label: link.label || `link ${i + 1}`,
        isPrimary: i === 0,
        status: 'unknown',
        peers: 0,
        lastCheck: null,
      };
    }).filter(Boolean);

    if (!processedLinks.length) {
      return res.status(400).json({ error: 'Żaden link nie zawiera poprawnego hasha' });
    }

    const channel = {
      id: uuidv4(),
      name,
      category: category || 'other',
      logo: logo || '',
      epgName: epgName || '',
      isFavorite: false,
      sortOrder: 0,
      links: processedLinks,
      lastWatched: null,
      addedAt: new Date().toISOString(),
    };

    const data = getChannels();
    data.channels.push(channel);
    saveChannels(data);

    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Błąd dodawania kanału' });
  }
});

// PUT /api/channels/:id
router.put('/:id', (req, res) => {
  try {
    const data = getChannels();
    const index = data.channels.findIndex(ch => ch.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Kanał nie znaleziony' });
    }

    const { name, category, logo, epgName, isFavorite, sortOrder, links } = req.body;
    const channel = data.channels[index];

    if (name !== undefined) channel.name = name;
    if (category !== undefined) channel.category = category;
    if (logo !== undefined) channel.logo = logo;
    if (epgName !== undefined) channel.epgName = epgName;
    if (isFavorite !== undefined) channel.isFavorite = isFavorite;
    if (sortOrder !== undefined) channel.sortOrder = sortOrder;

    if (links) {
      channel.links = links.map((link, i) => {
        const hash = extractHash(link.hash || link);
        if (!hash) return null;
        return {
          hash,
          label: link.label || `link ${i + 1}`,
          isPrimary: link.isPrimary !== undefined ? link.isPrimary : i === 0,
          status: link.status || 'unknown',
          peers: link.peers || 0,
          lastCheck: link.lastCheck || null,
        };
      }).filter(Boolean);
    }

    data.channels[index] = channel;
    saveChannels(data);

    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji kanału' });
  }
});

// DELETE /api/channels/:id
router.delete('/:id', (req, res) => {
  try {
    const data = getChannels();
    const index = data.channels.findIndex(ch => ch.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Kanał nie znaleziony' });
    }

    data.channels.splice(index, 1);
    saveChannels(data);

    res.json({ ok: true, message: 'Kanał usunięty' });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania kanału' });
  }
});

module.exports = router;
