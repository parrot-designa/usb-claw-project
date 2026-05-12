import { app } from 'electron';
import { getMainWindow } from './window-manager.js';

function setupLifecycle({ getGateway }) { 
  // ============================================================
  // 窗口全部关闭事件
  // macOS 特性：关闭所有窗口不会退出应用，只有 Cmd+Q 或 dock 点击退出才会触发 before-quit
  // ============================================================
  app.on('window-all-closed', () => {
    const mainWindow = getMainWindow();
    console.log(`所有窗口已关闭，app.isQuitting=`, app.isQuitting, 'activationSucceeded=', app.activationSucceeded, 'mainWindow=', !!mainWindow);

    // 如果主窗口存在，说明是主窗口关闭，应该 quit
    if (mainWindow) {
      if (process.platform !== 'darwin') {
        app.quit();
      }
      return;
    }

    // 如果主窗口不存在且激活未成功，说明是激活窗口被用户关闭，quit
    if (!app.activationSucceeded) {
      if (process.platform !== 'darwin') {
        app.quit();
      }
      return;
    }

    // 主窗口不存在但激活已成功，说明是激活成功后的激活窗口关闭，不 quit（主窗口会在激活完成后创建）
    console.log(`激活成功后的窗口关闭，不退出应用`);
  });

  // ============================================================
  // 应用退出前事件
  // Cmd+Q、菜单退出、或其他代码调用 app.quit() 时触发
  // ============================================================
  app.on('before-quit', async () => {
    console.log(`应用退出前事件触发`);
    app.isQuitting = true; // 标记为主动退出
    await getGateway().stopGateway(); // 停止 Gateway 进程
    // 注意：不要在这里调用 app.quit()，这会导致重复调用
    // app.quit() 已经在 window-all-closed 或其他调用处触发
  });

  // ============================================================
  // macOS Dock 图标点击事件
  // 点击 Dock 图标时触发，可能是首次打开（无窗口）或有窗口被隐藏
  // ============================================================
  app.on('activate', async () => {

  });
}

export { setupLifecycle };