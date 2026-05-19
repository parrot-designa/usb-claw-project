/**
 * WeChat integration module for Electron main process.
 * Handles: plugin install, QR login, status check.
 */
import  { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path'; 
import EventEmitter from 'events';


const CHANNEL_ID = 'openclaw-weixin';
const PLUGIN_SPEC = '@tencent-weixin/openclaw-weixin';

class WechatManager extends EventEmitter {
  constructor({ runtimeDir, dataDir, isDev, usbRuntime }) {
    super();
    this.runtimeDir = runtimeDir;
    this.usbRuntime = usbRuntime || '';
    this.dataDir = dataDir;
    this.isDev = isDev;
    this.loginProcess = null;
    this.status = 'disconnected'; // disconnected | installing | scanning | connected | error
  }

  _getEnv() {
    const paths = [this.runtimeDir, this.usbRuntime].filter(Boolean);
    return {
      ...process.env,
      OPENCLAW_HOME: this.dataDir,
      PATH: `${paths.join(path.delimiter)}${path.delimiter}${process.env.PATH}`,
    };
  }

  _getCliBin() {
    if (this.isDev) return 'openclaw';
    // Check extracted runtime first, then USB runtime
    const cmd1 = path.join(this.runtimeDir, process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw');
    if (fs.existsSync(cmd1)) return cmd1;
    if (this.usbRuntime) {
      const cmd2 = path.join(this.usbRuntime, process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw');
      if (fs.existsSync(cmd2)) return cmd2;
    }
    return cmd1;
  }

  _exec(args, { silent = true, timeout = 5000 } = {}) {
    const bin = this._getCliBin();
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `cmd /c "${bin}" ${args}` : `"${bin}" ${args}`;
    return execSync(cmd, {
      encoding: 'utf-8',
      timeout,
      env: this._getEnv(),
      stdio: silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
    }).trim();
  }

  /** Check if weixin plugin is installed (cached) */
  isPluginInstalled() {
    // Check cached result first (valid for 60s)
    if (this._pluginCacheTime && Date.now() - this._pluginCacheTime < 60000) {
      return this._pluginCached;
    }
    // Quick check: just see if the extension directory exists
    const extDir = path.join(this.dataDir, '.openclaw', 'extensions', 'openclaw-weixin');
    const result = fs.existsSync(extDir);
    this._pluginCached = result;
    this._pluginCacheTime = Date.now();
    return result;
  }

  /** Install or update weixin plugin */
  _ensurePluginsAllow() {
    try {
      const configFile = path.join(this.dataDir, '.openclaw', 'openclaw.json');
      if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        let dirty = false;
        if (!config.plugins) config.plugins = {};
        if (!Array.isArray(config.plugins.allow)) config.plugins.allow = [];
        if (!config.plugins.allow.includes('openclaw-weixin')) {
          config.plugins.allow.push('openclaw-weixin');
          dirty = true;
          console.log('[wechat] Added openclaw-weixin to plugins.allow');
        }
        // Ensure plugins.entries has openclaw-weixin (gateway needs this to load the plugin)
        if (!config.plugins.entries) config.plugins.entries = {};
        if (!config.plugins.entries['openclaw-weixin']) {
          config.plugins.entries['openclaw-weixin'] = { enabled: true, config: {} };
          dirty = true;
          console.log('[wechat] Added openclaw-weixin to plugins.entries');
        }
        // Ensure channels has openclaw-weixin (gateway needs this to route messages)
        if (!config.channels) config.channels = {};
        if (!config.channels['openclaw-weixin']) {
          config.channels['openclaw-weixin'] = {};
          dirty = true;
          console.log('[wechat] Added openclaw-weixin to channels');
        }
        if (dirty) {
          fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
        }
      }
    } catch (e) { console.log(`[wechat] plugins.allow update error: ${e.message}`); }
  }

  /**
   * Install plugin — tries offline (bundled zip) first, falls back to online.
   * @param {object} opts
   * @param {string} opts.usbRoot - USB root directory (for finding bundled zips)
   * @param {boolean} opts.forceOnline - skip offline, go straight to online (for updates)
   */
  async installPlugin({ usbRoot, forceOnline = false } = {}) {
    this.status = 'installing';
    this.emit('status', this.status);

    const extDir = path.join(this.dataDir, '.openclaw', 'extensions', 'openclaw-weixin');
    const isUpdate = fs.existsSync(extDir);
    this.emit('log', forceOnline ? '正在联网更新微信插件...' : (isUpdate ? '正在更新微信插件...' : '正在安装微信插件...'));

    // --- Offline install from bundled zip ---
    if (!forceOnline && usbRoot) {
      const bundledZip = path.join(usbRoot, 'runtime', 'weixin-plugin.zip');
      const bundledDir = path.join(usbRoot, 'extensions', 'openclaw-weixin');

      if (fs.existsSync(bundledZip)) {
        this.emit('log', '从本地安装包解压...');
        try {
          // Ensure extensions dir exists
          const targetExtDir = path.join(this.dataDir, '.openclaw', 'extensions');
          if (!fs.existsSync(targetExtDir)) fs.mkdirSync(targetExtDir, { recursive: true });
          // Remove old if exists
          if (fs.existsSync(extDir)) fs.rmSync(extDir, { recursive: true, force: true });
          // Extract zip
          if (process.platform === 'win32') {
            execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${bundledZip}' -DestinationPath '${extDir}' -Force"`, { timeout: 60000 });
          } else {
            fs.mkdirSync(extDir, { recursive: true });
            execSync(`unzip -o "${bundledZip}" -d "${extDir}"`, { timeout: 60000 });
          }
          this._pluginCached = true;
          this._pluginCacheTime = Date.now();
          this._ensurePluginsAllow();
          this.emit('log', '✅ 微信插件安装成功（离线）');
          this.status = 'disconnected';
          this.emit('status', this.status);
          return { success: true, offline: true };
        } catch (e) {
          this.emit('log', `[warn] 离线安装失败: ${e.message}，尝试从本地目录复制...`);
        }
      }

      // Fallback: copy from bundled extensions dir
      if (fs.existsSync(bundledDir)) {
        this.emit('log', '从本地目录复制...');
        try {
          const targetExtDir = path.join(this.dataDir, '.openclaw', 'extensions');
          if (!fs.existsSync(targetExtDir)) fs.mkdirSync(targetExtDir, { recursive: true });
          if (fs.existsSync(extDir)) fs.rmSync(extDir, { recursive: true, force: true });
          this._copyDirSync(bundledDir, extDir);
          // Install dependencies if node_modules is missing
          const zodCheck = path.join(extDir, 'node_modules', 'zod');
          if (!fs.existsSync(zodCheck)) {
            this.emit('log', '安装插件依赖...');
            try {
              const env = Object.assign({}, process.env);
              // Add runtime node to PATH
              const runtimeDir = this.runtimeDir || path.join(this.dataDir, 'openclaw-runtime');
              if (fs.existsSync(runtimeDir)) env.PATH = runtimeDir + path.delimiter + (env.PATH || '');
              execSync('npm install --production --no-optional', {
                cwd: extDir, env, timeout: 120000, stdio: 'ignore', shell: true,
              });
            } catch (depErr) {
              this.emit('log', `[warn] 依赖安装失败: ${depErr.message}`);
            }
          }
          this._pluginCached = true;
          this._pluginCacheTime = Date.now();
          this._ensurePluginsAllow();
          this.emit('log', '✅ 微信插件安装成功（离线）');
          this.status = 'disconnected';
          this.emit('status', this.status);
          return { success: true, offline: true };
        } catch (e) {
          this.emit('log', `[warn] 本地复制失败: ${e.message}，尝试联网安装...`);
        }
      }
    }

    // --- Online install via openclaw CLI ---
    return this._installOnline(extDir, isUpdate);
  }

  _copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) this._copyDirSync(s, d);
      else fs.copyFileSync(s, d);
    }
  }

  /** Online install via `openclaw plugins install` */
  _installOnline(extDir, isUpdate) {
    return new Promise((resolve) => {
      const bin = this._getCliBin();
      const isWin = process.platform === 'win32';

      this.emit('log', '联网下载最新版...');
      console.log(`[wechat] installPlugin online: bin=${bin}, exists=${fs.existsSync(bin)}, isUpdate=${isUpdate}`);

      // For updates: backup old plugin
      let backupDir = null;
      if (isUpdate) {
        backupDir = extDir + '.bak-' + Date.now();
        this.emit('log', '备份旧版插件...');
        try {
          fs.renameSync(extDir, backupDir);
        } catch (e) {
          this.emit('log', `[warn] 备份失败，直接删除旧版: ${e.message}`);
          backupDir = null;
          try { fs.rmSync(extDir, { recursive: true, force: true }); } catch {}
        }
      }

      let proc;
      if (isWin) {
        proc = spawn(`"${bin}" plugins install "${PLUGIN_SPEC}@latest"`, [], {
          env: this._getEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
        });
      } else {
        proc = spawn(bin, ['plugins', 'install', `${PLUGIN_SPEC}@latest`], {
          env: this._getEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
        });
      }

      proc.stdout?.on('data', (d) => {
        const text = d.toString().trim();
        if (text) this.emit('log', text);
      });
      proc.stderr?.on('data', (d) => {
        const text = d.toString().trim();
        if (text) this.emit('log', `[stderr] ${text}`);
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          this._pluginCached = true;
          this._pluginCacheTime = Date.now();
          this.emit('log', isUpdate ? '✅ 微信插件更新成功' : '✅ 微信插件安装成功');
          this.status = 'disconnected';
          this.emit('status', this.status);
          this._ensurePluginsAllow();
          if (backupDir && fs.existsSync(backupDir)) {
            try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch {}
          }
          resolve({ success: true });
        } else {
          this.emit('log', `❌ 安装失败 (exit code ${code})`);
          if (backupDir && fs.existsSync(backupDir) && !fs.existsSync(extDir)) {
            this.emit('log', '恢复旧版插件...');
            try { fs.renameSync(backupDir, extDir); this.emit('log', '已恢复旧版'); } catch {}
          }
          this.status = 'error';
          this.emit('status', this.status);
          resolve({ success: false, error: `exit code ${code}` });
        }
      });

      proc.on('error', (err) => {
        this.emit('log', `❌ 安装失败: ${err.message}`);
        if (backupDir && fs.existsSync(backupDir) && !fs.existsSync(extDir)) {
          this.emit('log', '恢复旧版插件...');
          try { fs.renameSync(backupDir, extDir); this.emit('log', '已恢复旧版'); } catch {}
        }
        this.status = 'error';
        this.emit('status', this.status);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Start QR login process.
   * Spawns `openclaw channels login --channel openclaw-weixin`
   * and captures stdout for QR code URL.
   */
  startLogin() { 
    if (this.loginProcess) {
      this.loginProcess.kill();
      this.loginProcess = null;
    }

    this.status = 'scanning';
    this.emit('status', this.status);

    const bin = this._getCliBin();
    const isWin = process.platform === 'win32';
    console.log(`[wechat] startLogin: bin=${bin}, isWin=${isWin}, runtimeDir=${this.runtimeDir}`);
    if (isWin) {
      this.loginProcess = spawn('cmd', ['/c', `"${bin}"`, 'channels', 'login', '--channel', CHANNEL_ID], {
        env: this._getEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsVerbatimArguments: true,
      });
    } else {
      this.loginProcess = spawn(bin, ['channels', 'login', '--channel', CHANNEL_ID], {
        env: this._getEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });
    }

    console.log(`[wechat] spawn pid=${this.loginProcess.pid}`);

    this.loginProcess.on('error', (err) => {
      console.log(`[wechat] spawn error: ${err.message}`);
      this.emit('log', `[error] ${err.message}`);
      this.status = 'error';
      this.emit('status', this.status);
    });

    let output = '';
    let qrFound = false;

    const processOutput = (data, source) => {
      console.log("processOutput==>",data);
      const text = data.toString();
      output += text;
      console.log(`[wechat] ${source}: ${text}`);
      this.emit('log', source === 'stderr' ? `[stderr] ${text}` : text);

      // Strip ALL ANSI escape codes thoroughly
      const clean = text
        .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1B\][^\x07]*\x07/g, '')
        .replace(/\x1B[^a-zA-Z]*[a-zA-Z]/g, '')
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');

      // Match any URL containing weixin or qrcode
      if (!qrFound) {
        const urlMatch = clean.match(/(https?:\/\/[^\s]+(?:weixin|qrcode)[^\s]*)/);
        if (urlMatch || text.includes("data:image") || text.includes('liteapp.weixin.qq.com')) {
          qrFound = true;
          const url = urlMatch[1].replace(/['"<>]/g, ''); // clean trailing chars
          console.log(`[wechat] Found QR URL: ${url}`); 
          this.emit('qr-url', url);
        }
      }

      // Check for success
      if (clean.includes('微信连接成功') || clean.includes('登录成功') || clean.includes('logged in') || clean.includes('connected')) {
        this.status = 'connected';
        this.emit('status', this.status);
      }

      if (clean.includes('二维码已过期，正在刷新')) {
        qrFound = false;
        this.status = 'refreshing';
        this.emit('status', this.status);
        this.cancelLogin();
      }

      // Check for timeout / multiple expiry
      if (clean.includes('登录超时') || clean.includes('二维码多次过期') || clean.includes('二维码过期次数过多')) {
        qrFound = false;
        this.status = 'disconnected';
        this.emit('status', this.status);
      }
    };

    this.loginProcess.stdout.on('data', (data) => processOutput(data, 'stdout'));
    this.loginProcess.stderr.on('data', (data) => processOutput(data, 'stderr'));

    this.loginProcess.on('exit', (code) => {
      this.loginProcess = null;
      if (code === 0 && this.status === 'scanning') {
        this.status = 'connected';
        this.emit('status', this.status);
      } else if (this.status === 'scanning') {
        this.status = 'disconnected';
        this.emit('status', this.status);
      }
      this.emit('login-exit', code);
    });

    return { success: true };
  }

  /** Cancel ongoing login */
  cancelLogin() {
    if (this.loginProcess) {
      this.loginProcess.kill();
      this.loginProcess = null;
    }
    // If connected, explicitly disconnect the channel so gateway stops routing messages
    if (this.status === 'connected' || this.status === 'scanning') {
      try {
        this._exec(`channels disconnect --channel ${CHANNEL_ID}`, { silent: true, timeout: 5000 });
      } catch {}
    }
    this.status = 'disconnected';
    this.emit('status', this.status);
  }

  /** Check current connection status — checks local session files */
  getStatus() {
    // If we think we're disconnected, check if session files exist (means previously connected)
    if (this.status === 'disconnected' || this.status === 'error') {
      const accountsFile = path.join(this.dataDir, 'openclaw-weixin', 'accounts.json');
      if (fs.existsSync(accountsFile)) {
        try {
          const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf-8'));
          if (Array.isArray(accounts) && accounts.length > 0) {
            this.status = 'connected';
            this.emit('status', 'connected');
          }
        } catch {}
      }
    }
    return this.status;
  }

  /** Restart gateway to pick up new channel config */
  restartGateway() {
    try {
      this._exec('gateway restart');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  destroy() {
    if (this.loginProcess) {
      this.loginProcess.kill();
      this.loginProcess = null;
    }
    // Don't reset status or emit disconnected — session files persist
    this.removeAllListeners();
  }
}

export { WechatManager };
