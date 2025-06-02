const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
		nodeIntegration: true,
		contextIsolation: false
	},
  })

  if (app.isPackaged) {
      // Load from file when packaged
      //win.loadFile(path.join(__dirname, '../dist/index.html'));
	  win.loadFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
    } else {
      // Load from dev server during development
      win.loadURL('http://localhost:5173');
    }
}

app.whenReady().then(() => {
  createWindow()
})
