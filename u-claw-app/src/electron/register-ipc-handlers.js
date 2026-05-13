import path from 'path';
import fs from 'fs';
import os from 'os';
import { ipcMain, dialog, app, shell } from 'electron';
import { RUNTIME_DIR, getAppRoot } from './paths.js';
import { exec,spawn } from 'child_process';
import {
  setupActivationIPC,
  checkNetwork,
  detectUSBStatus,
  resumeStartup,
  showActivateDialog,
} from './activation.js';
import { getGatewayEnv, getNodeBin, getNpmBin, getOpenClawPath, getPaths, readLicenseFile, writeOpenClawConfig} from './paths.js';
import skillNameMap from './skill-name-map.js';
import net from 'net';
import { GATEWAY_DEFAULT_PORT } from './utils/env.js';
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

  ipcMain.handle('write-openclaw-config', async (_, { models }, type) => {
    await writeOpenClawConfig({ models }, type);
    return { ok: true };
  });

  ipcMain.handle('get-data-dir', () => dataRoot);

  ipcMain.handle('get-default-port', () => GATEWAY_DEFAULT_PORT);

  setupActivationIPC(ipcMain, app);

  ipcMain.handle('check-passed', async () => {
  // 单窗口模式：通过路由切换到主页
  const { navigateTo } = await import('./window-manager.js');
  navigateTo('/home');
  return { ok: true };
});

  ipcMain.handle('navigate-to', async (_, route) => {
    const { navigateTo } = await import('./window-manager.js');
    navigateTo(route);
    return { ok: true };
  });

  // Session invalid - 在单窗口模式下重新加载激活页面
  ipcMain.handle('show-activation', async () => {
    console.log('[Session] 重新加载激活页面');
    const { navigateTo } = await import('./window-manager.js');
    navigateTo('/activate');
    return { ok: true };
  });


  

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
      console.log("获取验证信息", licenseData);
      if (!licenseData) {
        return { ok: false, error: '权限文件不存在' };
      }
      if (!licenseData.serial || !licenseData.activation_code) {
        return { ok: false, error: '权限信息不完整' };
      }
      if (serial !== licenseData.serial) {
        return { ok: false, error: 'U盘序列号不匹配' };
      }
      // 存入运行时存储
      runtimeStore.license = licenseData;
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
      return { ok: true, token: result.data.token };
    }
    return { ok: false, error: result.message || '登录校验失败' };
  });

  ipcMain.handle('store-get', async (_, key) => {
    return runtimeStore[key];
  });

  ipcMain.handle('store-set', async (_, { key, value }) => {
    runtimeStore[key] = value;
    return { ok: true };
  }); 
  /**
   * 安装微信插件的 IPC 处理器
   *
   * 安装流程（分5步）：
   *   Step 1: 创建扩展目录 extensions/openclaw-weixin
   *   Step 2: 在临时目录执行 npm init -y（初始化package.json）
   *   Step 3: 在临时目录执行 npm install 下载插件包
   *   Step 4: 将下载的插件复制到 extensions/openclaw-weixin
   *   Step 5: 在插件目录执行 npm install（安装插件自身的依赖）
   *
   * Windows 常见问题排查：
   *   - npmBin 路径错误：getNpmBin() 返回的可能是错误的路径
   *   - tmpDir 权限问题：Windows 的 os.tmpdir() 可能是 C:\Users\xxx\AppData\Local\Temp
   *   - 目录删除失败：pluginInstallDir 或 tmpDir 被占用时 fs.rmSync 会失败
   *   - 中文路径问题：appRoot 路径中包含中文可能导致 npm 执行异常
   *   - 网络问题：registry.npmmirror.com 在某些网络环境下不稳定
   */
  ipcMain.handle('install-wechat-plugin', async () => {
    // ===== 变量初始化 =====
    // extensionsDir: 插件安装根目录，例如 appRoot/extensions
    const extensionsDir = path.join(appRoot, 'extensions');
    // pluginInstallDir: 微信插件的实际安装位置 extensions/openclaw-weixin
    const pluginInstallDir = path.join(extensionsDir, 'openclaw-weixin');

    // ===== Step 0: 检查是否已安装 =====
    // 如果 openclaw.plugin.json 已存在，说明插件已安装，直接返回
    // openclaw.plugin.json 是插件的标识文件，必须存在才认为安装成功
    const pluginJsonPath = path.join(pluginInstallDir, 'openclaw.plugin.json');
    if (fs.existsSync(pluginJsonPath)) {
      console.log('[微信插件安装] 插件已安装，跳过安装流程');
      return { installed: true };
    }

    // ===== Step 1: 创建扩展目录 =====
    // extensionsDir 可能不存在，需要递归创建
    // recursive: true 表示创建所有中间目录
    if (!fs.existsSync(extensionsDir)) {
      console.log('[微信插件安装] Step 1: 创建扩展目录', extensionsDir);
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    // ===== 获取 npm 可执行文件路径 =====
    // getNpmBin() 返回 npm 的绝对路径
    // Windows 上注意：可能返回 npm.cmd 或 npm.bat 的路径
    // 如果返回的是纯 npm，需要确保它在 PATH 中
    const npmBin = getNpmBin();
    console.log('[微信插件安装] npmBin 路径:', npmBin);

    // ===== Step 2: 创建临时工作目录 =====
    // os.tmpdir() 返回系统临时目录
    // mkdtempSync 创建临时子目录 openclaw-weixin-xxxxxx
    // Windows 临时目录通常是 C:\Users\xxx\AppData\Local\Temp
    // 注意：临时目录用完会在 finally 中删除
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-weixin-'));
    console.log('[微信插件安装] Step 2: 临时目录:', tmpDir);

    try {
      // ===== Step 3a: npm init -y =====
      // 在临时目录初始化一个 package.json
      // -y 表示接受所有默认选项
      // 如果 Windows 上 npm 不在 PATH 中，这里会报错ENOENT
      console.log('[微信插件安装] Step 3a: 执行 npm init -y');
      await new Promise((resolve, reject) => {
        exec(`${npmBin} init -y`, { cwd: tmpDir }, (err, stdout, stderr) => {
          // 打印完整的 stdout 和 stderr 方便排查
          console.log('[npm init stdout]', stdout);
          console.log('[npm init stderr]', stderr);
          if (err) {
            console.error('[npm init 失败]', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // ===== Step 3b: npm install 下载插件包 =====
      // 安装 @tencent-weixin/openclaw-weixin@2.0.1 包
      // --registry 指定使用国内镜像加速
      // 注意：@符号在 Windows cmd 中可能有特殊含义，需要确保正确转义
      console.log('[微信插件安装] Step 3b: 下载插件包 @tencent-weixin/openclaw-weixin@2.0.1');
      await new Promise((resolve, reject) => {
        exec(`${npmBin} install @tencent-weixin/openclaw-weixin@2.1.10 --registry=https://registry.npmmirror.com`, { cwd: tmpDir }, (err, stdout, stderr) => {
          console.log('[npm install stdout]', stdout);
          console.log('[npm install stderr]', stderr);
          if (err) {
            console.error('[npm install 失败]', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // ===== Step 4: 复制插件到扩展目录 =====
      // pkgDir: 下载的插件包实际位置
      // 注意：Windows 路径中包含 @ 符号可能需要特别处理
      const pkgDir = path.join(tmpDir, 'node_modules', '@tencent-weixin', 'openclaw-weixin');
      console.log('[微信插件安装] Step 4: 插件包位置:', pkgDir);

      // 检查包是否真的下载了
      if (!fs.existsSync(pkgDir)) {
        const errMsg = `插件包目录不存在: ${pkgDir}，可能下载失败`;
        console.error('[微信插件安装]', errMsg);
        return { installed: false, error: errMsg };
      }

      // 如果插件目录已存在，先删除（可能是之前的失败残留）
      // recursive: true 允许删除非空目录
      // force: true 忽略不存在的错误
      if (fs.existsSync(pluginInstallDir)) {
        console.log('[微信插件安装] 删除旧插件目录:', pluginInstallDir);
        fs.rmSync(pluginInstallDir, { recursive: true, force: true });
      }

      // 确保 extensionsDir 存在（上面创建过了，但以防万一）
      fs.mkdirSync(extensionsDir, { recursive: true });

      // cpSync 是同步复制，Windows 上如果文件被占用可能失败
      console.log('[微信插件安装] 复制插件到:', pluginInstallDir);
      fs.cpSync(pkgDir, pluginInstallDir, { recursive: true });

      // ===== Step 5: 在插件目录安装依赖 =====
      // 插件本身可能有 peerDependencies 或 devDependencies
      // 需要在插件目录再执行一次 npm install
      console.log('[微信插件安装] Step 5: 在插件目录安装依赖');
      await new Promise((resolve, reject) => {
        exec(`${npmBin} install --registry=https://registry.npmmirror.com`, { cwd: pluginInstallDir }, (err, stdout, stderr) => {
          console.log('[npm install (插件依赖) stdout]', stdout);
          console.log('[npm install (插件依赖) stderr]', stderr);
          if (err) {
            console.error('[npm install (插件依赖) 失败]', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // ===== Step 6: 验证安装结果 =====
      // 检查 openclaw.plugin.json 是否存在，这是插件安装成功的标志
      const installed = fs.existsSync(path.join(pluginInstallDir, 'openclaw.plugin.json'));
      console.log('[微信插件安装] 验证结果 openclaw.plugin.json exists:', installed);

      if (installed) {
        // 写入插件配置，注册插件到 openclaw
        console.log('[微信插件安装] 写入插件配置');
        await writeOpenClawConfig({
          plugins: {
            load: {
              paths: [pluginInstallDir],
            },
            entries: {
              'openclaw-weixin': { enabled: true },
            },
          }
        }, "plugins");
      }

      // ===== 返回结果 =====
      // 如果 installed 为 true 表示成功
      // 如果 installed 为 false，error 包含失败原因
      const errorMsg = installed ? null : 'Plugin files not found after install';
      console.log('[微信插件安装] 安装', installed ? '成功' : '失败', errorMsg || '');
      return { installed, error: errorMsg };

    } catch (err) {
      // ===== 错误处理 =====
      // 捕获所有步骤中可能出现的错误
      // 常见 Windows 错误：
      //   - ENOENT: npm 路径不正确或网络请求失败
      //   - EACCES: 权限被拒绝（目录只读、杀毒软件拦截等）
      //   - ECONNRESET: 网络连接被重置
      //   - ETIMEDOUT: 网络连接超时
      console.error('[微信插件安装] 捕获到错误:', err.message);
      console.error('[微信插件安装] 错误详情:', err.stack);
      return { installed: false, error: err.message };

    } finally {
      // ===== 清理临时目录 =====
      // 无论成功还是失败，都删除临时目录
      // Windows 上如果临时目录正在被使用，删除可能失败
      // 此时不会抛出异常，只是打印警告
      try {
        if (fs.existsSync(tmpDir)) {
          console.log('[微信插件安装] 清理临时目录:', tmpDir);
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.warn('[微信插件安装] 清理临时目录失败（不影响安装结果）:', cleanupErr.message);
      }
    }
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

  // Chat history persistence (ImageGen)
  const CHAT_HISTORY_DIR = path.join(appRoot, 'runtime', 'chat-history');
  const IMAGE_GEN_HISTORY_FILE = path.join(CHAT_HISTORY_DIR, 'image-gen.json');

  ipcMain.handle('save-image-gen-history', async (_, messages) => {
    try {
      console.log("我来保存")
      if (!fs.existsSync(CHAT_HISTORY_DIR)) {
        fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
      }
      fs.writeFileSync(IMAGE_GEN_HISTORY_FILE, JSON.stringify(messages, null, 2), 'utf-8');
      return { ok: true };
    } catch (err) {
      console.error('[save-image-gen-history] failed:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('load-image-gen-history', async () => {
    try {
      if (!fs.existsSync(IMAGE_GEN_HISTORY_FILE)) {
        return { ok: true, messages: [] };
      }
      const content = fs.readFileSync(IMAGE_GEN_HISTORY_FILE, 'utf-8');
      const messages = JSON.parse(content);
      return { ok: true, messages };
    } catch (err) {
      console.error('[load-image-gen-history] failed:', err);
      return { ok: true, messages: [] };
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