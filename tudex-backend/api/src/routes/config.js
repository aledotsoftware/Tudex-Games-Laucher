const express = require('express');
const router = express.Router();
const db = require('../db');

// =====================================================
// GET /api/config
// Este es el ENDPOINT CRÍTICO que el launcher consume.
// Genera dinámicamente el JSON con la misma estructura
// que el launcher espera.
// =====================================================
router.get('/', async (req, res) => {
  try {
    // Get current launcher version
    const launcherResult = await db.query(
      'SELECT version, download_url FROM launcher_versions WHERE is_current = true ORDER BY version DESC LIMIT 1'
    );
    
    const launcherVer = launcherResult.rows[0]?.version || 1;
    const launcherUrl = launcherResult.rows[0]?.download_url || '';

    // Get all active games
    const gamesResult = await db.query(
      `SELECT id, name, display_name, start_cmd, client_ver, client_url, 
              maintenance, icon_url, background_url
       FROM games 
       WHERE is_active = true 
       ORDER BY created_at ASC`
    );

    // Build games array with patches and voice packs
    const games = [];
    
    for (const game of gamesResult.rows) {
      // Get patches for this game (ordered)
      const patchesResult = await db.query(
        'SELECT patch_url FROM patches WHERE game_id = $1 ORDER BY patch_order ASC',
        [game.id]
      );

      // Get voice packs for this game
      const voicePacksResult = await db.query(
        'SELECT value, label FROM voice_packs WHERE game_id = $1 ORDER BY id ASC',
        [game.id]
      );

      const gameObj = {
        name: game.name,
        startCmd: game.start_cmd,
        clientVer: game.client_ver,
        clientUrl: game.client_url || '',
        patchUrls: patchesResult.rows.map(p => p.patch_url),
        maintenance: game.maintenance,
      };

      // Add optional fields only if they exist
      if (voicePacksResult.rows.length > 0) {
        gameObj.voicePacks = voicePacksResult.rows.map(vp => ({
          value: vp.value,
          label: vp.label,
        }));
      }

      // Dynamic icon and background URLs
      if (game.icon_url) {
        gameObj.iconUrl = game.icon_url;
      }
      if (game.background_url) {
        gameObj.backgroundUrl = game.background_url;
      }

      games.push(gameObj);
    }

    // Return the config JSON that the launcher expects
    const config = {
      launcherVer,
      launcherUrl,
      games,
    };

    res.json(config);
  } catch (error) {
    console.error('Error generating config:', error);
    res.status(500).json({ error: 'Failed to generate config' });
  }
});

module.exports = router;
