const db = require('./db');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BASE_URL = process.env.BASE_URL || 'https://launcher.tudexgames.com';
const LAUNCHER_FILENAME = 'TudexGamesLauncher.exe';
const LAUNCHER_PATH = path.join(UPLOAD_DIR, 'launcher', LAUNCHER_FILENAME);
const LAUNCHER_URL = `${BASE_URL}/uploads/launcher/${LAUNCHER_FILENAME}`;

/**
 * Al iniciar la API, verifica si hay un nuevo .exe en /uploads/launcher/
 * y si su fecha de modificación es más reciente que la última versión
 * registrada en la DB. Si es así, auto-publica una nueva versión.
 */
async function autoPublishLauncher() {
  try {
    if (!fs.existsSync(LAUNCHER_PATH)) {
      console.log('ℹ️  No se encontró TudexGamesLauncher.exe en uploads/launcher/ — omitiendo auto-publish.');
      return;
    }

    const fileStat = fs.statSync(LAUNCHER_PATH);
    const fileModTime = fileStat.mtime;

    // Get the most recent launcher version in DB
    const result = await db.query(
      'SELECT version, created_at FROM launcher_versions ORDER BY version DESC LIMIT 1'
    );

    const lastVersion = result.rows[0];

    // If no version exists, or the exe is newer than the last registered version → publish
    const shouldPublish =
      !lastVersion ||
      new Date(fileModTime) > new Date(lastVersion.created_at);

    if (shouldPublish) {
      // Set all existing versions to not current
      await db.query('UPDATE launcher_versions SET is_current = false');

      const newVersion = (lastVersion?.version || 0) + 1;

      await db.query(
        `INSERT INTO launcher_versions (version, download_url, is_current, changelog)
         VALUES ($1, $2, true, $3)`,
        [newVersion, LAUNCHER_URL, `Auto-publicado al desplegar contenedor v${newVersion}`]
      );

      console.log(`🚀 Launcher v${newVersion} auto-publicado desde ${LAUNCHER_PATH}`);
    } else {
      console.log(`✅ Launcher ya está en la versión más reciente (v${lastVersion.version}), sin cambios.`);
    }
  } catch (error) {
    // Non-fatal - log and continue
    console.warn('⚠️  Error en auto-publish del launcher:', error.message);
  }
}

module.exports = { autoPublishLauncher };
