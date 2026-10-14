// Questline's desktop app: Electron's "main process", the program that runs
// first when you open Questline.
//
// It starts Questline's own server quietly in the background (the same
// Next.js app you run with `npm run dev`, packaged into desktop-build/server),
// shows it in a window, and keeps a tray icon by the clock. Closing the window
// hides Questline to the tray instead of quitting, so it can keep running
// (the screen-time tracker in step 10 needs that).
//
//   npm run app:dev    window around the dev server (run `npm run dev` too)
//   npm run app:start  the real packaged server, without installing
//   npm run app:dist   build the Questline Setup .exe installer

import { app, BrowserWindow, dialog, Menu, nativeImage, shell, Tray } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

// `--dev-url=http://localhost:3000` points the window at the dev server instead.
const devUrl = process.argv.find((arg) => arg.startsWith("--dev-url="))?.split("=")[1];

// Installed: next to the app in resources/. Not installed: in the project folder.
const resources = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "desktop-build");
const serverDir = path.join(resources, "server");
const trayIcon = app.isPackaged ? path.join(process.resourcesPath, "tray.png") : path.join(app.getAppPath(), "electron", "tray.png");
const appIcon = app.isPackaged ? undefined : path.join(app.getAppPath(), "build", "icon.png");

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let server: ChildProcess | null = null;
let appUrl = "";
let quitting = false;
let toldAboutTray = false;

// Opening Questline twice just brings the existing window forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showWindow);
  app.whenReady().then(start);
}

async function start() {
  Menu.setApplicationMenu(null);
  createTray();
  createWindow();

  try {
    appUrl = devUrl ?? (await startServer());
    await waitForServer(appUrl);
    await win?.loadURL(appUrl);
  } catch (error) {
    dialog.showErrorBox(
      "Questline couldn't start",
      `${error instanceof Error ? error.message : String(error)}\n\nDetails are in ${logFile()}`,
    );
    quit();
  }
}

/** Starts the packaged Next.js server on a free port, keeping your data in your user folder. */
async function startServer() {
  // The launcher runs server.js and stops it if this app ever goes away.
  const launcher = path.join(serverDir, "questline-launcher.cjs");
  if (!fs.existsSync(launcher)) {
    throw new Error("The Questline server is missing. Run `npm run app:build:server` first.");
  }

  const port = await freePort();
  const log = fs.createWriteStream(logFile(), { flags: "w" });

  // process.execPath is Electron itself; ELECTRON_RUN_AS_NODE makes it behave
  // like plain Node.js, so people don't need Node installed to use Questline.
  server = spawn(process.execPath, [launcher], {
    cwd: serverDir,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"], // stdin stays open while the app runs
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1", // only this computer can reach it
      QUESTLINE_DATA_DIR: app.getPath("userData"), // e.g. C:\Users\you\AppData\Roaming\Questline
      QUESTLINE_MIGRATIONS_DIR: path.join(serverDir, "drizzle"),
    },
  });
  server.stdout?.pipe(log);
  server.stderr?.pipe(log);
  server.on("exit", (code) => {
    server = null;
    if (!quitting) {
      dialog.showErrorBox("Questline stopped", `The Questline server exited (code ${code}).\n\nDetails are in ${logFile()}`);
      quit();
    }
  });

  return `http://127.0.0.1:${port}`;
}

/** Asks the operating system for a port nobody is using. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

/** Waits until the server answers, for up to 30 seconds. */
async function waitForServer(url: string) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("The Questline server didn't start in time.");
}

function logFile() {
  const dir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "server.log");
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Questline",
    icon: appIcon,
    backgroundColor: "#0b0b0d", // --ink, so there's no white flash while loading
    webPreferences: {
      // The page is a normal web page: no access to Node.js or your files.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(LOADING_PAGE)}`);

  // Links to other websites open in your normal browser, not inside Questline.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (appUrl && !url.startsWith(appUrl)) {
      event.preventDefault();
      openExternal(url);
    }
  });

  // Closing the window hides Questline to the tray instead of quitting.
  win.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    win?.hide();
    if (!toldAboutTray) {
      toldAboutTray = true;
      tray?.displayBalloon({
        title: "Questline is still running",
        content: "It's in the tray by the clock. Right-click the icon to quit.",
        iconType: "info",
      });
    }
  });
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(trayIcon));
  tray.setToolTip("Questline");
  tray.on("click", showWindow);
  // The menu is built fresh on each right-click, so it shows whether tracking is on.
  tray.on("right-click", async () => {
    const tracking = await trackerApi();
    tray?.setToolTip(tracking?.state === "tracking" ? "Questline · tracking screen time" : "Questline");
    tray?.popUpContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Questline", click: showWindow },
        { type: "separator" },
        tracking?.state === "tracking"
          ? { label: "Pause screen-time tracking", click: () => setTracking(false) }
          : { label: "Start screen-time tracking", click: () => setTracking(true), enabled: tracking !== null && tracking.state !== "unsupported" },
        { type: "separator" },
        { label: "Quit Questline", click: quit },
      ]),
    );
  });
}

type TrackerState = { state: "off" | "tracking" | "unsupported" | "error" };

/** Asks Questline's server about the tracker (or changes it). null if the server isn't up yet. */
async function trackerApi(tracking?: boolean): Promise<TrackerState | null> {
  if (!appUrl) return null;
  try {
    const res = await fetch(`${appUrl}/api/tracker`, {
      method: tracking === undefined ? "GET" : "POST",
      // The server only accepts tracker requests carrying this header.
      headers: { "x-questline": "1", "content-type": "application/json" },
      body: tracking === undefined ? undefined : JSON.stringify({ tracking }),
    });
    return res.ok ? ((await res.json()) as TrackerState) : null;
  } catch {
    return null;
  }
}

async function setTracking(on: boolean) {
  await trackerApi(on);
  // If the Time page is open, reload it so it shows the new state.
  if (win?.webContents.getURL().includes("/time")) win.webContents.reload();
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function openExternal(url: string) {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
}

function quit() {
  quitting = true;
  app.quit();
}

app.on("before-quit", () => {
  quitting = true;
});
app.on("will-quit", () => {
  server?.kill();
});

const LOADING_PAGE = `<!doctype html>
<html><head><title>Questline</title><style>
  body { margin: 0; height: 100vh; display: grid; place-items: center; background: #0b0b0d;
         color: #f3ecdb; font: 14px ui-monospace, monospace; }
  p { letter-spacing: 0.2em; text-transform: uppercase; }
  span { color: #f7c535; }
</style></head><body><p>Starting <span>Questline</span>...</p></body></html>`;
