const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../../data/.users.json');
const SALT_ROUNDS = 10;

// Default users - password will be hashed on first login
const DEFAULT_USERS = ['admin', 'test', 'kasia'];

function getUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveUsers(users) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = USERS_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(users, null, 2), 'utf-8');
  fs.renameSync(tmpPath, USERS_FILE);
}

async function verifyPassword(username, password) {
  if (!DEFAULT_USERS.includes(username)) return false;

  const users = getUsers();

  if (users[username]) {
    return bcrypt.compare(password, users[username]);
  }

  // No hash yet for this user - compare against env default, then auto-hash
  const envPass = process.env.AUTH_PASSWORD || 'changeme';
  if (password === envPass) {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    users[username] = hash;
    saveUsers(users);
    return true;
  }

  return false;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const valid = await verifyPassword(username, password);
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
  const username = req.session.username;

  const valid = await verifyPassword(username, currentPassword);
  if (!valid) {
    return res.status(400).json({ error: 'Obecne haslo jest nieprawidlowe' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Nowe haslo musi miec minimum 4 znaki' });
  }

  const users = getUsers();
  users[username] = await bcrypt.hash(newPassword, SALT_ROUNDS);
  saveUsers(users);

  return res.json({ ok: true, message: 'Haslo zmienione' });
});

router.get('/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.json({ authenticated: false });
});

module.exports = router;
