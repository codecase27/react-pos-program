const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// ── Data folder: next to exe in production, in project root in dev ──
const dataDir = app.isPackaged
  ? path.join(path.dirname(app.getPath("exe")), "data")
  : path.join(__dirname, "../data");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const filePath = (key) => path.join(dataDir, `${key}.json`);

// ── IPC handlers ──
ipcMain.handle("storage-get", (_, key) => {
  try {
    const file = filePath(key);
    if (!fs.existsSync(file)) return null;
    return { value: fs.readFileSync(file, "utf-8") };
  } catch { return null; }
});

ipcMain.handle("storage-set", (_, key, value) => {
  try { fs.writeFileSync(filePath(key), value, "utf-8"); } catch {}
});

// ── Window ──
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = app.isPackaged
    ? `file://${path.join(__dirname, "../build/index.html")}`
    : "http://localhost:3000";

  win.loadURL(url);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
