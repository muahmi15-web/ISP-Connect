// ISP Connect — backend server.
// Serves:  customer PWA at /        (public/pwa)
//          admin panel at /admin   (public/admin)
//          JSON API at /api/...
const path = require('path');
const express = require('express');

require('./db');   // creates tables + seeds admin
require('./fcm');  // tries to init Firebase push (optional)

const app = express();
app.use(express.json({ limit: '1mb' }));

// --- API routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, push: require('./fcm').isEnabled(), time: new Date().toISOString() });
});

// --- Static front-ends (no build step) ---
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/', express.static(path.join(__dirname, 'public', 'pwa')));

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] ISP Connect running at http://localhost:${PORT}`);
  console.log(`[server]   customer app : http://localhost:${PORT}/`);
  console.log(`[server]   admin panel  : http://localhost:${PORT}/admin`);
});
