// ============================================================
// Antigravity Model — Express Server Entry Point
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const programRoutes = require('./routes/programs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://aharada-education-student-grievance.vercel.app'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/programs', programRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    name: 'Aharada Education API',
    timestamp: new Date().toISOString() 
  });
});

// ─── Error Handling ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🚀 AHARADA EDUCATION — API Server               ║
  ║   Student Grievance Management Portal             ║
  ║                                                   ║
  ║   Running on: http://localhost:${PORT}              ║
  ║   Health:     http://localhost:${PORT}/api/health   ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);

  // Prevent Render Free Tier from spinning down (pings every 14 minutes)
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    const https = require('https');
    setInterval(() => {
      https.get(`${renderUrl}/api/health`, (resp) => {
        if (resp.statusCode === 200) console.log('🔄 Self-ping successful to keep server awake.');
        else console.log('⚠️ Self-ping failed with status code:', resp.statusCode);
      }).on('error', (err) => {
        console.error('❌ Self-ping error:', err.message);
      });
    }, 14 * 60 * 1000); // 14 minutes
  }
});

module.exports = app;
