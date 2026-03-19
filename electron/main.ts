import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './services/db';
import { registerGitHubHandlers } from './ipc/github';
import { registerReviewHandlers } from './ipc/reviews';
import { registerSettingsHandlers } from './ipc/settings';
import { registerStackHandlers } from './ipc/stack';
import { registerFeedbackHandlers } from './ipc/feedback';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // In dev, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  getDatabase();

  // Register IPC handlers
  registerGitHubHandlers();
  registerReviewHandlers(() => mainWindow);
  registerSettingsHandlers();
  registerStackHandlers();
  registerFeedbackHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
