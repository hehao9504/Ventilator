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
    const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');
    console.log('🔍 Loading production index.html from:', indexPath);
    win.loadFile(indexPath).catch(err => {
      console.error('❌ Failed to load index.html:', err);
    });
  } else {
    console.log('🛠️ Loading development server at http://localhost:5173');
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools(); // optional: open DevTools for debugging
  }
}

app.whenReady().then(() => {
  console.log('✅ App is ready');
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
