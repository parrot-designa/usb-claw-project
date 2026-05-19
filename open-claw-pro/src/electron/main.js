import { app, Menu } from 'electron';
import { execSync } from 'child_process'; 
import { ensureOpenClawDirectories,getLocalBase,extractRuntime } from './paths.js';
import { APP_NAME, GATEWAY_DEFAULT_PORT, IS_DEV } from './utils/env.js';
import { createGatewayManager } from './gateway.js';
import { setupLifecycle } from './lifecycle.js';
import { createWindow, getMainWindow, createSplash,updateSplash, loadActivationPage, isWin } from './window-manager.js';
import { registerIPCHandlers,registerWechatIPCHandler } from './register-ipc-handlers.js';
import { initWechat } from "./plugin/wechat-init.js";

// ============================================================
// Electron 主进程启动入口
// ============================================================

// 单实例锁：防止多开导致端口冲突
if (!app.requestSingleInstanceLock()) {
  console.log('[startup] another instance is running, quitting...');
  app.quit();
}else{
  app.on('second-instance', () => {
    // 已有实例运行时，聚焦已有窗口
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}



app.whenReady().then(async () => {
  console.log('[DEBUG] App ready, creating window...');
  if (isWin()) {
    try {
      console.log("finding OpenClawPro start")
      // Find and kill any node.exe running openclaw gateway on our port
      const result1 = execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq OpenClawPro*" 2>nul', { stdio: 'ignore' });
      console.log("finding OpenClawPro end",result1)
    } catch(e) { /* no orphans, that's fine */ console.log("finding OpenClawPro error",e)}
    try {
      console.log("finding port start")
      // 查找占端口的进程，findstr 没匹配时返回 exit 1，execSync 会抛异常
      const netstat = execSync(`netstat -ano | findstr :${GATEWAY_DEFAULT_PORT} | findstr LISTENING`, { encoding: 'utf-8', shell: true });
      console.log("finding port result", netstat)
      const pid = netstat.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        execSync(`taskkill /f /pid ${pid} 2>nul`, { stdio: 'ignore' });
        console.log(`[startup] killed orphaned process on port ${GATEWAY_DEFAULT_PORT} (pid ${pid})`);
      }
      console.log("finding port end")
    } catch(e) {
      // findstr 没找到匹配 → 端口未被占用，正常情况
      if (e.status === 1 && e.stdout === '') {
        console.log(`[startup] port ${GATEWAY_DEFAULT_PORT} is free`);
      } else {
        console.error("finding port error", e.message);
      }
    }
  }

  createSplash();

  updateSplash('正在启动...'); 

  // 创建 Gateway Manager（必须在最前面，因为其他组件依赖它）
  const gateway = createGatewayManager();

  // 禁用原生菜单栏，仅打包后生效（开发模式保留菜单方便调试）
  if (!IS_DEV) {
    Menu.setApplicationMenu(null);
  }

  app.isQuitting = false;

  // 第0步：注册 IPC 通信处理器（最早注册以便渲染进程通信）
  registerIPCHandlers({ gateway });

  // ============================================================
  // App 生命周期事件监听（在 gateway 创建后才能设置）
  // ============================================================
  setupLifecycle({ getGateway: () => gateway }); 
 
  updateSplash('正在清理旧程序...', 4); 

  await extractRuntime();

  await ensureOpenClawDirectories();
 
  updateSplash('正在加载微信插件...',80);

  registerWechatIPCHandler({ gateway });

  updateSplash('正在加载界面...',100);

   // 第1步：创建主窗口
  createWindow(gateway); 
  
  // 第2步：加载激活页面
  loadActivationPage(); 
});