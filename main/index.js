import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { app, BrowserWindow } from 'electron';
import { registerIPCHandlers } from './ipc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#08080a',
    title: 'LE-RAY',
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

//review: this is what we did here: index.js is where the app starts when you run npm start.
//It loads your api keys from the .env file, sets up the list of jobs the window is allowed
//to ask for, then opens the window itself and points it at the page in the renderer folder.
//The two webPreferences lines are the security settings: they stop the page from reaching
//the file system directly and force everything to go through preload.cjs instead. The two
//app.on lines at the bottom are normal desktop behaviour. On a Mac, closing the last window
//does not quit the app, and clicking the dock icon afterwards opens a fresh one.
