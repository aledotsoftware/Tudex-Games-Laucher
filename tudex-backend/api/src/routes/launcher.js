const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BASE_URL = process.env.BASE_URL || 'https://launcher.tudexgames.com';

const launcherStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'launcher');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const uploadLauncher = multer({ storage: launcherStorage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

// GET /api/launcher/version - Get current launcher version
router.get('/version', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT version, download_url, changelog, created_at FROM launcher_versions WHERE is_current = true LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.json({ version: 1, download_url: '' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting launcher version:', error);
    res.status(500).json({ error: 'Error al obtener versión' });
  }
});

// GET /api/launcher/versions - Get all launcher versions
router.get('/versions', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM launcher_versions ORDER BY version DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing versions:', error);
    res.status(500).json({ error: 'Error al listar versiones' });
  }
});

// POST /api/launcher/upload - Upload new launcher version (admin only)
router.post('/upload', authenticate, requireAdmin, uploadLauncher.single('launcher'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo .exe requerido' });
    }

    const downloadUrl = `${BASE_URL}/uploads/launcher/${req.file.originalname}`;

    // Get current max version
    const maxVerResult = await db.query(
      'SELECT COALESCE(MAX(version), 0) as max_ver FROM launcher_versions'
    );
    const newVersion = maxVerResult.rows[0].max_ver + 1;

    // Set all versions to not current
    await db.query('UPDATE launcher_versions SET is_current = false');

    // Insert new version
    const result = await db.query(
      'INSERT INTO launcher_versions (version, download_url, is_current, changelog) VALUES ($1, $2, true, $3) RETURNING *',
      [newVersion, downloadUrl, req.body.changelog || '']
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Launcher v${newVersion} publicado.`,
    });
  } catch (error) {
    console.error('Error uploading launcher:', error);
    res.status(500).json({ error: 'Error al subir launcher' });
  }
});

module.exports = router;
