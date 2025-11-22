const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

// Disable hardware acceleration to fix GPU errors on Linux/Raspberry Pi
app.disableHardwareAcceleration();

// Add command line switches for better compatibility
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('use-gl', 'swiftshader');

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
      webSecurity: true,
      // Disable hardware acceleration for compatibility with systems that have GPU issues
      hardwareAcceleration: false,
      offscreen: false
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

// Handle close window request from renderer
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

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