const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromise = require('fs').promise
const express = require('express');
const session = require('express-session');

const methodOverride = require('method-override');

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
// const adminRoutes = require('./routes/admin'); // expand later

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cbt-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make user available in all templates
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    username: req.session.username,
    fullName: req.session.fullName,
    role: req.session.role
  } : null;
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', examRoutes);
// app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`CBT System running on http://localhost:${PORT}`);
});