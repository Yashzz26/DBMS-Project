const express = require('express');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USER || password !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.isAdmin = true;
  req.session.username = username;
  res.json({ ok: true, username });
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ authenticated: false });
  }

  res.json({ authenticated: true, username: req.session.username });
});

module.exports = router;
