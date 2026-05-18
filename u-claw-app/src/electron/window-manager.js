import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import {  getWechatManagerInstance } from "./plugin/wechat-init.js";
import { APP_NAME, IS_DEV,RENDER_PORT,GATEWAY_DEFAULT_PORT } from './utils/env.js';

let mainWindow = null;
let splashWindow = null;
let tray = null;

const logoPath = IS_DEV
  ? path.join(app.getAppPath(), 'src', 'assets', 'logo.png')
  : path.join(import.meta.dirname, '..', 'assets', 'logo.png');

const splashHTML = `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:rgba(15,23,42,0.95);border-radius:16px;font-family:system-ui;color:white;flex-direction:column;border:1px solid #2A3040;overflow:hidden;">
  <img src="file://${logoPath}" style="width:60px;height:60px;margin-bottom:12px;border-radius:8px" />
  <div style="-webkit-text-fill-color: transparent;font-size:24px;font-weight:bold;margin-bottom:18px;background: linear-gradient(135deg, #ff6b35, #ff8f65);background-clip: text;">OpenClawPro</div>
  <div id="status" style="font-size:22px;color:#94a3b8;text-align:center;padding:0 20px">Loading...</div>
  <div id="progress" style="width:200px;height:4px;background:#334155;border-radius:2px;margin-top:12px;overflow:hidden;display:none">
    <div id="bar" style="width:0%;height:100%;background:#3b82f6;border-radius:2px;transition:width 0.3s"></div>
  </div>
</body></html>`;

export function createSplash() {
  splashWindow = new BrowserWindow({
    width: 560, height: 440, frame: false, transparent: true,
    alwaysOnTop: true, resizable: false, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity:false },
  });
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
  splashWindow.center();
}

export function updateSplash(text, percent) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.webContents.executeJavaScript(`
    ${text !== null ? `document.getElementById('status').innerText = ${JSON.stringify(text)};` : ''}
    ${percent !== undefined ? `
      document.getElementById('progress').style.display = 'block';
      document.getElementById('bar').style.width = '${percent}%';
    ` : ''}
  `).catch(() => {});
}

export function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
}

export function navigateTo(route) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('[navigateTo] mainWindow is null or destroyed');
    return;
  }

  if (IS_DEV) {
    const url = `http://localhost:${RENDER_PORT}${route}`;
    console.log('[navigateTo] DEV: loading', url);
    mainWindow.loadURL(url);
  } else {
    // 生产模式：使用 hash 路由
    const indexPath = path.join(import.meta.dirname, '..', 'assets', 'main', 'index.html');
    const hashUrl = `file://${indexPath}#${route}`;
    console.log('[navigateTo] PROD: loading', hashUrl);
    mainWindow.loadURL(hashUrl);
  }
}

export function loadActivationPage() {
  if (!mainWindow) {
    console.warn('[loadActivationPage] mainWindow is null');
    return;
  }
  // 单窗口模式：加载主应用，通过路由切换到激活页面
  if (IS_DEV) {
    mainWindow.loadURL(`http://localhost:${RENDER_PORT}/main/index.html#/activate`);
  } else {
    const indexPath = path.join(import.meta.dirname, '..', 'assets', 'main', 'index.html');
    console.log('[loadActivationPage] PROD: loading', indexPath);
    mainWindow.loadFile(indexPath, { hash: '/activate' });
  }
}

export function loadConfigPage() {
  if (!mainWindow) {
    console.warn(`加载主页面 skipped: mainWindow is null`);
    return;
  }
 
  const indexPath = IS_DEV
    ? `http://localhost:${RENDER_PORT}/main/index.html`
    : path.join(path.join(import.meta.dirname, '..', 'assets', 'main', 'index.html'));

  if (IS_DEV) {
    mainWindow.loadURL(indexPath);
  } else {
    console.log(`Loading built app: ${indexPath}`);
    try {
      mainWindow.loadFile(indexPath);
      console.log(`loadFile completed`);
    } catch (err) {
      console.error(`loadFile failed:`, err);
    }
  }
}

export function safeSend(channel, data) {
  try {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  } catch { /* window already gone */ }
}

export function sendBootPhase(phase, title, detail, progress) {
  safeSend('gateway-boot-phase', { phase, title, detail, progress });
}

export function sendGatewayStatus(running, errorMsg="",) {
  safeSend('gateway-status', { running, errorMsg, port:GATEWAY_DEFAULT_PORT });
}

export function sendGatewayLog(type, msg) {
  safeSend('gateway-log', { type, msg });
}



export function createWindow(gateway) {

  function createTray() {
    try {
      // 使用 app 图标作为托盘图标
      const iconPath = IS_DEV
        ? path.join(app.getAppPath(), 'src', 'assets', 'logo.png')
        : path.join(import.meta.dirname, '..', 'assets', 'logo.png');

      const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
      tray = new Tray(trayIcon);
      tray.setToolTip(APP_NAME);

      const contextMenu = Menu.buildFromTemplate([
        {
          label: '📱 打开面板',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: '❌ 完全退出',
          click: () => {
            app.isQuitting = true;
            gateway.stopGatewaySync();
            getWechatManagerInstance()?.destroy();
            app.quit();
          }
        }
      ]);

      tray.setContextMenu(contextMenu);

      // 双击托盘图标显示窗口
      tray.on('double-click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } catch (e) {
      console.warn('[tray] 创建托盘失败:', e);
    }
  }
  console.log("创建window===>")
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    maximizable: false,
    frame: false,
    icon: IS_DEV
      ? path.join(app.getAppPath(), 'src', 'assets', 'icon.png')
      : path.join(app.getAppPath(), 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(import.meta.dirname, '..', 'preload', 'index.js'),
      devTools: IS_DEV,
    },
    show: false,
    backgroundColor: '#0a0a0a',
  });

  // 创建系统托盘
  createTray();

  // 点击关闭时隐藏到托盘，而不是退出
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('did-start-loading', () => {
    console.log(`Page started loading`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`Page finished loading`);
  });

  // 渲染进程通知窗口可以显示了（Vue 挂载完成）
  ipcMain.on('window-ready', () => {
    console.log(`Window ready from renderer, closing splash and showing`);
    closeSplash();
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
    console.error(`Page failed to load: ${errorDesc} (code=${errorCode})`);
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (tray) {
      tray.destroy();
      tray = null;
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

export function getMainWindow() {
  return mainWindow;
}

export function isWin(){
  return process.platform === "win32";
}
 