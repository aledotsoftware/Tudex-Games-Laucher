const path = require("path");
const fs = require("fs");
const isDevelopment = process.env.NODE_ENV !== "production";
let mainWindow;

const createMainWindow = () => {
  const isAdmin = process.env.APP_MODE === "admin" || process.argv.includes("--admin");
  const title = isAdmin ? "Tudex Patch Studio (Admin)" : "Tudex Games Launcher";

  let preloadPath = path.join(__dirname, "preload.js");
  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.resolve(process.cwd(), "src", "main", "preload.js");
  }

  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    width: isAdmin ? 1040 : 800,
    height: isAdmin ? 700 : 600,
    frame: true,
    fullscreenable: isAdmin,
    maximizable: isAdmin,
    resizable: isAdmin,
    title: title,
    backgroundColor: isAdmin ? "#0b0c0e" : "#222",
  });

  const query = isAdmin ? "?mode=admin" : "";

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.loadURL(
      `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}${query}`
    );
  } else {
    mainWindow.loadURL(`file://${__dirname}/index.html${query}`);
  }

  mainWindow.setMenuBarVisibility(false);

  return mainWindow;
};

module.exports = createMainWindow;
