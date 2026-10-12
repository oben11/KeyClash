// Electron "main process": the little Node program that makes the desktop app.
// It starts the same game server used by `npm start`, then opens windows that
// show the website from that server. Each window is a separate player, so
// File > New Window gives you a second player for testing.
import { app, BrowserWindow, Menu, clipboard, shell } from 'electron';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let server; // { port, close } returned by startServer()

function openWindow() {
  const win = new BrowserWindow({ width: 1000, height: 720, minWidth: 480, minHeight: 520, backgroundColor: '#1c1f2a' });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL(`http://localhost:${server.port}`);
}

// Your address on the local network, so friends can open the game in their browser.
function lanAddress() {
  const ip = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  return `${ip ?? 'localhost'}:${server.port}`;
}

app.whenReady().then(async () => {
  // server-dist/server.cjs is created by `npm run build:server`
  const { startServer } = require(path.join(root, 'server-dist', 'server.cjs'));
  server = await startServer({ port: 3001, distDir: path.join(root, 'dist') });

  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Game',
      submenu: [
        { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: openWindow },
        { label: 'Copy LAN Address', click: () => clipboard.writeText(lanAddress()) },
      ],
    },
    { role: 'editMenu' }, // needed for copy/paste shortcuts on macOS
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ]));

  openWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); }); // Dock click on macOS
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => server?.close());
