const express = require('express');
const bcrypt = require('bcrypt');
const models = require('../models');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = models.findUserByUsername.get(username);

  if (user && await bcrypt.compare(password, user.password_hash)) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;
    req.session.role = user.role;
    return res.redirect('/dashboard');
  }

  res.render('login', { error: 'Invalid username or password' });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;