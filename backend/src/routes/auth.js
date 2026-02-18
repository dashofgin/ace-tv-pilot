const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.AUTH_USERNAME || 'admin';
  const validPass = process.env.AUTH_PASSWORD || 'changeme';

  if (username === validUser && password === validPass) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ ok: true, message: 'Zalogowano pomyślnie' });
  }

  return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Błąd wylogowania' });
    }
    res.clearCookie('ace-tv-session');
    return res.json({ ok: true, message: 'Wylogowano' });
  });
});

router.post('/change-password', (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ error: 'Nie jesteś zalogowany' });
  }

  const { currentPassword, newPassword } = req.body;
  const validPass = process.env.AUTH_PASSWORD || 'changeme';

  if (currentPassword !== validPass) {
    return res.status(400).json({ error: 'Obecne hasło jest nieprawidłowe' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Nowe hasło musi mieć minimum 4 znaki' });
  }

  // Update env variable in runtime
  process.env.AUTH_PASSWORD = newPassword;

  // Also update .env file for persistence
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../../../data/.password');
  fs.writeFileSync(envPath, newPassword, 'utf-8');

  return res.json({ ok: true, message: 'Hasło zmienione' });
});

router.get('/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.json({ authenticated: false });
});

module.exports = router;
