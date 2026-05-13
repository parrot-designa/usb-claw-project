/**
 * P-Claw 激活模块
 * 处理 USB 绑定激活逻辑
 */
import { app, BrowserWindow } from 'electron'; 
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { apiRequest } from './api-node.js';
import { getAppDriveInfo } from './utils/usbSerial.js'; 
import { 
  getLicensePath,
  writeLicenseFile,
  getAppRoot
} from './paths.js';
import { runtimeStore } from './utils/runtime-store.js';
import { RENDER_PORT, IS_DEV } from './utils/env.js'; 

// ── State ──
let startupResolver = null;

// ── USB 检测 ──

/**
 * 检测当前应用是否在U盘中运行，并获取U盘序列号
 * @returns {Promise<{ isOnUSB: boolean, serial: string|null, path: string }>}
 */
async function detectUSBStatus() {
  const info = await getAppDriveInfo();
  const appPath = process.execPath;
  const result = {
    isOnUSB: info.isUSB,
    serial: info.serial,
    path: appPath,
    driveLetter: info.driveLetter,
    rootPath: info.rootPath,
  };
  // 生成 U 盘信息文件
  // writeUSBDriveInfoFile(result);
  return result;
}

/**
 * 生成 U 盘信息文件，便于查看
 * @param {Object} info - USB 检测信息
 */
function writeUSBDriveInfoFile(info) {
  try {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const content = [
      '=== U 盘便携版 Claw - U盘信息 ===',
      `生成时间: ${timestamp}`,
      `平台: ${info.isUSB ? (process.platform === 'darwin' ? 'macOS' : 'Windows') : '非U盘环境'}`,
      `是否在U盘运行: ${info.isOnUSB ? '是' : '否'}`,
      `U盘序列号: ${info.serial || '无法获取'}`,
      `应用路径: ${info.path}`,
      `盘符: ${info.driveLetter || 'N/A'}`,
      `U盘根路径: ${info.rootPath || 'N/A'}`,
      '',
      '=== 详细信息 ===',
      `进程路径: ${process.execPath}`,
      `当前工作目录: ${process.cwd()}`,
      `平台: ${process.platform}`,
      process.platform === 'darwin' ? `挂载点: ${info.rootPath || '/Volumes/...'}` : `盘符: ${info.driveLetter || 'N/A'}`,
    ].join('\n');

    const fileName = 'usb_info.txt';
    const filePath = path.join(getAppRoot(), fileName);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[USB信息] 已生成 U 盘信息文件:', filePath);
  } catch (e) {
    console.error('[USB信息] 生成 U 盘信息文件失败:', e.message);
  }
}

// ── USB 路径工具 ──

function getDriveLetterFromPath(p) {
  if (!p) return null;
  const match = p.match(/^([A-Za-z]):/);
  return match ? match[1].toUpperCase() + ':' : null;
}

function getMacOSUSBDrive() {
  // 打包后 process.cwd() 不一定是 USB 挂载点，改用 process.execPath
  // execPath 格式: /Volumes/XXX/P-Claw.app/Contents/MacOS/P-Claw
  const execPath = process.execPath;
  if (execPath.startsWith('/Volumes/')) {
    const parts = execPath.split('/');
    if (parts.length >= 3) {
      return '/' + parts[1] + '/' + parts[2];
    }
  }
  return null;
}

function getUSBDriveRoot() {
  if (process.platform === 'win32') {
    // 同样改用 process.execPath，避免 cwd 不稳定
    const drive = getDriveLetterFromPath(process.execPath);
    return drive ? drive + '\\' : null;
  }
  const macDrive = getMacOSUSBDrive();
  return macDrive ? macDrive + '/' : null;
}

// ── Windows 获取序列号 ──

function getUSBSerialNumberWindows() {
  return new Promise((resolve, reject) => {
    const drive = getDriveLetterFromPath(process.cwd());
    if (!drive) {
      reject(new Error('Cannot determine USB drive letter'));
      return;
    }
    // Step 1: 通过盘符找到对应的物理磁盘索引
    exec(`wmic partition where "DriveLetter='${drive}'" get DiskIndex`, (err, stdout) => {
      if (err || !stdout.trim()) {
        reject(new Error('Failed to get partition info: ' + (err ? err.message : 'no output')));
        return;
      }
      const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('DiskIndex'));
      if (lines.length < 1) {
        reject(new Error('No disk index found for drive ' + drive));
        return;
      }
      const diskIndex = lines[lines.length - 1].trim();
      // Step 2: 根据磁盘索引获取该物理磁盘的序列号
      exec(`wmic diskdrive where "Index=${diskIndex}" get SerialNumber`, (err2, stdout2) => {
        if (err2 || !stdout2.trim()) {
          reject(new Error('Failed to get disk serial: ' + (err2 ? err2.message : 'no output')));
          return;
        }
        const serialLines = stdout2.trim().split('\n').filter(l => l.trim() && !l.startsWith('SerialNumber'));
        if (serialLines.length > 0) {
          resolve(serialLines[serialLines.length - 1].trim());
        } else {
          reject(new Error('No serial number found for disk index ' + diskIndex));
        }
      });
    });
  });
}

 

// ── Legacy 激活（本地安装场景） ──

function isActivated(configDir) {
  const activationFilePath = path.join(configDir, 'activation.json');
  try {
    const data = fs.readFileSync(activationFilePath, 'utf8');
    return JSON.parse(data).activated === true;
  } catch {
    return false;
  }
}

// ── 激活窗口 ──

// ── 激活窗口（单窗口模式：已禁用独立窗口） ──

/**
 * 显示激活对话框（单窗口模式下禁用）
 * @deprecated 单窗口模式下使用主窗口的激活界面
 */
function showActivateDialog() {
  console.log('[激活] showActivateDialog 调用已禁用（单窗口模式）');
}

/**
 * 关闭激活窗口（单窗口模式下禁用）
 * @deprecated 单窗口模式下不关闭独立窗口
 */
function closeActivateWindow() {
  console.log('[激活] closeActivateWindow 调用已禁用（单窗口模式）');
}

// ── 阻塞式等待激活 ──

function waitForActivation() {
  return new Promise((resolve) => {
    startupResolver = resolve;
  });
}

function resumeStartup() {
  if (startupResolver) {
    startupResolver();
    startupResolver = null;
  }
}


// ── IPC Handlers ──

function setupActivationIPC(ipcMain) { 

  ipcMain.handle('do-bind-activation', async (_, activationCode) => {
    try {
      const result = await apiRequest('/api/usb_key/activate', {
        activation_code: activationCode,
        usb_serial: runtimeStore.serial
      });

      if (result.success && result.data) {
        // 存储 session_cookie 到运行时
        if (result.data.session_cookie) {
          runtimeStore.session_cookie = result.data.session_cookie;
        }
        try {
          // 加密存储激活码
          if (runtimeStore.serial && activationCode) {
            writeLicenseFile(runtimeStore.serial, activationCode);
          }
        } catch (writeErr) {
          console.warn('  writeActivatinFile failed:', writeErr.message);
        }
      } else {
        console.log('  激活失败:', result.message || '未知错误');
      }
      console.log('═══════════════════════════════════════');
      return result;
    } catch (e) {
      console.error('  激活异常:', e.message);
      console.log('═══════════════════════════════════════');
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('activation-success', () => {
  // 设置标志：激活成功
  app.activationSucceeded = true;
  // 单窗口模式下不关闭独立窗口，窗口会通过 check-passed 中的 loadConfigPage() 切换到主界面
  resumeStartup();
});
}


/**
 * 检测网络连通性
 * @returns {Promise<{ ok: boolean }>}
 */
async function checkNetwork() {
  return new Promise((resolve) => {
    // const dns = require('dns');
    // const options = { timeout: 2000 };
    // dns.lookup('www.baidu.com', options, (err) => {
    //   if (err) {
    //     resolve({ ok: false, error: err.message });
    //   } else {
        resolve({ ok: true });
      // }
    // });
  });
}



// ── 模块导出 ──

export {
  setupActivationIPC,
  showActivateDialog,
  closeActivateWindow,
  waitForActivation,
  resumeStartup,
  isActivated,
  getLicensePath,
  getUSBDriveRoot,
  getAppDriveInfo,
  detectUSBStatus, 
  writeLicenseFile,
  checkNetwork,
};