const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const channelsRoutes = require('./routes/channels');
const streamRoutes = require('./routes/stream');
const checkRoutes = require('./routes/check');
const epgRoutes = require('./routes/epg');
const discoverRoutes = require('./routes/discover');
const dataRoutes = require('./routes/data');
const aceproxyRoutes = require('./routes/aceproxy');

// Cron jobs
require('./cron/linkChecker');
require('./cron/epgUpdater');

// Load saved password if exists
const fs = require('fs');
const passwordFile = path.join(__dirname, '../data/.password');
if (fs.existsSync(passwordFile)) {
  process.env.AUTH_PASSWORD = fs.readFileSync(passwordFile, 'utf-8').trim();
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use(session({
  name: 'ace-tv-session',
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/ace', aceproxyRoutes);

// Protected routes
app.use('/api/channels', authMiddleware, channelsRoutes);
app.use('/api/stream', authMiddleware, streamRoutes);
app.use('/api/check', authMiddleware, checkRoutes);
app.use('/api/epg', authMiddleware, epgRoutes);
app.use('/api/discover', authMiddleware, discoverRoutes);
app.use('/api', authMiddleware, dataRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ace TV Pilot backend running on port ${PORT}`);
});
