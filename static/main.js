const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,  // Initial width
    height: 1080,  // Initial height
    fullscreen: false,  // Ensure the window is not in fullscreen
    frame: false,  // Make the window borderless
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'img/logo.png'),
    alwaysOnTop: false,  // This ensures other windows can appear on top
    focusable: true      // Allows focus to shift to other windows
  });

  // Maximize the window after creation
  mainWindow.maximize();

  // Disable cache by setting cache headers and clearing the session cache
  session.defaultSession.clearCache(() => {
    console.log('Cache cleared.');
  });

  // Load the HTML page served by your Python HTTP server
  mainWindow.loadURL('http://127.0.0.1:5000/home');  // Ensure this is the correct URL for the 'home' endpoint

  // Reload the window when it gets focus to ensure fresh content
  mainWindow.on('focus', () => {
    mainWindow.reload(); // Force a reload on focus
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});