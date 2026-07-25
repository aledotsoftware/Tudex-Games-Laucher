import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Verifies final game files on disk against remote SHA-256 manifest
 */
export async function verifyIntegrity(gameDir, manifest, progressCallback = null) {
  if (!manifest || typeof manifest !== "object" || Object.keys(manifest).length === 0) {
    return { valid: true, verifiedCount: 0, corruptedFiles: [] };
  }

  const entries = Object.entries(manifest);
  const corruptedFiles = [];
  let processed = 0;

  for (const [relativePath, meta] of entries) {
    const fullPath = path.join(gameDir, relativePath);
    processed++;

    if (progressCallback) {
      progressCallback({
        processed,
        total: entries.length,
        percent: Math.round((processed / entries.length) * 100),
        currentFile: relativePath
      });
    }

    if (!fs.existsSync(fullPath)) {
      corruptedFiles.push({ relativePath, error: "MISSING_FILE" });
      continue;
    }

    try {
      const stat = fs.statSync(fullPath);
      if (meta.size && stat.size !== meta.size) {
        corruptedFiles.push({ relativePath, error: "SIZE_MISMATCH", expected: meta.size, actual: stat.size });
        continue;
      }

      if (meta.hash) {
        const hashSum = crypto.createHash("sha256");
        const fd = fs.openSync(fullPath, "r");
        const bufferSize = 4 * 1024 * 1024; // 4MB buffer
        const buffer = Buffer.alloc(bufferSize);
        let bytesRead = 0;

        try {
          while ((bytesRead = fs.readSync(fd, buffer, 0, bufferSize, null)) > 0) {
            hashSum.update(buffer.subarray(0, bytesRead));
          }
        } finally {
          try { fs.closeSync(fd); } catch (e) {}
        }

        const calculatedHash = hashSum.digest("hex");
        if (calculatedHash !== meta.hash) {
          corruptedFiles.push({ relativePath, error: "HASH_MISMATCH", expected: meta.hash, actual: calculatedHash });
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
