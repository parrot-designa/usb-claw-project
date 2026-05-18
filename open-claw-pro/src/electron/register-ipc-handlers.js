import path from 'path';
import fs from 'fs';
import os from 'os';
import { ipcMain, dialog, app, shell, session } from 'electron';
import { RUNTIME_DIR, getAppRoot } from './paths.js';
import { exec,spawn } from 'child_process';
import { 
  checkNetwork,
  detectUSBStatus, 
} from './activation.js';
import { getGatewayEnv, getMediaDir, getNodeBin, getNpmBin, getOpenClawPath, getPaths, readLicenseFile, writeLicenseFile, writeOpenClawConfig} from './paths.js';
import skillNameMap from './skill-name-map.js';
import net from 'net';
import { GATEWAY_DEFAULT_PORT, API_BASE } from './utils/env.js';
import { createWindow, getMainWindow, isWin, loadConfigPage } from './window-manager.js';
import { apiRequest } from './api-node.js';
import { runtimeStore } from './utils/runtime-store.js';
import { initWechat,getWechatManagerInstance } from "./plugin/wechat-init.js";

function parseSkillMeta(skillFilePath) {
  try {
    const content = fs.readFileSync(skillFilePath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return null;
    }

    const frontmatter = match[1];
    const lines = frontmatter.split(/\r?\n/);
    const result = {};
    let currentKey = null;
    let currentValue = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indentMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);

      if (indentMatch) {
        if (currentKey !== null) {
          result[currentKey] = currentValue.trim();
        }
        currentKey = indentMatch[2];
        currentValue = indentMatch[3];
      } else if (currentKey !== null && (line.match(/^\s+\|/) || line.match(/^\s+>/))) {
        currentValue = lines[++i] || '';
        while (i < lines.length && lines[i].match(/^\s{2,}[^:#]/)) {
          currentValue += '\n' + lines[i];
          i++;
        }
        i--;
      } else if (currentKey !== null && line.match(/^\s+- /)) {
        currentValue += '\n' + line;
      } else if (currentKey !== null && line.match(/^\s{2,}.*:/) && !line.match(/^\s+- .*:/)) {
        const nested = line.match(/^\s{2,}([\w-]+):\s*(.*)$/);
        if (nested) {
          if (!result[currentKey]) result[currentKey] = {};
          result[currentKey][nested[1]] = nested[2] || '';
        }
      } else if (currentKey !== null && line.match(/^\s{2,}/) && currentKey !== 'description') {
        currentValue += ' ' + line.trim();
      }
    }

    if (currentKey !== null) {
      result[currentKey] = currentValue.trim();
    }

    let emoji = result.emoji || null;

    // Try to extract emoji from metadata JSON
    if (!emoji && result.metadata) {
      try {
        const metadata = JSON.parse(result.metadata);
        emoji = metadata.clawdbot?.emoji || metadata.openclaw?.emoji || null;
      } catch {
        // If JSON parse fails, try regex to find emoji directly
        if (!emoji) {
          const emojiMatch = result.metadata.match(/"emoji"\s*:\s*["']([\p{Emoji}]+)/u);
          if (emojiMatch) {
            emoji = emojiMatch[1];
          }
        }
      }
    }

    // Fallback: search for emoji pattern anywhere in frontmatter
    if (!emoji) {
      const frontmatterEmojiMatch = frontmatter.match(/"emoji"\s*:\s*["']([\p{Emoji}]+)/u);
      if (frontmatterEmojiMatch) {
        emoji = frontmatterEmojiMatch[1];
      }
    }

    return {
      name: result.name || null,
      description: result.description || null,
      emoji,
      raw: result,
    };
  } catch (err) {
    console.error('parseSkillMeta error:', err);
    return null;
  }
}

function registerIPCHandlers({ gateway }) {
  // Get paths at function entry (after app.whenReady())
  const { appRoot, configDir, configPath, openclawPath, openclawEntry, dataRoot } = getPaths();

  ipcMain.handle('open-dashboard', () => {
    if (gateway.isGatewayReady()) { 
      shell.openExternal(`http://127.0.0.1:${GATEWAY_DEFAULT_PORT}/?token=newToken`);
    }
  });

  ipcMain.handle('show-error-dialog', async (_, { title, message }) => {
    await dialog.showMessageBox({
      type: 'error',
      title: title || '错误',
      message,
      buttons: ['确定'],
    });
    return { ok: true };
  });

  ipcMain.handle('show-confirm-dialog', async (_, { title, message }) => {
    const result = await dialog.showMessageBox({
      type: 'question',
      title: title || '确认',
      message,
      buttons: ['取消', '确认'],
      defaultId: 1,
      cancelId: 0,
    });
    return { ok: true, confirmed: result.response === 1 };
  });

  ipcMain.handle('select-download-dir', async () => {
    const result = await dialog.showSaveDialog({
      title: '保存图片',
      defaultPath: `image-${Date.now()}.png`,
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    });
    if (result.canceled) {
      return { ok: false, canceled: true };
    }
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('save-file', async (_, { filepath, buffer }) => {
    try {
      fs.writeFileSync(filepath, Buffer.from(buffer, 'base64'));
      return { ok: true };
    } catch (e) {
      console.error('save-file failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('download-image', async (_, { url }) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return { ok: true, base64 };
    } catch (e) {
      console.error('download-image failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  // Download and persist image to local media directory
  ipcMain.handle('save-media-image', async (_, { url, taskId }) => {
    try {
      const mediaDir = getMediaDir();
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      const ext = url.match(/\.(png|jpg|jpeg|webp)(?:\?|$)/i)?.[1] || 'png';
      const filename = `${taskId}.${ext}`;
      const filepath = path.join(mediaDir, filename);

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(filepath, Buffer.from(arrayBuffer));
      console.log('[save-media-image] saved:', filepath);
      return { ok: true, filepath };
    } catch (e) {
      console.error('save-media-image failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('write-openclaw-config', async (_, { models }, type) => {
    await writeOpenClawConfig({ models }, type);
    return { ok: true };
  });

  ipcMain.handle('write-license-file', async (_, { serial, activationCode }) => {
    try {
      writeLicenseFile(serial, activationCode);
      return { ok: true };
    } catch (e) {
      console.error('write-license-file failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('get-data-dir', () => dataRoot);

  ipcMain.handle('get-default-port', () => GATEWAY_DEFAULT_PORT);

  ipcMain.handle('check-step-serial', async () => {
    try {
      const info = await detectUSBStatus();
      Object.assign(runtimeStore, { usb: info, rootPath: info.rootPath, serial: info.serial });
      if (!info.serial) {
        return { ok: false, error: '无法获取 U 盘序列号' };
      }
      return { ok: true, serial: info.serial };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('check-step-license', async (_, serial) => {
    try {
      const licenseData = readLicenseFile(serial);
      if (!licenseData) {
        return { ok: false, error: '权限文件不存在' };
      }
      if (!licenseData.serial || !licenseData.activation_code) {
        return { ok: false, error: '权限信息不完整' };
      }
      if (serial !== licenseData.serial) {
        return { ok: false, error: 'U盘序列号不匹配' };
      }
      return { ok: true, license: licenseData };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('check-step-login', async (_, { serial, activation_code }) => {
    console.log("check-step-login==>", serial, activation_code);
    const result = await apiRequest('/api/usb_key/login', {
      method: 'POST',
      body: { serial_number: serial, activation_code: activation_code },
      timeout: 10000,
    }); 
    if (result.success && result.data && result.data.session_cookie) {
      runtimeStore.session_cookie = result.data.session_cookie;
      // 设置 HTTP Cookie 到 Electron 的 cookie 存储，使所有请求自动携带
      setUclawSessionCookie(result.data.session_cookie);
      return { ok: true, token: result.data.token };
    }
    return { ok: false, error: result.message || '登录校验失败' };
  });

  // 设置 uclaw_session cookie，供后端 authHelper 中间件认证
  async function setUclawSessionCookie(cookieValue) {
    try {
      await session.defaultSession.cookies.set({
        url: API_BASE,
        name: 'uclaw_session',
        value: cookieValue,
        path: '/',
        secure: false,
        httpOnly: false,
        expirationDate: Math.floor(Date.now() / 1000) + 30 * 24 * 3600
      });
      console.log('[setUclawSessionCookie] cookie set successfully');
    } catch (e) {
      console.error('[setUclawSessionCookie] failed:', e.message);
    }
  }

  ipcMain.handle('set-session-cookie', async (_, value) => {
    await setUclawSessionCookie(value);
    return { ok: true };
  });

  ipcMain.handle('store-get', async (_, key) => {
    return runtimeStore[key];
  });

  ipcMain.handle('store-set', async (_, { key, value }) => {
    runtimeStore[key] = value;
    return { ok: true };
  }); 
  // 注册扫描本地skill ipc
  ipcMain.handle('scan-local-skills', async () => {
    const skillsMap = new Map();

    try {
      // root/data/.openclaw/opencaw.json
      let extraDirs = [];
      let skillEntries = {};

      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          extraDirs = config.skills?.load?.extraDirs || [];
          skillEntries = config.skills?.entries || {};
        } catch (e) {
          console.warn('读取 openclw.json extraDirs 失败:', e.message);
        }
      } 

      for (const extraDir of extraDirs) {
        let resolvedDir = extraDir;
        if (!path.isAbsolute(extraDir)) {
          resolvedDir = path.join(path.dirname(configDir), extraDir);
        }

        if (!fs.existsSync(resolvedDir)) {
          continue;
        }

        const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillPath = path.join(resolvedDir, entry.name);
            const skillFile = path.join(skillPath, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
              const meta = parseSkillMeta(skillFile);
              const name = meta?.name || entry.name;
              if (!skillsMap.has(name)) {
                skillsMap.set(name, {
                  name,
                  cnName: skillNameMap[entry.name] || null,
                  description: meta?.description || null,
                  emoji: meta?.emoji || null,
                  source: 'local',
                  path: skillPath,
                  enabled: skillEntries[name]?.enabled !== false
                });
              }
            }
          } else if (entry.name.endsWith('.md')) {
            const skillFile = path.join(resolvedDir, entry.name);
            const meta = parseSkillMeta(skillFile);
            const name = meta?.name || entry.name.replace('.md', '');
            if (!skillsMap.has(name)) {
              skillsMap.set(name, {
                name,
                cnName: skillNameMap[entry.name] || null,
                description: meta?.description || null,
                emoji: meta?.emoji || null,
                source: 'local',
                path: resolvedDir,
                enabled: skillEntries[name]?.enabled !== false
              });
            }
          }
        }
      }

      const skills = Array.from(skillsMap.values());
      return { ok: true, skills };
    } catch (err) {
      console.error('扫描本地skill失败:', err);
      return { ok: false, error: err.message, skills: [] };
    }
  });

  // 启用/禁用 skill
  ipcMain.handle('toggle-skill', async (_, { skillName, enabled }) => {
    try {
      await writeOpenClawConfig({
        skills: {
          entries: {
            [skillName]: { enabled }
          }
        }
      }, 'skills');
      return { ok: true };
    } catch (err) {
      console.error('toggle-skill 失败:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('start-gateway', async () => { 
    try {
      await gateway.startGateway();
      return { ok: true };
    } catch (err) {
      console.error(`启动 Gateway 失败:`, err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('stop-gateway', async () => {
    await gateway.stopGateway();
    return { ok: true };
  });

  ipcMain.handle('restart-gateway', async () => {
    try { 
      await gateway.restartGateway(); 
      setTimeout(() => {
        if (gateway.isGatewayReady()) {
          const token = runtimeStore.gatewayToken || 'uclawKey';
          shell.openExternal(`http://127.0.0.1:${GATEWAY_DEFAULT_PORT}/?token=newToken`);
        }
      }, 100); 
      return { ok: true, port: GATEWAY_DEFAULT_PORT };
    } catch (err) {
      console.error(`重启 Gateway 失败:`, err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('restart-app', async () => {
    app.relaunch();
    app.exit(0);
  });

  // Environment check handlers
  ipcMain.handle('get-node-version', async () => {
    try {
      const nodeBin = getNodeBin();
      const { execFileSync } = require('child_process');
      const version = execFileSync(nodeBin, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
      return { ok: true, version };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('get-npm-version', async () => {
    try {
      const nodeBin = getNodeBin();
      const { execFileSync } = require('child_process');
      const version = execFileSync(nodeBin, ['-v'], { encoding: 'utf8', timeout: 5000 }).trim();
      return { ok: true, version };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('get-openclaw-version', async () => {
    try {
      const nodeBin = getNodeBin();
      const { execFileSync } = require('child_process');
      const version = execFileSync(nodeBin, [openclawEntry, '--version'], { encoding: 'utf8', timeout: 10000 }).trim();
      return { ok: true, version };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }); 

  ipcMain.handle('check-port', async (_, port) => {
    // Validate port
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, error: 'Invalid port number' };
    }
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve({ ok: true, available: false });
        } else {
          resolve({ ok: false, error: err.message });
        }
      });
      server.once('listening', () => {
        server.close();
        resolve({ ok: true, available: true });
      });
      server.listen(port, '127.0.0.1');
    });
  });

  // 历史作品 message.json 读写
  ipcMain.handle('load-message-json', async () => {
    try {
      const mediaDir = getMediaDir();
      const file = path.join(mediaDir, 'message.json');
      if (!fs.existsSync(file)) {
        return { ok: true, data: [] };
      }
      const content = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content);
      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (err) {
      console.error('[load-message-json] failed:', err);
      return { ok: true, data: [] };
    }
  });

  ipcMain.handle('save-message-json', async (_, { messages }) => {
    try {
      const mediaDir = getMediaDir();
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      const file = path.join(mediaDir, 'message.json');
      fs.writeFileSync(file, JSON.stringify(messages, null, 2), 'utf-8');
      return { ok: true };
    } catch (err) {
      console.error('[save-message-json] failed:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('open-media-folder', async () => {
    try {
      const mediaDir = getMediaDir();
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }
      const { shell } = await import('electron');
      await shell.openPath(mediaDir);
      return { ok: true };
    } catch (err) {
      console.error('[open-media-folder] failed:', err);
      return { ok: false, error: err.message };
    }
  });

  // Image sessions persistence
  ipcMain.handle('save-image-sessions', async (_, { sessions, currentSessionId }) => {
    try {
      const dir = path.join(dataRoot, '.openclaw', 'chat-history');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const file = path.join(dir, 'image-sessions.json');
      fs.writeFileSync(file, JSON.stringify({ sessions, currentSessionId }, null, 2), 'utf-8');
      return { ok: true };
    } catch (err) {
      console.error('[save-image-sessions] failed:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('load-image-sessions', async () => {
    try {
      const file = path.join(dataRoot, '.openclaw', 'chat-history', 'image-sessions.json');
      if (!fs.existsSync(file)) {
        return { ok: true, data: { sessions: [], currentSessionId: null } };
      }
      const content = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(content);
      return { ok: true, data };
    } catch (err) {
      console.error('[load-image-sessions] failed:', err);
      return { ok: true, data: { sessions: [], currentSessionId: null } };
    }
  });

  // Image generation via gateway
  ipcMain.handle('generate-image', async (_, { prompt, model, size, quality }) => {
    try {
      // Forward to gateway's image generation endpoint
      // Gateway API format: POST /v1/images/generations
      const url = `http://127.0.0.1:${GATEWAY_DEFAULT_PORT}/v1/images/generations`;
      const body = {
        model: model || 'dall-e-3',
        prompt,
        size: size || '1024x1024',
        quality: quality || 'standard',
        n: 1
      };
      console.log('[generate-image] Request:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('[generate-image] Response:', data);

      if (!response.ok) {
        return { error: data.error?.message || `HTTP ${response.status}` };
      }

      if (data.data && data.data[0]) {
        return {
          url: data.data[0].url,
          revisedPrompt: data.data[0].revised_prompt || ''
        };
      }

      return { error: 'No image returned' };
    } catch (err) {
      console.error('[generate-image] Error:', err);
      return { error: err.message };
    }
  });

  let currentWeChatProcess = null;  

  const killWeChatProcess = () => {
    if (!currentWeChatProcess) return;

    const pid = currentWeChatProcess.pid;
    console.log("killWeChatProcess==>",pid);

    // 立即发送 SIGTERM
    currentWeChatProcess.kill('SIGTERM');

    // 1秒后强制杀死（防止子进程忽略 SIGTERM）
    setTimeout(() => {
      try {
        // 尝试杀死进程组（如果存在子进程）
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        // 进程组不存在，尝试直接杀死
        try {
          process.kill(pid, 'SIGKILL');
        } catch (e2) {
          // 进程已不存在，忽略
        }
      }
      currentWeChatProcess = null;
    }, 1000);
  };
 

  ipcMain.handle('openclaw-wechat-disconnect', async () => {

    return { ok: true };
  });

  // 自定义窗口控制
  ipcMain.on('window-minimize', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.on('window-close', () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.close();
  });

}

function registerWechatIPCHandler({ gateway }){
  initWechat();

  
  ipcMain.handle('openclaw-channels-login', async (_, { channel }) => {  
    return new Promise((resolve) => { 
      getWechatManagerInstance().startLogin();
    });
  });

  ipcMain.handle('get-wechat-status', () => {
    return getWechatManagerInstance().getStatus();
  });

  ipcMain.handle('openclaw-wechat-cancel', () => {
    getWechatManagerInstance().cancelLogin();
    return { ok: true };
  });

}

export { registerIPCHandlers,registerWechatIPCHandler };