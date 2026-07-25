const { contextBridge, ipcRenderer } = require("electron");

/**
 * Secure Preload Bridge for Electron with contextIsolation: true.
 * Exposes controlled IPC methods to the React frontend.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // Hash & Security Functions
  verifyFileHash: (filePath) => ipcRenderer.invoke("verify-file-hash", filePath),
  launchGameSecure: (params) => ipcRenderer.invoke("launch-game-secure", params),

  // File system & Dialogs
  getFilePath: () => ipcRenderer.sendSync("get-file-path", ""),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  loadStudioSettings: () => ipcRenderer.invoke("load-studio-settings"),
  saveStudioSettings: (settings) => ipcRenderer.invoke("save-studio-settings", settings),

  // IPC Communication
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendSync: (channel, data) => ipcRenderer.sendSync(channel, data),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, func) => {
    const subscription = (event, ...args) => func(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  once: (channel, func) => {
    ipcRenderer.once(channel, (event, ...args) => func(event, ...args));
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
