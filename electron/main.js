const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 屏蔽安全警告，因为我们是一个内部工具
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 定义数据存储路径：用户的 AppData/Roaming/Nebula ERP/nebula_db.json
const DB_PATH = path.join(app.getPath('userData'), 'nebula_db.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Nebula ERP V14.0",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 允许渲染进程直接使用 node 模块
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

// --- 新增：数据持久化 IPC 监听 ---

// 1. 读取数据
ipcMain.handle('load-db', async () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return null; // 文件不存在，返回空
  } catch (err) {
    console.error('Failed to load DB:', err);
    return null;
  }
});

// 2. 保存数据
ipcMain.handle('save-db', async (event, data) => {
  try {
    // 确保是字符串
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    fs.writeFileSync(DB_PATH, jsonStr, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save DB:', err);
    return { success: false, error: err.message };
  }
});

// 3. 清空数据
ipcMain.handle('clear-db', async () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --------------------------------

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