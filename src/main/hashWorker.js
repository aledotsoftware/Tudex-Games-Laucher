const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const crypto = require("crypto");

/**
 * Calculates SHA-256 hash of a file using streams inside a Node.js Worker Thread.
 * Avoids blocking the main Electron Event Loop and React UI.
 */
async function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 * 1024 });

    stream.on("data", (chunk) => {
      hash.update(chunk);
    });

    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

if (workerData && workerData.filePath) {
  calculateHash(workerData.filePath)
    .then((hash) => {
      parentPort.postMessage({ success: true, hash, filePath: workerData.filePath });
    })
    .catch((error) => {
      parentPort.postMessage({ success: false, error: error.message, filePath: workerData.filePath });
    });
}
