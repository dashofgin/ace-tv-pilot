function authMiddleware(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: 'Nie jesteś zalogowany' });
}

function adminMiddleware(req, res, next) {
  if (req.session && req.session.authenticated && req.session.username === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Brak uprawnien' });
}

module.exports = { authMiddleware, adminMiddleware };
