import path from "path";
import fs from "fs";
import Seven from "node-7z";

const getSevenZipBinPath = () => {
  const possiblePaths = [
    (() => {
      try { return require("7zip-bin").path7za; } catch (e) { return null; }
    })(),
    path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "7zip-bin", "win", "x64", "7za.exe"),
    path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "7zip-bin", "win", "ia32", "7za.exe"),
    path.join(process.resourcesPath, "7zip-bin", "win", "x64", "7za.exe"),
    path.join(process.resourcesPath, "7za.exe"),
    path.join(process.cwd(), "7za.exe"),
    path.join(process.cwd(), "resources", "7za.exe"),
    "7za.exe"
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  try { return require("7zip-bin").path7za; } catch (e) { return "7za.exe"; }
};

export const extract7zFile = async (archivePath, outputDir, progressCallback) => {
  return new Promise((resolve, reject) => {
    const pathTo7zip = getSevenZipBinPath();
    
    // Support multi-volume split archives (.7z.001)
    let targetPath = archivePath;
    if (!fs.existsSync(targetPath) && fs.existsSync(`${archivePath}.001`)) {
      targetPath = `${archivePath}.001`;
    }

    const extractionStream = Seven.extractFull(targetPath, outputDir, {
      $bin: pathTo7zip,
      $progress: true,
    });

    extractionStream.on("progress", (progress) => {
      progressCallback(progress);
    });

    extractionStream.on("end", () => {
      resolve();
    });

    extractionStream.on("error", (err) => {
      console.error("Extraction error:", err);
      reject(err);
    });
  });
};
