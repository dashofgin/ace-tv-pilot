function authMiddleware(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: 'Nie jesteś zalogowany' });
}

module.exports = authMiddleware;
