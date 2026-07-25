/**
 * Asynchronously verifies game files against remote SHA-256 manifest
 * using Node.js Worker Threads via Electron IPC (preload bridge).
 * Keeps the React UI 100% responsive.
 */
export async function verifyIntegrity(gameDir, manifest, progressCallback = null) {
  if (!manifest || typeof manifest !== "object" || Object.keys(manifest).length === 0) {
    return { valid: true, verifiedCount: 0, corruptedFiles: [] };
  }

  const entries = Object.entries(manifest);
  const corruptedFiles = [];
  let processed = 0;

  const verifyFileHash = window.electronAPI && window.electronAPI.verifyFileHash
    ? window.electronAPI.verifyFileHash
    : async (fp) => {
        const { ipcRenderer } = require("electron");
        return await ipcRenderer.invoke("verify-file-hash", fp);
      };

  for (const [relativePath, meta] of entries) {
    const fullPath = `${gameDir}\\${relativePath.replace(/\//g, '\\')}`;
    processed++;

    if (progressCallback) {
      progressCallback({
        processed,
        total: entries.length,
        percent: Math.round((processed / entries.length) * 100),
        currentFile: relativePath
      });
    }

    try {
      if (meta.hash) {
        const result = await verifyFileHash(fullPath);
        if (!result.success) {
          corruptedFiles.push({ relativePath, error: result.error || "MISSING_OR_UNREADABLE" });
        } else if (result.hash.toLowerCase() !== meta.hash.toLowerCase()) {
          corruptedFiles.push({
            relativePath,
            error: "HASH_MISMATCH",
            expected: meta.hash,
            actual: result.hash
          });
        }
      }
    } catch (err) {
      corruptedFiles.push({ relativePath, error: err.message });
    }
  }

  return {
    valid: corruptedFiles.length === 0,
    verifiedCount: entries.length,
    corruptedFiles
  };
}
