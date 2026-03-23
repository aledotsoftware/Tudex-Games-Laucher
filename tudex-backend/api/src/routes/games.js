const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const gameName = req.params.name || req.body.name || 'temp';
    const dir = path.join(UPLOAD_DIR, 'games', gameName);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'icons');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const gameName = req.params.name || 'icon';
    const ext = path.extname(file.originalname);
    cb(null, `${gameName}${ext}`);
  },
});

const bgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, 'backgrounds');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const gameName = req.params.name || 'bg';
    const ext = path.extname(file.originalname);
    cb(null, `${gameName}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 * 1024 } }); // 5GB
const uploadIcon = multer({ storage: iconStorage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
const uploadBg = multer({ storage: bgStorage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

const BASE_URL = process.env.BASE_URL || 'https://launcher.tudexgames.com';

// =====================================================
// GET /api/games - List all games (authenticated)
// =====================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.*, d.name as developer_name,
        (SELECT COUNT(*) FROM patches WHERE game_id = g.id) as patch_count
      FROM games g
      LEFT JOIN developers d ON g.developer_id = d.id
      ORDER BY g.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing games:', error);
    res.status(500).json({ error: 'Error al listar juegos' });
  }
});

// =====================================================
// GET /api/games/:name - Get single game details
// =====================================================
router.get('/:name', authenticate, async (req, res) => {
  try {
    const gameResult = await db.query('SELECT * FROM games WHERE name = $1', [req.params.name]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const game = gameResult.rows[0];

    const patches = await db.query(
      'SELECT * FROM patches WHERE game_id = $1 ORDER BY patch_order ASC',
      [game.id]
    );

    const voicePacks = await db.query(
      'SELECT * FROM voice_packs WHERE game_id = $1 ORDER BY id ASC',
      [game.id]
    );

    res.json({
      ...game,
      patches: patches.rows,
      voicePacks: voicePacks.rows,
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Error al obtener juego' });
  }
});

// =====================================================
// POST /api/games - Create a new game
// =====================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, display_name, start_cmd, description } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Nombre y nombre de visualización son requeridos' });
    }

    // Validate name format (lowercase, no spaces, alphanumeric + hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'El nombre solo puede contener letras minúsculas, números y guiones' });
    }

    const result = await db.query(
      `INSERT INTO games (developer_id, name, display_name, start_cmd, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name, display_name, start_cmd || 'start game.exe', description || '']
    );

    // Log activity
    await db.query(
      'INSERT INTO activity_log (developer_id, game_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, result.rows[0].id, 'game_created', { name, display_name }]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un juego con ese nombre' });
    }
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Error al crear juego' });
  }
});

// =====================================================
// PUT /api/games/:name - Update game info
// =====================================================
router.put('/:name', authenticate, async (req, res) => {
  try {
    const { display_name, start_cmd, description, is_active } = req.body;

    const result = await db.query(
      `UPDATE games 
       SET display_name = COALESCE($1, display_name),
           start_cmd = COALESCE($2, start_cmd),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE name = $5
       RETURNING *`,
      [display_name, start_cmd, description, is_active, req.params.name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Error al actualizar juego' });
  }
});

// =====================================================
// PATCH /api/games/:name/maintenance - Toggle maintenance
// =====================================================
router.patch('/:name/maintenance', authenticate, async (req, res) => {
  try {
    const { maintenance } = req.body;

    const result = await db.query(
      'UPDATE games SET maintenance = $1, updated_at = NOW() WHERE name = $2 RETURNING *',
      [maintenance, req.params.name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    // Log activity
    await db.query(
      'INSERT INTO activity_log (developer_id, game_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, result.rows[0].id, 'maintenance_toggled', { maintenance }]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling maintenance:', error);
    res.status(500).json({ error: 'Error al cambiar mantenimiento' });
  }
});

// =====================================================
// POST /api/games/:name/client - Upload game client (.7z)
// Auto-increments clientVer and resets patchUrls
// =====================================================
router.post('/:name/client', authenticate, upload.single('client'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo .7z requerido' });
    }

    const gameName = req.params.name;
    const clientUrl = `${BASE_URL}/uploads/games/${gameName}/${req.file.originalname}`;

    // Get current game
    const gameResult = await db.query('SELECT id, client_ver FROM games WHERE name = $1', [gameName]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const game = gameResult.rows[0];
    const newClientVer = game.client_ver + 1;

    // Update game with new client version and URL
    const result = await db.query(
      `UPDATE games 
       SET client_ver = $1, client_url = $2, client_filename = $3, updated_at = NOW()
       WHERE name = $4
       RETURNING *`,
      [newClientVer, clientUrl, req.file.originalname, gameName]
    );

    // Reset patches (new client = fresh start)
    await db.query('DELETE FROM patches WHERE game_id = $1', [game.id]);

    // Log activity
    await db.query(
      'INSERT INTO activity_log (developer_id, game_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, game.id, 'client_uploaded', { clientVer: newClientVer, filename: req.file.originalname }]
    );

    res.json({
      ...result.rows[0],
      message: `Cliente v${newClientVer} subido. Parches reseteados.`,
    });
  } catch (error) {
    console.error('Error uploading client:', error);
    res.status(500).json({ error: 'Error al subir cliente' });
  }
});

// =====================================================
// POST /api/games/:name/patch - Upload a patch (.7z)
// Appends to patchUrls in order
// =====================================================
router.post('/:name/patch', authenticate, upload.single('patch'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo .7z requerido' });
    }

    const gameName = req.params.name;
    const patchUrl = `${BASE_URL}/uploads/games/${gameName}/${req.file.originalname}`;

    // Get game
    const gameResult = await db.query('SELECT id FROM games WHERE name = $1', [gameName]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const gameId = gameResult.rows[0].id;

    // Get current max patch order
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(patch_order), 0) as max_order FROM patches WHERE game_id = $1',
      [gameId]
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    // Insert patch
    const result = await db.query(
      'INSERT INTO patches (game_id, patch_url, patch_filename, patch_order, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [gameId, patchUrl, req.file.originalname, nextOrder, req.body.description || '']
    );

    // Log activity
    await db.query(
      'INSERT INTO activity_log (developer_id, game_id, action, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, gameId, 'patch_uploaded', { patchOrder: nextOrder, filename: req.file.originalname }]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Parche #${nextOrder} subido correctamente.`,
    });
  } catch (error) {
    console.error('Error uploading patch:', error);
    res.status(500).json({ error: 'Error al subir parche' });
  }
});

// =====================================================
// POST /api/games/:name/icon - Upload game icon
// =====================================================
router.post('/:name/icon', authenticate, uploadIcon.single('icon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }

    const gameName = req.params.name;
    const iconUrl = `${BASE_URL}/uploads/icons/${req.file.filename}`;

    const result = await db.query(
      'UPDATE games SET icon_url = $1, updated_at = NOW() WHERE name = $2 RETURNING *',
      [iconUrl, gameName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading icon:', error);
    res.status(500).json({ error: 'Error al subir ícono' });
  }
});

// =====================================================
// POST /api/games/:name/background - Upload game background
// =====================================================
router.post('/:name/background', authenticate, uploadBg.single('background'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo de imagen requerido' });
    }

    const gameName = req.params.name;
    const backgroundUrl = `${BASE_URL}/uploads/backgrounds/${req.file.filename}`;

    const result = await db.query(
      'UPDATE games SET background_url = $1, updated_at = NOW() WHERE name = $2 RETURNING *',
      [backgroundUrl, gameName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading background:', error);
    res.status(500).json({ error: 'Error al subir fondo' });
  }
});

// =====================================================
// POST /api/games/:name/voicepacks - Set voice packs
// =====================================================
router.post('/:name/voicepacks', authenticate, async (req, res) => {
  try {
    const { voicePacks } = req.body;

    if (!Array.isArray(voicePacks)) {
      return res.status(400).json({ error: 'voicePacks debe ser un array' });
    }

    const gameResult = await db.query('SELECT id FROM games WHERE name = $1', [req.params.name]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const gameId = gameResult.rows[0].id;

    // Replace all voice packs
    await db.query('DELETE FROM voice_packs WHERE game_id = $1', [gameId]);

    for (const vp of voicePacks) {
      if (vp.value && vp.label) {
        await db.query(
          'INSERT INTO voice_packs (game_id, value, label) VALUES ($1, $2, $3)',
          [gameId, vp.value, vp.label]
        );
      }
    }

    const result = await db.query(
      'SELECT * FROM voice_packs WHERE game_id = $1 ORDER BY id ASC',
      [gameId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error setting voice packs:', error);
    res.status(500).json({ error: 'Error al actualizar voice packs' });
  }
});

// =====================================================
// DELETE /api/games/:name - Delete a game
// =====================================================
router.delete('/:name', authenticate, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM games WHERE name = $1 RETURNING *', [req.params.name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    res.json({ message: `Juego "${req.params.name}" eliminado`, game: result.rows[0] });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Error al eliminar juego' });
  }
});

// =====================================================
// GET /api/games/:name/activity - Get activity log
// =====================================================
router.get('/:name/activity', authenticate, async (req, res) => {
  try {
    const gameResult = await db.query('SELECT id FROM games WHERE name = $1', [req.params.name]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }

    const result = await db.query(
      `SELECT al.*, d.name as developer_name
       FROM activity_log al
       LEFT JOIN developers d ON al.developer_id = d.id
       WHERE al.game_id = $1
       ORDER BY al.created_at DESC
       LIMIT 50`,
      [gameResult.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
});

module.exports = router;
