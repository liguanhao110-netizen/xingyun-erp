const { app, BrowserWindow } = require('electron');
const path = require('path');

// 屏蔽安全警告，因为我们是一个内部工具
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Nebula ERP V14.0",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // 允许跨域加载 CDN 资源
    },
    autoHideMenuBar: true // 隐藏默认菜单栏，让界面更像原生APP
  });

  // 生产环境：加载打包后的 index.html
  // 开发环境：通常加载 http://localhost:5173，但这里为了打包逻辑，我们统一指向 dist
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    // 如果你在本地开发调试，可以临时改成 loadURL('http://localhost:5173')
    // 但为了生成 EXE，我们默认让他加载文件
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
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