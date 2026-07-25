import { ipcRenderer } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { showError } from "./utils/showError";
import { addCacheBustingSuffix } from "./utils/addCacheBustingSuffix";
import { showText } from "./utils/showText";
import { updateConfigJson } from "./utils/updateConfigJson";
import { getFileNameFromUrl } from "./utils/getFileNameFromUrl";
import { getTranslatedText } from "./utils/getTranslatedText";
import { CONFIG, LAUNCHER } from "../constants";

const isDevelopment = process.env.NODE_ENV !== "production";

export const initialSetup = async (configLocal, configRemote) => {
    const currentDir = ipcRenderer.sendSync("get-file-path", "");
    const configLocalPath = isDevelopment
      ? CONFIG.FILE_NAME
      : `${currentDir}\\${CONFIG.FILE_NAME}`;

    const replaceScriptPath = `${currentDir}\\${LAUNCHER.UPDATE_BATCH_FILE}`;
    const currentExeName = path.basename(process.execPath);

    const updateLauncher = () => {
      return new Promise((resolve, reject) => {
        if (
          configRemote?.launcherVer > configLocal?.launcherVer &&
          configRemote?.launcherUrl &&
          !isDevelopment
        ) {
          const launcherFileName = getFileNameFromUrl(configRemote.launcherUrl) || "launcher.exe";
          const launcherNew = `${launcherFileName}${LAUNCHER.NEW_SUFFIX}`;
          const launcherNewPath = `${currentDir}\\${launcherNew}`;

          const initialText = `${getTranslatedText("downloadingLauncher")}... (0%)`;
          showText(".initial-setup-text", initialText);

          if (fs.existsSync(launcherNewPath)) {
            try { fs.unlinkSync(launcherNewPath); } catch (e) { /* ignore */ }
          }

          const progressHandler = (event, status) => {
            if (status && status.percent !== undefined) {
              const percent = Math.round(status.percent * 100);
              const transferredMB = ((status.transferredBytes || 0) / (1024 * 1024)).toFixed(1);
              const totalMB = ((status.totalBytes || 0) / (1024 * 1024)).toFixed(1);
              showText(
                ".initial-setup-text",
                `${getTranslatedText("downloadingLauncher")} (${percent}%) - ${transferredMB}MB / ${totalMB}MB`
              );
              const fillBar = document.querySelector(".initial-setup-bar-fill");
              if (fillBar) {
                fillBar.style.width = `${percent}%`;
              }
            }
          };

          ipcRenderer.on("download progress", progressHandler);

          ipcRenderer.send("download", {
            url: addCacheBustingSuffix(configRemote?.launcherUrl),
            options: {
              directory: currentDir,
              filename: `${launcherNew}`,
              step: "launcher",
            },
          });

          ipcRenderer.on("download launcher complete", () => {
            ipcRenderer.removeListener("download progress", progressHandler);
            updateConfigJson(
              "launcherVer",
              configRemote.launcherVer,
              configLocalPath
            );
            replaceExecutable(launcherNew);
          });

          ipcRenderer.on("download error", () => {
            ipcRenderer.removeListener("download progress", progressHandler);
            reject(getTranslatedText("errorDownloadingFile"));
          });
        } else {
          showText(".initial-setup-text", getTranslatedText("launcherUpdated"));
          document
            .querySelector(".initial-setup")
            .style.setProperty("display", "none");
          resolve(true);
        }
      });
    };

    const replaceExecutable = (launcherNew) => {
      const targetExeName = currentExeName && currentExeName.endsWith(".exe") 
        ? currentExeName 
        : LAUNCHER.EXECUTABLE_NAME;

      const replaceScriptContent = `
      @echo off
      setlocal
      set currentDir=%~dp0
      set launcherExe=%currentDir%${targetExeName}
      set newLauncher=%currentDir%${launcherNew}
    
      timeout /T 1 /NOBREAK >NUL

      taskkill /IM "${targetExeName}" /F >nul 2>&1
    
      :waitLoop
      tasklist /FI "IMAGENAME eq ${targetExeName}" 2>NUL | find /I "${targetExeName}" >NUL
      if not errorlevel 1 (
          timeout /T 1 /NOBREAK >NUL
          goto waitLoop
      )
    
      del /F /Q "%launcherExe%" >nul 2>&1
      move /Y "%newLauncher%" "%launcherExe%" >nul 2>&1
      start "" "%launcherExe%" >nul 2>&1
      del /F "%~f0" >nul 2>&1
      exit /b
      `;

      if (fs.existsSync(replaceScriptPath)) {
        try { fs.unlinkSync(replaceScriptPath); } catch (e) { /* ignore */ }
      }
      fs.writeFileSync(replaceScriptPath, replaceScriptContent, "utf8");

      spawn(`start /min cmd.exe /C "${replaceScriptPath}"`, {
        detached: true,
        shell: true,
      });
      ipcRenderer.send("close-app");
    };

    try {
      return await updateLauncher();
    } catch (e) {
      showError(e);
      return false;
    }
};
