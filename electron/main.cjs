const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.loadFile('dist/index.html') // 这里加载的是你 Vite 构建后的文件
}

app.whenReady().then(() => {
  createWindow()
})
