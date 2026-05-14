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

 
 
  
 

/**
 * 检测网络连通性
 * @returns {Promise<{ ok: boolean }>}
 */
async function checkNetwork() {
  return new Promise((resolve) => { 
    resolve({ ok: true }); 
  });
}



// ── 模块导出 ──

export {  
  getAppDriveInfo,
  detectUSBStatus,  
  checkNetwork,
};