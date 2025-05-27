// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
    // Send a message to the main process
    sendMessage: (channel, data) => {
        let validChannels = ['focus-in', 'focus-out', 'shutdown'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    // Receive messages from the main process
    onReceiveMessage: (channel, func) => {
        let validChannels = ['message-channel', 'app-event'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    // Function to clear cache
    clearCache: () => ipcRenderer.invoke('clear-cache'),
});