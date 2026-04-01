const express = require('express');
const cors = require('cors');
const path = require('path');

const configRoutes = require('./routes/config');
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const launcherRoutes = require('./routes/launcher');
const db = require('./db');
const { autoPublishLauncher } = require('./autoPublishLauncher');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (served via Nginx in production, Express in dev)
app.use('/uploads', express.static(path.join(process.env.UPLOAD_DIR || './uploads')));

// Routes
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/launcher', launcherRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled System Error:', err);
  
  // Custom structure for system errors
  res.status(err.status || 500).json({ 
    success: false,
    error: err.message || 'Error Interno del Servidor',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Tudex Games API running on port ${PORT}`);
  // Auto-register launcher version if a new .exe was deployed
  autoPublishLauncher();
});
