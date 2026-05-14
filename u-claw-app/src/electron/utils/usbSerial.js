/**
 * 获取 USB 设备序列号工具
 */

import { execSync } from 'child_process';

function getCurrentDiskSerial(appPath) { 

  const targetPath = appPath || process.execPath;

  if (process.platform === 'darwin') {
    // macOS: 使用 diskutil
    const volumeSerial = getVolumeSerialMac(targetPath);
    return volumeSerial; // macOS 不需要 node-usb 备用（diskutil 已经够用）
  }

  if (process.platform === 'win32') {
    // Windows: 用 Get-Partition + Get-Disk 获取磁盘序列号
    const { execSync: execSyncWin } = require('child_process');
    const pathModule = require('path');

    const driveLetter = pathModule.parse(process.execPath).root;
    console.log('[usbSerial] process.execPath =', process.execPath);
    console.log('[usbSerial] driveLetter =', driveLetter);
    if (!driveLetter) {
      console.log('[usbSerial] 无法从 execPath 解析盘符，返回 null');
      return null;
    }
    const dl = driveLetter[0] + ':';
    console.log('[usbSerial] 目标盘符:', dl);

    // 使用 PowerShell 脚本获取序列号，并过滤控制字符（只保留可打印ASCII）
    const drive = dl;
    const psScript = `& { $d = '${drive}'; Get-WmiObject Win32_LogicalDisk -Filter ([string]::Format('DeviceID=''{0}''', $d)) | ForEach-Object { Get-WmiObject -Query ([string]::Format('ASSOCIATORS OF {{Win32_LogicalDisk.DeviceID=''{0}''}} WHERE AssocClass=Win32_LogicalDiskToPartition', $_.DeviceID)) | ForEach-Object { Get-WmiObject -Query ([string]::Format('ASSOCIATORS OF {{Win32_DiskPartition.DeviceID=''{0}''}} WHERE AssocClass=Win32_DiskDriveToDiskPartition', $_.DeviceID)) | Select-Object -ExpandProperty SerialNumber } } | Select-Object -First 1 } | ForEach-Object { if ($_) { $_.Replace('[^\x20-\x7E]', '').Trim() } }`;
    console.log('[usbSerial] 执行 PowerShell 脚本:', psScript);

    try {
      const result = execSyncWin(`powershell -Command "${psScript}"`, { encoding: 'utf8', timeout: 8000 });
      const serial = result.trim();
      console.log('[usbSerial] 序列号:', serial || 'null');
      return serial || null;
    } catch (e) {
      console.error('[usbSerial] PowerShell 执行失败:', e.message);
      return null;
    }
  }

  // 其他平台不支持
  return null;
}


function isRunningFromUSB(appPath) {
  try {
    // 统一使用 process.execPath，与 getCurrentDiskSerial 保持一致
    const targetPath = appPath || process.execPath;
    if (process.platform === 'darwin') {
      // macOS 上 U 盘通常挂载在 /Volumes/ 下
      return targetPath.startsWith('/Volumes/');
    } else if (process.platform === 'win32') {
      // Windows 上检测是否在可移动磁盘上运行（如 D:\...)
      // 通过 Get-CimInstance 获取逻辑磁盘属性来判断
      const driveMatch = targetPath.match(/^([A-Za-z]):/);
      if (!driveMatch) return false;
      const driveLetter = driveMatch[1].toUpperCase();
      try {
        const { execSync: execSyncWin } = require('child_process');
        const output = execSyncWin(
          `powershell -Command "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq '${driveLetter}:' } | Select-Object -ExpandProperty DriveType"`,
          { encoding: 'utf8' }
        );
        const driveType = parseInt(output.trim(), 10);
        // DriveType: 2 = 可移动, 3 = 本地硬盘
        return driveType === 2;
      } catch (_) {
        return false;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

// ── 获取 MAC 地址 ──
function getMacAddress() {
  try {
    if (process.platform === 'win32') {
      // Windows: 使用 getmac 获取第一个可用 MAC 地址
      const output = execSync('getmac /fo csv /nh', { encoding: 'utf8', timeout: 5000 });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/"([0-9A-F]{2}(-[0-9A-F]{2}){5})"/i);
        if (match) {
          return match[1].replace(/-/g, ':').toUpperCase();
        }
      }
      // Fallback: 通过 PowerShell 获取
      const psScript = `Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.MacAddress -ne $null } | Select-Object -First 1 -ExpandProperty MacAddress`;
      const macOutput = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8', timeout: 5000 });
      const mac = macOutput.trim().replace(/-/g, ':');
      if (mac && mac.length === 17) {
        return mac.toUpperCase();
      }
      return null;
    } else if (process.platform === 'darwin') {
      // macOS: 使用 ifconfig 获取第一个活跃网卡的 MAC 地址
      const output = execSync('ifconfig | grep -E "^[a-z]+[0-9]*:" -A 1 | grep "ether" | head -1', { encoding: 'utf8', timeout: 5000 });
      const match = output.match(/ether\s+([0-9a-f:]+)/i);
      if (match) {
        return match[1].toUpperCase();
      }
      return null;
    }
    return null;
  } catch (error) {
    console.error('[usbSerial] getMacAddress failed:', error.message);
    return null;
  }
}

/**
 * 获取所有外部 USB 设备的序列号信息
 * @returns {Array<{name: string, serialNumber: string, bsdName: string}>}
 */
function getUSBDevices() {
  try {
    const output = execSync('system_profiler SPUSBDataType -json', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    const data = JSON.parse(output);
    const devices = [];

    const processBus = (bus) => {
      if (!bus || !bus.items) return;
      for (const item of bus.items) {
        // 只获取外部 USB 设备（排除内置设备）
        if (item.removable === 'yes' || item.removable === true) {
          devices.push({
            name: item._name || item.product_name || 'Unknown USB Device',
            serialNumber: item.serial_number || '',
            bsdName: item.BSD_Name || '',
            vendorId: item.vendor_id || '',
            productId: item.product_id || ''
          });
        }
        // 递归处理子设备（如 USB Hub）
        if (item.items) {
          processBus({ items: item.items });
        }
      }
    };

    processBus(data.SPUSBDataType);
    return devices;
  } catch (error) {
    console.error('获取 USB 设备信息失败:', error.message);
    return [];
  }
}

/**
 * 获取第一个可移动 U 盘的序列号
 * @returns {string|null} 序列号，如果没有找到返回 null
 */
function getFirstUSBDriveSerial() {
  const devices = getUSBDevices();
  // 尝试找有 BSD Name 的设备（通常是磁盘设备）
  const drive = devices.find(d => d.bsdName && d.bsdName.startsWith('disk'));
  return drive ? drive.serialNumber : (devices[0]?.serialNumber || null);
}

/**
 * 获取所有 U 盘（可移动磁盘）的序列号列表
 * @returns {string[]} 序列号数组
 */
function getUSBDriveSerials() {
  const devices = getUSBDevices();
  return devices
    .filter(d => d.bsdName && d.bsdName.startsWith('disk'))
    .map(d => d.serialNumber)
    .filter(Boolean);
}

// ── 内部辅助方法 ──
function getVolumeSerialMac(appPath) {
  try {
    const targetPath = appPath || process.execPath;

    // 获取 df 输出找到设备
    const dfOutput = execSync(`df "${targetPath}"`, { encoding: 'utf8' });
    const lines = dfOutput.trim().split('\n');

    if (lines.length < 2) return null;

    const fields = lines[1].trim().split(/\s+/);
    if (fields.length < 4) return null;

    const device = fields[0];
    const mountPoint = fields[fields.length - 1];

    if (!mountPoint.startsWith('/Volumes/') || mountPoint === '/') {
      return null;
    }

    // 使用 diskutil info 获取序列号
    const diskInfo = execSync(`diskutil info "${device}"`, { encoding: 'utf8' });

    // 尝试 Volume Serial Number
    const serialMatch = diskInfo.match(/Volume Serial Number:\s*(.+)/);
    if (serialMatch && serialMatch[1].trim()) {
      return serialMatch[1].trim();
    }

    // 备用：Device UUID
    const uuidMatch = diskInfo.match(/Device UUID:\s*(.+)/);
    if (uuidMatch && uuidMatch[1].trim()) {
      return uuidMatch[1].trim();
    }

    return null;
  } catch (error) {
    console.error('[usbSerial] getVolumeSerialMac failed:', error.message);
    return null;
  }
}


async function getAppDriveInfo() {
  // 优先用 execPath，兼容 Electron 打包后路径
  let targetPath = process.execPath;
  let usingFallback = false;

  // execPath 拿不到有效 Windows 盘符时，fallback 到 cwd
  if (process.platform === 'win32') {
    const match = targetPath.match(/^([A-Za-z]):/);
    if (!match) {
      targetPath = process.cwd();
      usingFallback = true;
    }
  }

  const isUSB = isRunningFromUSB(targetPath);
  const serial = isUSB ? await getCurrentDiskSerial(targetPath) : getMacAddress();

  let driveLetter = null;
  let rootPath = null;

  if (process.platform === 'win32') {
    const match = targetPath.match(/^([A-Za-z]):/);
    driveLetter = match ? match[1].toUpperCase() + ':' : null;
    rootPath = driveLetter ? driveLetter + '\\' : null;
  } else if (process.platform === 'darwin') {
    // /Volumes/XXX/P-Claw.app/Contents/MacOS/P-Claw → /Volumes/XXX
    if (targetPath.startsWith('/Volumes/')) {
      const parts = targetPath.split('/');
      rootPath = '/' + parts[1] + '/' + parts[2];
      driveLetter = null;
    }
  }

  return {
    driveLetter,
    rootPath,
    isUSB,
    serial,
    platform: process.platform,
    _usingFallback: usingFallback,
  };
}

export {
  getUSBDevices,
  getFirstUSBDriveSerial,
  getUSBDriveSerials,
  getCurrentDiskSerial,
  isRunningFromUSB,
  getAppDriveInfo,
  getMacAddress,
};