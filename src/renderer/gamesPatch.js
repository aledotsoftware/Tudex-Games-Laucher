import { ipcRenderer } from "electron";
import fs, { promises as fsPromises } from "fs";
import path from "path";
import { addCacheBustingSuffix } from "./utils/addCacheBustingSuffix";
import { showText } from "./utils/showText";
import { updateConfigJson } from "./utils/updateConfigJson";
import { getFileNameFromUrl } from "./utils/getFileNameFromUrl";
import { extract7zFile } from "./utils/extract7zFile";
import { showDownloadProgress, resetProgressSmoothing } from "./utils/showDownloadProgress";
import { showExtractProgress, resetExtractProgressSmoothing } from "./utils/showExtractProgress";
import { showError } from "./utils/showError";
import { getTranslatedText } from "./utils/getTranslatedText";
import { CONFIG, GAME_PARAMS } from "../constants";
const isDevelopment = process.env.NODE_ENV !== "production";

// Track download states to prevent duplicates
const downloadStates = {};
// Track start times for each game
const downloadStartTimes = {};

export const gamesPatch = async (game, setIsUpdating, maintenance = false) => {
    let startTime;
    const currentDir = ipcRenderer.sendSync("get-file-path", "");
    const configLocalPath = isDevelopment
      ? CONFIG.FILE_NAME
      : `${currentDir}\\${CONFIG.FILE_NAME}`;
    const configData = await fsPromises.readFile(configLocalPath, "utf8");
    const updatedConfigLocal = JSON.parse(configData);
    const gamesLocal = updatedConfigLocal?.games || [];
    const gameLocal = gamesLocal.find((g) => g.name === game.name);
    const startButton = document.querySelector(`.btn-start.${game?.name}`);
    const disabledButton = document.querySelector(
      `.btn-start.disabled.${game?.name}`
    );

    const waitForInstallClick = async () => {
      setIsUpdating(false);
      disabledButton.style.setProperty("display", "none");
      startButton.removeEventListener("click", handlePatchClick);
      startButton.addEventListener("click", handleInstallClick);
      showText(`.btn-start.${game?.name}`, getTranslatedText("install"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("gameNotInstalled"));
    };

    const waitForClientUpdateClick = async () => {
      setIsUpdating(false);
      disabledButton.style.setProperty("display", "none");
      startButton.removeEventListener("click", handlePatchClick);
      startButton.addEventListener("click", handleInstallClick);
      showText(`.btn-start.${game?.name}`, getTranslatedText("downloadClient"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("newClientAvailable"));
    };

    const handleInstallClick = async () => {
      disabledButton.style.display = "block";
      showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("install"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("downloadingClient"));
      await updateClient();
    };

    const waitForPatchClick = async () => {
      setIsUpdating(false);
      disabledButton.style.setProperty("display", "none");
      startButton.removeEventListener("click", handleInstallClick);
      startButton.addEventListener("click", handlePatchClick);
      showText(`.btn-start.${game?.name}`, getTranslatedText("downloadUpdates"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("updatesAvailable"));
    };

    const handlePatchClick = async () => {
      disabledButton.style.display = "block";
      showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("downloadUpdates"));
      await handlePatches();
    };

    const init = async () => {
      const gameFolder = isDevelopment
        ? game.name
        : `${currentDir}\\${game.name}`;
      const gameFolderExists = fs.existsSync(gameFolder);

      if (
        !gameFolderExists ||
        gameLocal?.clientVer === 0 ||
        gameLocal?.clientVer == null
      ) {
        waitForInstallClick();
      } else if (game?.clientVer > gameLocal?.clientVer) {
        waitForClientUpdateClick();
      } else if (game?.patchUrls?.length > gameLocal?.patchVer) {
        waitForPatchClick();
      } else {
        finish();
      }
    };

    let isPaused = false;
    let activeClientListener = null;
    let processChunkDownload = null;

    const pauseClientDownload = () => {
      isPaused = true;
      downloadStates[`${game.name}_client`] = false;
      ipcRenderer.send("pause-download", "client");
      ipcRenderer.send("pause-download", "patch");

      if (activeClientListener) {
        ipcRenderer.removeListener("download client complete", activeClientListener);
        activeClientListener = null;
      }
      disabledButton.style.display = "none";
      startButton.style.display = "block";
      startButton.removeEventListener("click", pauseClientDownload);
      startButton.addEventListener("click", resumeClientDownload);
      showText(`.btn-start.${game?.name}`, getTranslatedText("resume"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("downloadPaused"));
      showText(`.txt-download-speed.${game?.name}`, "");
      showText(`.txt-time-remaining.${game?.name}`, "");
    };

    const resumeClientDownload = () => {
      if (downloadStates[`${game.name}_client`]) return;
      isPaused = false;
      downloadStates[`${game.name}_client`] = true;
      setIsUpdating(true);
      ipcRenderer.send("resume-download", "client");
      ipcRenderer.send("resume-download", "patch");

      disabledButton.style.display = "none";
      startButton.style.display = "block";
      startButton.removeEventListener("click", resumeClientDownload);
      startButton.addEventListener("click", pauseClientDownload);
      showText(`.btn-start.${game?.name}`, getTranslatedText("pause"));
      showText(`.txt-status.${game?.name}`, getTranslatedText("downloadingClient"));
      processChunkDownload();
    };

    const updateClient = async () => {
      if (downloadStates[`${game.name}_client`]) {
        return;
      }
      
      downloadStates[`${game.name}_client`] = true;
      isPaused = false;
      setIsUpdating(true);
      resetProgressSmoothing(game);
      resetExtractProgressSmoothing(game);
      try {
        await fsPromises.access(`${currentDir}\\${game?.name}`);
      } catch (error) {
        await fsPromises.mkdir(`${currentDir}\\${game?.name}`, {
          recursive: true,
        });
      }

      // Collect all volume chunk URLs (or single URL if not split)
      let chunkUrls = [];
      if (game?.clientChunks && Array.isArray(game.clientChunks) && game.clientChunks.length > 0) {
        chunkUrls = game.clientChunks;
      } else if (game?.clientUrl) {
        chunkUrls = [game.clientUrl];
      }

      if (chunkUrls.length === 0) {
        showError(getTranslatedText("errorDownloadingFile"));
        setIsUpdating(false);
        downloadStates[`${game.name}_client`] = false;
        return;
      }

      let currentChunkIndex = 0;

      processChunkDownload = async () => {
        if (isPaused) return;

        if (currentChunkIndex >= chunkUrls.length) {
          // All volume chunks downloaded successfully, clean up listeners & start extract
          startButton.removeEventListener("click", pauseClientDownload);
          startButton.removeEventListener("click", resumeClientDownload);
          disabledButton.style.display = "block";

          // Post-download SHA-256 integrity verification of volume chunks before extraction
          showText(`.txt-status.${game?.name}`, getTranslatedText("verifyingIntegrity") || "Verificando integridad de archivos descargados...");
          const verifyFileHashFn = (window.electronAPI && window.electronAPI.verifyFileHash)
            ? window.electronAPI.verifyFileHash
            : (fp) => ipcRenderer.invoke("verify-file-hash", fp);

          for (let i = 0; i < chunkUrls.length; i++) {
            const chunkUrl = chunkUrls[i];
            const fn = getFileNameFromUrl(chunkUrl);
            const chunkPath = `${currentDir}\\${game?.name}\\${fn}`;
            
            const expectedHash = (game.clientChunksHashes && game.clientChunksHashes[i]) ||
                                 (game.clientHashesMap && game.clientHashesMap[fn]);

            if (expectedHash && fs.existsSync(chunkPath)) {
              const res = await verifyFileHashFn(chunkPath);
              if (!res.success || res.hash.toLowerCase() !== expectedHash.toLowerCase()) {
                console.error(`Post-download hash mismatch for ${fn}. Expected ${expectedHash}, got ${res.hash}`);
                try { await fsPromises.unlink(chunkPath); } catch (e) {}
                showError("Verificación de integridad fallida. Archivo descargado corrupto. Reintentando...");
                setIsUpdating(false);
                downloadStates[`${game.name}_client`] = false;
                return;
              }
            }
          }

          showText(`.txt-status.${game?.name}`, getTranslatedText("extractingClient"));
          const firstChunkFileName = getFileNameFromUrl(chunkUrls[0]);
          const firstChunkPath = `${currentDir}\\${game?.name}\\${firstChunkFileName}`;

          try {
            await extract7zFile(
              firstChunkPath,
              `${currentDir}\\${game?.name}`,
              (progress) => {
                showExtractProgress(game, progress);
              }
            );

            // Clean up downloaded archive volume files
            for (const url of chunkUrls) {
              const fn = getFileNameFromUrl(url);
              const p = `${currentDir}\\${game?.name}\\${fn}`;
              try {
                await fsPromises.access(p);
                await fsPromises.unlink(p);
              } catch (e) {
                // Ignore if chunk file is missing
              }
            }

            await updateConfigJson(
              "games",
              { name: game.name, clientVer: game.clientVer, patchVer: 0 },
              configLocalPath
            );

            if (game?.patchUrls?.length > gameLocal?.patchVer) {
              handlePatches();
            } else {
              finish();
            }
          } catch (error) {
            console.error("Extraction error:", error);
            showError(getTranslatedText("errorDownloadingFile"));
            setIsUpdating(false);
          } finally {
            downloadStates[`${game.name}_client`] = false;
            delete downloadStartTimes[`${game.name}_client`];
          }
          return;
        }

        // Show Pause button on action button
        disabledButton.style.display = "none";
        startButton.style.display = "block";
        startButton.removeEventListener("click", handleInstallClick);
        startButton.removeEventListener("click", resumeClientDownload);
        startButton.addEventListener("click", pauseClientDownload);
        showText(`.btn-start.${game?.name}`, getTranslatedText("pause"));

        const chunkUrl = chunkUrls[currentChunkIndex];
        const chunkFileName = getFileNameFromUrl(chunkUrl);
        const chunkFilePath = `${currentDir}\\${game?.name}\\${chunkFileName}`;

        // Check if chunk file already exists (e.g. completed in previous session or before pause)
        try {
          if (fs.existsSync(chunkFilePath)) {
            const stat = await fsPromises.stat(chunkFilePath);
            // Skip completed non-last volume chunks if size > 1MB
            if (stat.size > 1048576 && currentChunkIndex < chunkUrls.length - 1) {
              currentChunkIndex++;
              return processChunkDownload();
            } else {
              await fsPromises.unlink(chunkFilePath);
            }
          }
        } catch (error) {
          // Ignore
        }

        if (chunkUrls.length > 1) {
          showText(
            `.txt-status.${game?.name}`,
            `${getTranslatedText("downloadingClient")} (${currentChunkIndex + 1}/${chunkUrls.length})`
          );
        } else {
          showText(`.txt-status.${game?.name}`, getTranslatedText("downloadingClient"));
        }

        startTime = Date.now();
        downloadStartTimes[`${game.name}_client`] = startTime;

        ipcRenderer.send("download", {
          url: addCacheBustingSuffix(chunkUrl),
          options: {
            directory: `${currentDir}\\${game?.name}`,
            filename: chunkFileName,
            step: "client",
          },
        });

        activeClientListener = () => {
          if (activeClientListener) {
            ipcRenderer.removeListener("download client complete", activeClientListener);
            activeClientListener = null;
          }
          if (!isPaused) {
            currentChunkIndex++;
            processChunkDownload();
          }
        };

        ipcRenderer.once("download client complete", activeClientListener);
      };

      processChunkDownload();
    };

    const handlePatches = async () => {
      // Check if patch download is already in progress
      if (downloadStates[`${game.name}_patches`]) {
        return;
      }
      
      downloadStates[`${game.name}_patches`] = true;
      setIsUpdating(true);
      // Reset progress smoothing for clean start
      resetProgressSmoothing(game);
      resetExtractProgressSmoothing(game);

      const patchesToDownload = game.patchUrls.slice(gameLocal.patchVer); // Only download patches that haven't been applied

      const update = async () => {
        if (patchesToDownload.length > 0) {
          const patchUrl = patchesToDownload[0];
          const patchIndex = gameLocal.patchVer + 1; // Track patch number being downloaded
          const patchZipPath = `${currentDir}\\${game.name}\\${patchUrl
            .split("/")
            .pop()}`; // Naming the patch file

          showText(
            `.txt-status.${game.name}`,
            getTranslatedText("downloadingPatch", { number: patchIndex })
          );

          // Reset progress smoothing for each new patch download
          resetProgressSmoothing(game);
          
          // Reset progress bar to 0% visually
          document.querySelector(`.total-bar.${game.name}`).style.setProperty("width", "0%");
          showText(`.txt-progress.${game.name}`, "0% (0MB/0MB)");

          // Force delete the patch file if it exists
          try {
            await fsPromises.access(patchZipPath);
            await fsPromises.unlink(patchZipPath);
            
            // Wait for file to be actually deleted
            let attempts = 0;
            const maxAttempts = 10;
            while (attempts < maxAttempts) {
              try {
                await fsPromises.access(patchZipPath);
                // File still exists, wait a bit and try again
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
              } catch (error) {
                // File is gone, we can proceed
                break;
              }
            }
          } catch (error) {
            // File doesn't exist, continue
          }

          startTime = Date.now();
          downloadStartTimes[`${game.name}_patch`] = startTime;
          ipcRenderer.send("download", {
            url: addCacheBustingSuffix(patchUrl),
            options: {
              directory: `${currentDir}\\${game.name}`,
              filename: patchUrl.split("/").pop(), // Correct filename based on patchUrl
              step: "patch",
            },
          });

          ipcRenderer.once("download patch complete", async () => {
            const patchFileName = patchUrl.split("/").pop();
            const expectedPatchHash = (game.patchUrlsHashes && game.patchUrlsHashes[patchIndex - 1]) ||
                                      (game.patchHashesMap && game.patchHashesMap[patchFileName]);

            if (expectedPatchHash && fs.existsSync(patchZipPath)) {
              showText(`.txt-status.${game.name}`, "Verificando integridad del parche...");
              const verifyFileHashFn = (window.electronAPI && window.electronAPI.verifyFileHash)
                ? window.electronAPI.verifyFileHash
                : (fp) => ipcRenderer.invoke("verify-file-hash", fp);

              const res = await verifyFileHashFn(patchZipPath);
              if (!res.success || res.hash.toLowerCase() !== expectedPatchHash.toLowerCase()) {
                console.error(`Patch SHA-256 hash mismatch for ${patchFileName}. Expected ${expectedPatchHash}, got ${res.hash}`);
                try { await fsPromises.unlink(patchZipPath); } catch (e) {}
                showError("Parche descargado corrupto (fallo de hash). Reintentando descarga...");
                downloadStates[`${game.name}_patches`] = false;
                delete downloadStartTimes[`${game.name}_patch`];
                setIsUpdating(false);
                return;
              }
            }

            showText(
              `.txt-status.${game.name}`,
              getTranslatedText("extractingPatch", { number: patchIndex })
            );

            try {
              await extract7zFile(
                patchZipPath,
                `${currentDir}\\${game.name}`,
                (progress) => {
                  showExtractProgress(game, progress);
                }
              );
              
              // Clean up the patch file
              await fsPromises.unlink(patchZipPath);
              
              showText(
                `.txt-status.${game.name}`,
                getTranslatedText("patchApplied", { number: patchIndex })
              );

              // Update the patch version in config after applying the patch
              await updateConfigJson(
                "games",
                { name: game.name, patchVer: patchIndex }, // Update to the current patch index
                configLocalPath
              );

              patchesToDownload.shift(); // Remove the completed patch
              gameLocal.patchVer = patchIndex; // Update local patch version
              update(); // Process the next patch
            } catch (error) {
              console.error("Patch extraction error:", error);
              showError(getTranslatedText("errorDownloadingFile"));
              // Don't enable button on error - keep it disabled until all patches are done
            } finally {
              // Clear patch download state and start time
              downloadStates[`${game.name}_patches`] = false;
              delete downloadStartTimes[`${game.name}_patch`];
            }
          });
        } else {
          // Final update for the config with the latest patch version
          await updateConfigJson(
            "games",
            { name: game.name, patchVer: game.patchUrls.length }, // Final update after all patches
            configLocalPath
          );
          // Clear patch download state and start time
          downloadStates[`${game.name}_patches`] = false;
          delete downloadStartTimes[`${game.name}_patch`];
          finish();
        }
      };

      // Start the update process if there are patches to download
      if (patchesToDownload.length > 0) {
        update();
      } else {
        finish();
      }
    };

    const isGameValid = () => {
      const gameFolder = isDevelopment
        ? game.name
        : `${currentDir}\\${game.name}`;
      if (!fs.existsSync(gameFolder)) return false;

      try {
        const files = fs.readdirSync(gameFolder);
        if (!files || files.length === 0) return false;

        if (game?.startCmd) {
          const rawCmd = game.startCmd.trim();
          const match = rawCmd.match(/^"?([^"\s]+\.exe)"?/i) || rawCmd.split(" ");
          const exeName = match ? (match[1] || match[0]) : null;
          if (exeName) {
            const fullExePath = path.join(gameFolder, exeName);
            if (!fs.existsSync(fullExePath)) {
              console.warn("Game executable missing:", fullExePath);
              return false;
            }
            const stat = fs.statSync(fullExePath);
            if (stat.size === 0) return false;
          }
        }

        // Integrity verification against release manifest
        if (game?.manifest && typeof game.manifest === "object") {
          for (const [relPath, info] of Object.entries(game.manifest)) {
            const targetPath = path.join(gameFolder, relPath);
            if (!fs.existsSync(targetPath)) {
              console.warn("Integrity check failed: missing file", relPath);
              return false;
            }
            if (info?.size) {
              const stat = fs.statSync(targetPath);
              if (stat.size !== info.size) {
                console.warn("Integrity check failed: modified file size", relPath);
                return false;
              }
            }
          }
        }
      } catch (e) {
        return false;
      }
      return true;
    };

    const finish = () => {
      setIsUpdating(false);
      disabledButton.style.setProperty("display", "none");
      
      if (maintenance) {
        showText(`.txt-status.${game?.name}`, getTranslatedText("underMaintenance"));
        showText(`.btn-start.${game?.name}`, getTranslatedText("underMaintenance"));
        showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("underMaintenance"));
      } else if (!isGameValid()) {
        showText(`.txt-status.${game?.name}`, getTranslatedText("installationCorrupted"));
        showText(`.btn-start.${game?.name}`, getTranslatedText("repair"));
        showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("repair"));
        showText(`.txt-progress.${game?.name}`, "");
        document
          .querySelector(`.total-bar.${game?.name}`)
          .style.setProperty("width", "0%");

        startButton.removeEventListener("click", handleInstallClick);
        startButton.removeEventListener("click", handlePatchClick);
        startButton.addEventListener("click", () => repairGame(game, setIsUpdating));
      } else {
        showText(`.txt-status.${game?.name}`, getTranslatedText("gameReady"));
        showText(`.btn-start.${game?.name}`, getTranslatedText("play"));
        showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("play"));
        
        showText(`.txt-progress.${game?.name}`, "");
        document
          .querySelector(`.total-bar.${game?.name}`)
          .style.setProperty("width", "100%");
        startButton.removeEventListener("click", handleInstallClick);
        startButton.removeEventListener("click", handlePatchClick);
        startButton.addEventListener("click", async () => {
          const gameFolder = isDevelopment ? `${currentDir}\\${game.name}` : `${currentDir}\\${game.name}`;

          // Pre-launch Anti-Tamper SHA-256 integrity check against manifest
          if (game.manifest && typeof game.manifest === "object" && Object.keys(game.manifest).length > 0) {
            showText(`.txt-status.${game?.name}`, "Verificando integridad Anti-Tamper...");
            const { verifyIntegrity } = require("./utils/verifyIntegrity");
            const integrityResult = await verifyIntegrity(gameFolder, game.manifest, (progress) => {
              showText(`.txt-status.${game?.name}`, `Anti-Tamper Check: ${progress.percent}%`);
            });

            if (!integrityResult.valid) {
              console.warn("Anti-Tamper check failed for modified files:", integrityResult.corruptedFiles);
              showText(`.txt-status.${game?.name}`, getTranslatedText("installationCorrupted") || "Archivos alterados detectados");
              showText(`.btn-start.${game?.name}`, getTranslatedText("repair") || "Reparar");
              showText(`.btn-start.disabled.${game?.name}`, getTranslatedText("repair") || "Reparar");
              showError("Anti-Tamper: Se detectaron archivos del juego modificados o corruptos. Haz clic en Reparar para solucionar.");
              await repairGame(game, setIsUpdating);
              return;
            }
          }

          if (!isGameValid()) {
            showError(getTranslatedText("errorLaunching"));
            await repairGame(game, setIsUpdating);
            return;
          }

          // Read language and voice pack configuration
          const configLocalPath = isDevelopment
            ? CONFIG.FILE_NAME
            : `${currentDir}\\${CONFIG.FILE_NAME}`;
          const configData = await fsPromises.readFile(configLocalPath, "utf8");
          const config = JSON.parse(configData);
          const selectedLanguage = config.selectedLanguage || CONFIG.DEFAULT_LANGUAGE;
          const currentGame = config.games?.find(g => g.name === game.name);
          const selectedVoicePack = currentGame?.selectedVoicePack || CONFIG.DEFAULT_VOICE_PACK;
          
          let languageParam = selectedLanguage;
          if (selectedVoicePack && selectedVoicePack !== '') {
            languageParam = `${selectedLanguage}_${selectedVoicePack}`;
          }

          // Launch securely using Crypto Token IPC
          const launchGameSecureFn = (window.electronAPI && window.electronAPI.launchGameSecure)
            ? window.electronAPI.launchGameSecure
            : (params) => ipcRenderer.invoke("launch-game-secure", params);

          const launchResult = await launchGameSecureFn({
            gameFolder,
            startCmd: game.startCmd,
            gameName: game.name,
            languageParam
          });

          if (!launchResult.success) {
            showError(`Error al iniciar el juego: ${launchResult.error}`);
          }
        });
      }
    };

    // Remove any existing listeners first to prevent duplicates
    ipcRenderer.removeAllListeners("download progress");
    ipcRenderer.removeAllListeners("download error");
    
    ipcRenderer.on("download progress", (event, status) => {
      // Get the appropriate start time for this game
      const clientStartTime = downloadStartTimes[`${game.name}_client`];
      const patchStartTime = downloadStartTimes[`${game.name}_patch`];
      const currentStartTime = clientStartTime || patchStartTime || Date.now();
      showDownloadProgress(game, status, currentStartTime);
    });

    ipcRenderer.on("download error", () => {
      showError(getTranslatedText("errorDownloadingFile"));
    });

    await init();
};

export const repairGame = async (game, setIsUpdating) => {
    const currentDir = ipcRenderer.sendSync("get-file-path", "");
    const configLocalPath = isDevelopment
      ? CONFIG.FILE_NAME
      : `${currentDir}\\${CONFIG.FILE_NAME}`;

    await updateConfigJson(
      "games",
      { name: game.name, clientVer: 0, patchVer: 0 },
      configLocalPath
    );

    const gameFolder = `${currentDir}\\${game.name}`;
    try {
      await fsPromises.rm(gameFolder, { recursive: true, force: true });
    } catch (e) {
      // Ignore if folder cleanup fails
    }

    await gamesPatch(game, setIsUpdating);
};

