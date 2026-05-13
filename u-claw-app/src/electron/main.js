import { app, Menu } from 'electron';
import { execSync } from 'child_process';
import { waitForActivation } from './activation.js';
import { ensureOpenClawDirectories,getLocalBase,extractRuntime } from './paths.js';
import { APP_NAME, GATEWAY_DEFAULT_PORT, IS_DEV } from './utils/env.js';
import { createGatewayManager } from './gateway.js';
import { setupLifecycle } from './lifecycle.js';
import { createWindow, getMainWindow, createSplash,updateSplash, loadActivationPage } from './window-manager.js';
import { ensurePlugins } from './js/plugin.js'; 
import { registerIPCHandlers,registerWechatIPCHandler } from './register-ipc-handlers.js';
import { initWechat } from "./plugin/wechat-init.js";


// ============================================================
// Electron 主进程启动入口
// ============================================================
app.whenReady().then(async () => {  

  if (process.platform === 'win32') {
    try {
      // Find and kill any node.exe running openclaw gateway on our port
      execSync('taskkill /f /im node.exe /fi "WINDOWTITLE eq OpenClawPro*" 2>nul', { stdio: 'ignore' });
    } catch { /* no orphans, that's fine */ }
    try {
      // Also try killing by port
      const netstat = execSync(`netstat -ano | findstr :${GATEWAY_DEFAULT_PORT} | findstr LISTENING`, { encoding: 'utf-8' });
      const pid = netstat.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        execSync(`taskkill /f /pid ${pid} 2>nul`, { stdio: 'ignore' });
        console.log(`[startup] killed orphaned process on port ${GATEWAY_DEFAULT_PORT} (pid ${pid})`);
      }
    } catch { /* port not in use, good */ }
  }

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

  // 第1步：创建主窗口
  createWindow();

  // 第2步：加载激活页面
  loadActivationPage();

  // 第3步：等待激活完成（带60秒超时保护）
  await Promise.race([
    waitForActivation(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('激活超时（60秒）')), 60000))
  ]).catch((err) => {
    console.error('[启动] 激活失败:', err.message);
    app.exit(1);
  });

  createSplash();

  updateSplash('正在启动...'); 

  updateSplash('正在清理旧程序...', 4); 

  await extractRuntime();

  await ensureOpenClawDirectories();

  await ensurePlugins();

  updateSplash('正在加载微信插件...',80);

  registerWechatIPCHandler({ gateway });

  updateSplash('正在加载界面...',100);
});