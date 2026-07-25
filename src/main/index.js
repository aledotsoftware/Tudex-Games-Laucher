const { app, ipcMain, dialog } = require("electron");
const createMainWindow = require("./mainWindow");
const isDevelopment = process.env.NODE_ENV !== "production";
const path = require("path");
let mainWindow;

// Track active downloads to prevent multiple simultaneous downloads
const activeDownloads = [];

app.on("ready", () => {
  mainWindow = createMainWindow();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setAlwaysOnTop(false);

  ipcMain.on("close-app", () => {
    app.exit();
  });

  ipcMain.on("get-file-path", (event) => {
    if (isDevelopment) {
      event.returnValue = path.resolve(app.getAppPath(), "..");
    } else {
      event.returnValue = process.env.PORTABLE_EXECUTABLE_DIR;
    }
  });

  ipcMain.on("show-error", (event, data) => {
    const message = typeof data === 'string' ? data : data.message;
    const title = (data && data.title) ? data.title : "Application Error";
    
    dialog
      .showMessageBox({
        type: "error",
        title: title,
        message: message,
        buttons: ["OK"],
        noLink: true
      })
      .then((result) => {
        if (result.response === 0) {
          app.quit();
        }
      });
  });

  ipcMain.on("show-warn", (event, error) => {
    dialog.showMessageBox({
      type: "warning",
      title: "Application Warning",
      message: error.toString(),
      buttons: ["OK"],
    });
  });

  const { download } = require("electron-dl");
  const activeDownloadItems = {};

  ipcMain.on("download", (event, data) => {
    const step = (data.options && data.options.step) ? data.options.step : "default";

    if (activeDownloads.includes(step)) {
      return;
    }
    
    activeDownloads.push(step);
    
    data.options.onProgress = (status) => {
      mainWindow.send("download progress", status);
    };

    data.options.onStarted = (item) => {
      activeDownloadItems[step] = item;
    };
    
    data.options.overwrite = true;
    
    download(mainWindow, data.url, data.options)
      .then(() => {
        delete activeDownloadItems[step];
        const index = activeDownloads.indexOf(step);
        if (index > -1) {
          activeDownloads.splice(index, 1);
        }
        
        switch (step) {
          case "launcher":
            mainWindow.send("download launcher complete");
            break;
          case "client":
            mainWindow.send("download client complete");
            break;
          case "patch":
            mainWindow.send("download patch complete");
            break;
          default:
            mainWindow.send("download default complete");
        }
      })
      .catch((error) => {
        delete activeDownloadItems[step];
        const index = activeDownloads.indexOf(step);
        if (index > -1) {
          activeDownloads.splice(index, 1);
        }
        console.error("Download error:", error);
        mainWindow.send("download error");
      });
  });

  ipcMain.on("pause-download", (event, step = "client") => {
    const item = activeDownloadItems[step];
    if (item && !item.isPaused()) {
      try {
        item.pause();
      } catch (e) {
        try { item.cancel(); } catch (err) { /* ignore */ }
      }
    }
    const index = activeDownloads.indexOf(step);
    if (index > -1) {
      activeDownloads.splice(index, 1);
    }
  });

  ipcMain.on("resume-download", (event, step = "client") => {
    const item = activeDownloadItems[step];
    if (item && item.isPaused()) {
      try {
        item.resume();
      } catch (e) { /* ignore */ }
    }
  });

  ipcMain.on("cancel-download", (event, step = "client") => {
    const item = activeDownloadItems[step];
    if (item) {
      try {
        item.cancel();
      } catch (e) { /* ignore */ }
      delete activeDownloadItems[step];
    }
    const index = activeDownloads.indexOf(step);
    if (index > -1) {
      activeDownloads.splice(index, 1);
    }
  });

  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"]
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.on("run-patch-builder", async (event, params) => {
    const { spawn } = require("child_process");
    const fs = require("fs");
    let scriptPath = path.join(app.getAppPath(), "tools", "patch-builder.js");
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(process.cwd(), "tools", "patch-builder.js");
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, "../../tools/patch-builder.js");
    }
    const quote = (str) => `"${String(str).replace(/"/g, '\\"')}"`;

    const args = [
      quote(scriptPath),
      "--game", quote(params.game || "juego1"),
      "--new", quote(params.newDir),
      "--version", String(params.version || 1),
      "--base-url", quote(params.baseUrl || "http://localhost:8081"),
      "--out", quote(params.outDir || path.resolve(process.cwd(), "public_html"))
    ];
    if (params.oldDir) {
      args.push("--old", quote(params.oldDir));
    }
    if (params.fromVersion) {
      args.push("--from-version", String(params.fromVersion));
    }
    if (params.volumeSize) {
      args.push("--volume-size", quote(params.volumeSize));
    }

    const child = spawn("node", args, { shell: true });

    child.stdout.on("data", (data) => {
      mainWindow.send("patch-builder-log", data.toString());
    });

    child.stderr.on("data", (data) => {
      mainWindow.send("patch-builder-log", `ERROR: ${data.toString()}`);
    });

    child.on("close", async (code) => {
      if (code === 0 && params.game && params.newDir) {
        try {
          const { updateGameHistory } = require("../../tools/settings-manager");
          updateGameHistory(params.game, params.version, params.newDir);
        } catch (e) {
          console.warn("Could not update game history:", e);
        }

        if (params.autoFtp && params.ftpConfig && params.ftpConfig.enabled) {
          mainWindow.send("patch-builder-log", "\n📡 Iniciando subida automática a servidor FTP...\n");
          try {
            const { uploadPublicHtml } = require("../../tools/ftp-uploader");
            const publicHtmlDir = params.outDir || path.resolve(process.cwd(), "public_html");
            await uploadPublicHtml(params.ftpConfig, publicHtmlDir, (logMsg) => {
              mainWindow.send("patch-builder-log", `${logMsg}\n`);
            });
            mainWindow.send("patch-builder-complete", { success: true, code: 0, ftpSuccess: true });
            return;
          } catch (ftpErr) {
            mainWindow.send("patch-builder-log", `❌ Error al subir a FTP: ${ftpErr.message}\n`);
            mainWindow.send("patch-builder-complete", { success: false, code: 1, ftpError: ftpErr.message });
            return;
          }
        }
      }
      mainWindow.send("patch-builder-complete", { success: code === 0, code });
    });
  });

  ipcMain.on("run-fast-update", async (event, params) => {
    const { spawn } = require("child_process");
    const fs = require("fs");
    let scriptPath = path.join(app.getAppPath(), "tools", "fast-update.js");
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(process.cwd(), "tools", "fast-update.js");
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, "../../tools/fast-update.js");
    }
    const quote = (str) => `"${String(str).replace(/"/g, '\\"')}"`;

    const args = [
      quote(scriptPath),
      "--game", quote(params.game || "neo")
    ];
    if (params.sourcePath) {
      args.push("--source", quote(params.sourcePath));
    }
    if (params.noFtp) {
      args.push("--no-ftp");
    }
    if (params.fullClient) {
      args.push("--full-client");
    }

    const child = spawn("node", args, { shell: true });

    child.stdout.on("data", (data) => {
      mainWindow.send("patch-builder-log", data.toString());
    });

    child.stderr.on("data", (data) => {
      mainWindow.send("patch-builder-log", `ERROR: ${data.toString()}`);
    });

    child.on("close", async (code) => {
      mainWindow.send("patch-builder-complete", { success: code === 0, code });
    });
  });

  ipcMain.on("run-launcher-builder", async (event, params) => {
    const { spawn } = require("child_process");
    const fs = require("fs");
    const quote = (str) => `"${String(str).replace(/"/g, '\\"')}"`;

    let scriptPath = path.join(app.getAppPath(), "tools", "launcher-builder.js");
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.resolve(process.cwd(), "tools", "launcher-builder.js");
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(__dirname, "../../tools/launcher-builder.js");
    }

    let exePath = params.exePath ? path.resolve(params.exePath) : path.resolve(process.cwd(), "dist", "TudexLauncher.exe");

    const compileAndBuild = async () => {
      // Step 1: Automatically compile the Electron executable if needed
      if (params.shouldBuild !== false || !fs.existsSync(exePath)) {
        mainWindow.send("patch-builder-log", "🔨 Compilando ejecutable del Launcher (npm run build:player)...\n");
        const buildCode = await new Promise((resolve) => {
          const buildProcess = spawn("npm", ["run", "build:player"], { shell: true, cwd: process.cwd() });
          buildProcess.stdout.on("data", (data) => {
            mainWindow.send("patch-builder-log", data.toString());
          });
          buildProcess.stderr.on("data", (data) => {
            mainWindow.send("patch-builder-log", data.toString());
          });
          buildProcess.on("close", (code) => resolve(code));
        });

        if (buildCode !== 0) {
          mainWindow.send("patch-builder-log", "\n❌ Error al compilar el ejecutable del launcher (build:player).\n");
          mainWindow.send("patch-builder-complete", { success: false, code: buildCode });
          return;
        }
      }

      if (!fs.existsSync(exePath)) {
        mainWindow.send("patch-builder-log", `\n❌ Error: No se encontró el ejecutable en ${exePath}\n`);
        mainWindow.send("patch-builder-complete", { success: false, code: 1 });
        return;
      }

      // Step 2: Run launcher-builder.js
      mainWindow.send("patch-builder-log", `\n📦 Registrando versión v${params.version || 2} en config.json...\n`);
      const args = [
        quote(scriptPath),
        "--version", String(params.version || 2),
        "--exe", quote(exePath)
      ];

      const child = spawn("node", args, { shell: true });

      child.stdout.on("data", (data) => {
        mainWindow.send("patch-builder-log", data.toString());
      });

      child.stderr.on("data", (data) => {
        mainWindow.send("patch-builder-log", `ERROR: ${data.toString()}`);
      });

      child.on("close", async (code) => {
        if (code === 0 && params.autoFtp) {
          try {
            const { loadSettings } = require("../../tools/settings-manager");
            const settings = loadSettings();
            if (settings.ftp && settings.ftp.enabled && settings.ftp.host) {
              mainWindow.send("patch-builder-log", "\n📡 Subiendo automáticamente nuevo Launcher por FTP al servidor...\n");
              const { uploadPublicHtml } = require("../../tools/ftp-uploader");
              const publicHtmlDir = path.resolve(process.cwd(), "public_html");
              await uploadPublicHtml(settings.ftp, publicHtmlDir, (msg) => {
                mainWindow.send("patch-builder-log", `${msg}\n`);
              });
              mainWindow.send("patch-builder-complete", { success: true, code: 0, ftpSuccess: true });
              return;
            }
          } catch (ftpErr) {
            mainWindow.send("patch-builder-log", `❌ Error al subir Launcher a FTP: ${ftpErr.message}\n`);
            mainWindow.send("patch-builder-complete", { success: false, code: 1, ftpError: ftpErr.message });
            return;
          }
        }
        mainWindow.send("patch-builder-complete", { success: code === 0, code });
      });
    };

    compileAndBuild();
  });

  ipcMain.handle("load-studio-settings", () => {
    const { loadSettings } = require("../../tools/settings-manager");
    return loadSettings();
  });

  ipcMain.handle("save-studio-settings", (event, settings) => {
    const { saveSettings } = require("../../tools/settings-manager");
    saveSettings(settings);
    return true;
  });

  ipcMain.on("download-chunks-parallel", async (event, { urls, targetDir, concurrency = 4 }) => {
    const https = require("https");
    const http = require("http");
    const fs = require("fs");
    const path = require("path");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const chunkProgress = {};

    const downloadFile = (url) => {
      return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const filename = path.basename(urlObj.pathname);
        const destPath = path.join(targetDir, filename);
        const protocol = url.startsWith("https") ? https : http;

        const req = protocol.get(url, (res) => {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode} downloading ${filename}`));
          }

          const fileLength = parseInt(res.headers["content-length"] || "0", 10);
          chunkProgress[filename] = { downloaded: 0, total: fileLength };

          const fileStream = fs.createWriteStream(destPath);
          res.on("data", (chunk) => {
            chunkProgress[filename].downloaded += chunk.length;
            fileStream.write(chunk);

            let currentDownloaded = 0;
            let currentTotal = 0;
            Object.values(chunkProgress).forEach(p => {
              currentDownloaded += p.downloaded;
              currentTotal += p.total;
            });

            mainWindow.send("download-chunks-progress", {
              downloadedBytes: currentDownloaded,
              totalBytes: currentTotal,
              activeChunk: filename,
              completedChunks: Object.values(chunkProgress).filter(p => p.total > 0 && p.downloaded >= p.total).length,
              totalChunks: urls.length
            });
          });

          res.on("end", () => {
            fileStream.end();
            resolve(destPath);
          });

          res.on("error", (err) => {
            fileStream.end();
            reject(err);
          });
        });

        req.on("error", (err) => reject(err));
      });
    };

    try {
      const queue = [...urls];
      const activeWorkers = [];

      while (queue.length > 0 || activeWorkers.length > 0) {
        while (queue.length > 0 && activeWorkers.length < concurrency) {
          const nextUrl = queue.shift();
          const promise = downloadFile(nextUrl).then(() => {
            activeWorkers.splice(activeWorkers.indexOf(promise), 1);
          });
          activeWorkers.push(promise);
        }

        if (activeWorkers.length > 0) {
          await Promise.race(activeWorkers);
        }
      }

      mainWindow.send("download-chunks-complete", { success: true });
    } catch (error) {
      console.error("Parallel chunk download error:", error);
      mainWindow.send("download-chunks-error", { error: error.message });
    }
  });
});
