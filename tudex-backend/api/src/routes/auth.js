const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await db.query(
      'SELECT id, email, password_hash, name, is_admin FROM developers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const developer = result.rows[0];
    const validPassword = await bcrypt.compare(password, developer.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        is_admin: developer.is_admin,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: developer.id,
        email: developer.email,
        name: developer.name,
        is_admin: developer.is_admin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /api/auth/register (admin only for now)
router.post('/register', authenticate, async (req, res) => {
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Solo administradores pueden registrar usuarios' });
    }

    const { email, password, name, is_admin } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO developers (email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, email, name, is_admin',
      [email, passwordHash, name, is_admin || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, is_admin, created_at FROM developers WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /api/auth/setup - Initial admin setup (only works if no admins exist)
router.post('/setup', async (req, res) => {
  try {
    // Check if any admin exists
    const adminCheck = await db.query('SELECT id FROM developers WHERE is_admin = true LIMIT 1');
    if (adminCheck.rows.length > 0) {
      return res.status(403).json({ error: 'El setup inicial ya fue completado' });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Delete placeholder admin and insert real one
    await db.query('DELETE FROM developers WHERE email = $1', ['admin@tudexgames.com']);
    
    const result = await db.query(
      'INSERT INTO developers (email, password_hash, name, is_admin) VALUES ($1, $2, $3, true) RETURNING id, email, name, is_admin',
      [email, passwordHash, name]
    );

    const developer = result.rows[0];
    const token = jwt.sign(
      { id: developer.id, email: developer.email, name: developer.name, is_admin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: developer });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
