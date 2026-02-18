const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const HASH_FILE = path.join(__dirname, '../../data/.password_hash');
const SALT_ROUNDS = 10;

function getPasswordHash() {
  try {
    if (fs.existsSync(HASH_FILE)) {
      return fs.readFileSync(HASH_FILE, 'utf-8').trim();
    }
  } catch {}
  return null;
}

function savePasswordHash(hash) {
  const dir = path.dirname(HASH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = HASH_FILE + '.tmp';
  fs.writeFileSync(tmpPath, hash, 'utf-8');
  fs.renameSync(tmpPath, HASH_FILE);
}

async function verifyPassword(password) {
  const hash = getPasswordHash();

  if (hash) {
    return bcrypt.compare(password, hash);
  }

  // No hash yet - compare against env plaintext, then auto-hash on first login
  const envPass = process.env.AUTH_PASSWORD || 'changeme';
  if (password === envPass) {
    const newHash = await bcrypt.hash(password, SALT_ROUNDS);
    savePasswordHash(newHash);
    return true;
  }

  return false;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.AUTH_USERNAME || 'admin';

  if (username !== validUser) {
    return res.status(401).json({ error: 'Nieprawidlowy login lub haslo' });
  }

  const valid = await verifyPassword(password);
  if (valid) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ ok: true, message: 'Zalogowano pomyslnie' });
  }

  return res.status(401).json({ error: 'Nieprawidlowy login lub haslo' });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Blad wylogowania' });
    }
    res.clearCookie('ace-tv-session');
    return res.json({ ok: true, message: 'Wylogowano' });
  });
});

router.post('/change-password', async (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ error: 'Nie jestes zalogowany' });
  }

  const { currentPassword, newPassword } = req.body;

  const valid = await verifyPassword(currentPassword);
  if (!valid) {
    return res.status(400).json({ error: 'Obecne haslo jest nieprawidlowe' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Nowe haslo musi miec minimum 4 znaki' });
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  savePasswordHash(newHash);

  // Remove old plaintext file if exists
  const oldFile = path.join(__dirname, '../../data/.password');
  try { fs.unlinkSync(oldFile); } catch {}

  return res.json({ ok: true, message: 'Haslo zmienione' });
});

router.get('/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.json({ authenticated: false });
});

module.exports = router;
