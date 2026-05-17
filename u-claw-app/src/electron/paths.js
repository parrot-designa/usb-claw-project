import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import crypto from 'crypto';
import { deriveKeyFromSerial, aesGcmEncrypt, aesGcmDecrypt } from './license.js';
import { updateSplash } from "./window-manager.js";
import { exec,spawn, execSync } from 'child_process';
import { IS_DEV, GATEWAY_DEFAULT_PORT } from './utils/env.js';
import { runtimeStore } from './utils/runtime-store.js';

// ============================================================
// 内部状态
// ============================================================
let _appRoot = null;
let _dataRoot = null;
let _configDir = null;
let _configPath = null;
let _resourcesPath = null;
 
const DIR_DATA = 'data';
const DIR_OPENCLAW = '.openclaw';  
const DIR_SKILLS = 'skills';  
const DIR_RUNTIME = 'runtime';  

const FILE_CONFIG = 'openclaw.json'; 
const FILE_LICENSE = '.license'; 
const FILE_OPENCLAW_MJS = 'openclaw.mjs'; 
 
function getLocalBase() {
  // LOCALAPPDATA → C:\Users\<用户名>\AppData\Local（本地，非漫游）
  // APPDATA → C:\Users\<用户名>\AppData\Roaming（漫游配置）
  const appData = process.env.LOCALAPPDATA || process.env.APPDATA;
  if (appData) {
    const candidate = path.join(appData, 'OpenClawPro');
    // If path contains non-ASCII chars (e.g. Chinese username), use drive root instead
    if (!/[^\x00-\x7F]/.test(candidate)) {
      return candidate;
    }
    console.log(`[runtime] Non-ASCII path detected: ${candidate}, using fallback`);
  }
  const drive = process.env.SystemDrive || 'C:';
  return path.join(drive, 'OpenClawPro');
}

const localBase = getLocalBase();
export const RUNTIME_DIR = path.join(localBase, 'runtime');

/**
 * 获取 App Root 路径
 * @param {Electron.App} app - Electron app 实例
 * @returns {string}
 * appRoot: dev=u-claw-app/, prod=实际app根目录(.app/或win-unpacked同级)
 * 生产中app.getPath('exe') mac .app/Contents/MacOS/P-Claw runtime 放Contents下面放就行
 * 生产中app.getPath('exe') win win/P-Claw.exe
 */
function getAppRoot() {
  if (_appRoot) return _appRoot;

  if (!IS_DEV) {
    _appRoot = path.resolve(path.dirname(app.getPath('exe')), '..');
    return _appRoot;
  }

  // dev: u-claw-app/
  _appRoot = path.resolve(import.meta.dirname, '..', '..');
  return _appRoot;
}

// ============================================================
// Data Root / Config Dir / Config Path
// ============================================================

/**
 * 获取 Data Root 路径
 * @returns {string}
 */
function getDataRoot() {
  if (_dataRoot) return _dataRoot;
  _dataRoot = path.join(getAppRoot(), DIR_DATA);
  return _dataRoot;
}

/**
 * 获取 Config 目录路径
 * @returns {string}
 */
function readJsonFileDir() {
  if (_configDir) return _configDir;
  _configDir = path.join(getDataRoot(), DIR_OPENCLAW);
  return _configDir;
}

/**
 * 获取 Config 文件路径
 * @returns {string}
 */
function readJsonFilePath() {
  if (_configPath) return _configPath;
  _configPath = path.join(readJsonFileDir(), FILE_CONFIG);
  return _configPath;
}

/**
 * 读取配置文件内容
 * @param {string} configPath - 配置文件路径
 * @returns {object|null} - 解析后的配置对象，失败返回 null
 */
function readJsonFile(configPath) {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`[Config] 读取文件失败: ${e.message}`);
    return null;
  }
}

// ============================================================
// Resources Path
// ============================================================

/**
 * 获取 Resources 路径
 * @returns {string}
 */
function getResourcesPath() {
  if (_resourcesPath) return _resourcesPath;
  _resourcesPath = !IS_DEV
    ? path.join(process.resourcesPath, 'app', 'src')
    : path.join(import.meta.dirname, '..', 'src');
  return _resourcesPath;
}

function getAssetsPath() {
  return path.join(getResourcesPath(), 'assets');
}

/**
 * 获取 OpenClaw 入口文件路径
 * @returns {string}
 */
function getOpenClawEntry() {
  return path.join(getOpenClawPath(), FILE_OPENCLAW_MJS);
}
 

 
/**
 * 获取 License 文件路径
 * @param {Electron.App} app
 * @returns {string}
 */
function getLicensePath() {
  return path.join(getAppRoot(), FILE_LICENSE);
}

/**
 * 创建 License 文件
 * @param {Electron.App} app
 * @returns {object|null}
 */
function createLicenseFile() {
  const filePath = getLicensePath();
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify({}), 'utf-8');
    } catch {
      console.log("创建.license文件失败")
    }
  }
}

/**
 * 加密写入序列号和激活码到 .license 文件（捆绑加密）
 * @param {string} serial - 序列号
 * @param {string} activation_code - 激活码
 * @returns {boolean} - 是否写入成功
 */
function writeLicenseFile(serial, activation_code) {

  createLicenseFile();

  try {
    const key = deriveKeyFromSerial(serial);
    const encrypted = aesGcmEncrypt(JSON.stringify({ serial, activation_code }), key);
    const licenseData = { v: 1, ...encrypted };
    fs.writeFileSync(getLicensePath(), JSON.stringify(licenseData));
    console.log(`[License] 写入成功: ${getLicensePath()}`);
    return true;
  } catch (e) {
    console.error('[License] 写入失败:', e.message);
    return false;
  }
}

/**
 * 从 .license 文件解密读取序列号和激活码
 * @returns {{ serial: string, activation_code: string }|null} - 序列号和激活码对象
 */
function readLicenseFile(serial) {
  const filePath = getLicensePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const licenseData = JSON.parse(raw);
    const key = deriveKeyFromSerial(serial);
    const decrypted = aesGcmDecrypt(licenseData, key);
    const parsed = JSON.parse(decrypted);
    return {
      serial: parsed.serial || null,
      activation_code: parsed.activation_code || null,
    };
  } catch (e) {
    console.error('[License] 读取/解密失败:', e.message);
    return null;
  }
}
  

// 更新 plugins 字段
function updatePluginsField(config, plugins) {
  if (!config.plugins) config.plugins = {};
  if (!config.plugins.load) config.plugins.load = {};
  if (!config.plugins.entries) config.plugins.entries = {};
  if (!config.plugins.allow) config.plugins.allow = [];
 
  config.plugins.load.paths = [...plugins.load.paths];  

  if (plugins.entries) {
      Object.assign(config.plugins.entries, plugins.entries);
  }
  if (plugins.allow) { 
    config.plugins.allow=[...plugins.allow];
  }
  return config;
}

// 更新 models 字段
function updateModelsField(config, modelsData) {
  const { models } = modelsData; 

  // Initialize models section
  if (!config.models) config.models = { mode: 'replace', providers: {} };
  if (!config.models.providers) config.models.providers = {};

  // Initialize agents section
  if (!config.agents) config.agents = {};
  if (!config.agents.defaults) config.agents.defaults = {};
  if (!config.agents.defaults.model) config.agents.defaults.model = {};
  if (!config.agents.defaults.models) config.agents.defaults.models = {};
  if (!config.agents.defaults.compaction) config.agents.defaults.compaction = {};

  // Group models by provider
  const providerMap = {};
  let currentModel = null;

  for (const model of models) {
    // Official source uses 'claw-proxy', others use their own provider name
    const providerName = model.source === 'official' ? 'OpenClawPro' : model.provider;
    const modelId = model.source === 'official' ? model.label : model.model || model.value;

    // Track current model
    if (model.isCurrent) {
      currentModel = `${providerName}/${modelId}`;
    }

    if (!providerMap[providerName]) {
      providerMap[providerName] = {
        apiKey: model.key || '',
        baseUrl: model.url || model.base || '',
        api: model.api || 'openai-completions',
        models: []
      };
    }

    // Add model to provider's models list
    providerMap[providerName].models.push({
      id: modelId,
      name: model.label,
      input: ['text', 'image'],
      contextWindow: 128000,
      maxTokens: 4096
    });

    // Build agents.defaults.models entry
    config.agents.defaults.models[`${providerName}/${modelId}`] = {
      alias: `${providerName}/${modelId}`
    };
  }

  // Write all providers to config
  for (const [providerName, providerConfig] of Object.entries(providerMap)) {
    config.models.providers[providerName] = providerConfig;
  }

  // Set primary model from current model
  if (currentModel) {
    config.agents.defaults.model.primary = currentModel;
  }

  // Set default compaction mode
  config.agents.defaults.compaction.mode = 'safeguard';

  return config;
}

// 更新 skills 字段
function updateSkillsField(config, skills) {
  if (!config.skills) config.skills = {};
  if (!config.skills.load) config.skills.load = {};

  if (skills.load?.extraDirs) {
    if (!config.skills.load.extraDirs) {
      config.skills.load.extraDirs = [...skills.load.extraDirs];
    } else {
      for (const dir of skills.load.extraDirs) {
        if (!config.skills.load.extraDirs.includes(dir)) {
          config.skills.load.extraDirs.push(dir);
        }
      }
    }
  }
  // 更新 skill.entries (用于启用/禁用单个 skill)
  if (skills.entries) {
    if (!config.skills.entries) config.skills.entries = {};
    Object.assign(config.skills.entries, skills.entries);
  }
  return config;
}

// 更新 channels 字段
function updateChannelsField(config, channels) {
  if (!config.channels) config.channels = {};
  if (channels?.["openclaw-weixin"]) {
    if (!config.channels["openclaw-weixin"]) {
      config.channels["openclaw-weixin"] = {};
    }
    if (channels["openclaw-weixin"].accounts !== undefined) {
      config.channels["openclaw-weixin"].accounts = channels["openclaw-weixin"].accounts;
    }
  }
  return config;
}

// 统一写入 OpenClaw 配置（只接收变化的字段，完整配置内部构建）
async function writeOpenClawConfig({ models, skills, plugins, channels } = {}, type) {
  const configPath = readJsonFilePath();
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log(`[wocc] 读取现有配置成功, gateway.bind=${config.gateway?.bind}, type=${type}`);
  } catch (e) {
    config = {};
    console.warn(`[wocc] 读取配置文件失败，使用空配置: ${e.message}`);
  }


  // 按 key 分别更新
  if (type === "plugins") {
    config = updatePluginsField(config, plugins); 
  }
  if (type === "skills") {
    config = updateSkillsField(config, skills);
  }
  if (type === "model") {
    config = updateModelsField(config, { models });
  }
  if (type === "channels") {
    config = updateChannelsField(config, channels);
  }
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`[wocc] 配置已保存, gateway.bind=${config.gateway?.bind}, type=${type}`);
  } catch (e) {
    console.error(`写入 openaw.json 失败:`, e.message);
  }
}

// ============================================================
// Token 生成与存储
// ============================================================

/**
 * 生成新 gateway token 并同步到 runtimeStore 和 openclw.json
 * @returns {string} 新生成的 token
 */
function generateAndStoreGatewayToken() {
  const newToken = crypto.randomBytes(32).toString('hex');
  runtimeStore.gatewayToken = newToken;
  console.log(`[Token] 生成新 token: ${newToken}`);

  const configPath = readJsonFilePath();
  try {
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`[Token] 读取现有配置, gateway.bind=${config.gateway?.bind}`);
    } else {
      console.log(`[Token] 配置文件不存在，将创建新配置`);
    }
    if (!config.gateway) config.gateway = {};
    if (!config.gateway.auth) config.gateway.auth = {};
    config.gateway.auth.token = newToken;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Token] openw.json 已更新, gateway.bind=${config.gateway?.bind}`);
  } catch (e) {
    console.error(`[Token] 更新 openaw.json 失败:`, e.message);
  }

  return newToken;
}

// ============================================================
// OpenClaw 目录初始化
// ============================================================

/**
 * 创建 OpenClaw 所需的目录结构
 */
async function ensureOpenClawDirectories() {
  console.log('[ensureOpenClawDirectories] 开始执行');
  const configDir = readJsonFileDir();
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(path.join(configDir, 'workspace', 'memory'), { recursive: true });
  fs.mkdirSync(path.join(configDir, 'backups'), { recursive: true });
  fs.mkdirSync(path.join(configDir, 'workspace'), { recursive: true });
  fs.mkdirSync(path.join(configDir, 'media'), { recursive: true });

  const configPath = readJsonFilePath();
  const appRoot = getAppRoot();
  const appSkillsDir = path.join(appRoot, DIR_SKILLS);

  if (!fs.existsSync(configPath)) {
    updateSplash('正在初始化openclaw配置文件...', 100);
    const initialConfig = {
      gateway: {
        mode: 'local',
        bind: "loopback",
        port: Number(GATEWAY_DEFAULT_PORT),
        auth: {
          token: "newToken"
        },
        controlUi: {
            allowedOrigins: [
              "file://",
              "http://localhost",
              "http://localhost:5173",
              "http://127.0.0.1:5173",
              "http://localhost:18789",
              "http://127.0.0.1:18789",
              "app://",
              "null"
            ]
        }
      },
      skills: {
        load: {
          extraDirs: [appSkillsDir]
        }
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf-8');
  } else {
    // openclaw.json 存在，将 skills 初始化为 appSkillsDir
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!config.skills) config.skills = {};
      if (!config.skills.load) config.skills.load = {};
      if (!config.skills.load.extraDirs) config.skills.load.extraDirs = [];
      if (config.skills.load.extraDirs.length > 0) {
        config.skills.load.extraDirs = [appSkillsDir];
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[ensureOpenClawDirectories] 已将 skills 初始化为 appSkillsDir');
    } catch (e) {
      console.error('[ensureOpenClawDirectories] 更新配置文件失败:', e.message);
    }
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}
 

function getMediaDir() {
  return path.join(getDataRoot(), DIR_OPENCLAW, 'media');
}

function getPaths() {
  const appRoot = getAppRoot();
  const dataRoot = getDataRoot();
  const configDir = readJsonFileDir();
  const configPath = readJsonFilePath();
  const resourcesPath = getResourcesPath();
  const openclawPath = getOpenClawPath();
  const openclawEntry = getOpenClawEntry();
  return { appRoot, dataRoot, configDir, configPath, resourcesPath, openclawPath, openclawEntry };
}

// 获取执行node的包
function getNodeBin() {
  const platform = process.platform;
  const arch = process.arch;
  const nodeDir = !IS_DEV
    ? path.join(getAppRoot(), 'runtime', 'js', `node-${platform}-${arch}`)
    : path.join(import.meta.dirname, '..', 'runtime', 'js', `node-${platform}-${arch}`);
  const nodeBin = platform === 'win32'
    ? path.join(nodeDir, 'node.exe')
    : path.join(nodeDir, 'bin', 'node');
  if (fs.existsSync(nodeBin)) return nodeBin;
  return 'node';
}

// 获取执行npm的包
function getNpmBin() {
  const platform = process.platform;
  const arch = process.arch;
  const nodeDir = !IS_DEV
    ? path.join(getAppRoot(), 'runtime', 'js', `node-${platform}-${arch}`)
    : path.join(import.meta.dirname, '..','..','runtime', 'js', `node-${platform}-${arch}`);
    console.log("nodeDir==>",nodeDir);
  const npmBin = platform === 'win32'
    ? path.join(nodeDir, 'npm')
    : path.join(nodeDir, 'bin', 'npm');
  if (fs.existsSync(npmBin)) return npmBin;
  return 'npm';
} 

// Extract runtime from zip files on first launch
// runtime/ on USB contains: node.exe + openclaw.zip + weixin-plugin.zip
// Extracts to data/runtime/ (persistent on USB, survives restarts)
async function extractRuntime() {
  const runtimeSrc = path.join(getAppRoot(), DIR_RUNTIME);

  // 清除历史有问题文件夹 
  if (fs.existsSync(RUNTIME_DIR) && !fs.existsSync(path.join(RUNTIME_DIR, '.extracted')) && !fs.existsSync(path.join(RUNTIME_DIR, 'openclaw.cmd'))) {
    console.log('[runtime] Removing broken local runtime from old version');
    try { fs.rmSync(RUNTIME_DIR, { recursive: true, force: true }); } catch {}
  }

  // 目录下存在.extracted 跳过解压
  if (fs.existsSync(path.join(RUNTIME_DIR, '.extracted'))) {
    console.log('[runtime] Already extracted, skipping');
    return;
  }

  // 如果不存在runtime文件夹 直接跳过
  if (!fs.existsSync(runtimeSrc)) {
    console.log('[runtime] No runtime/ directory found');
    return;
  }

  // 检查一下是否有zip
  if (!fs.existsSync(path.join(runtimeSrc, 'openclaw.zip'))) {
    console.log('[runtime] No openclaw.zip found, using USB runtime directly');
    return;
  }

  console.log('[runtime] Extracting runtime (first launch)...'); 
  updateSplash('首次运行，正在初始化环境...', 5);
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });

  // Helper: async extract zip with animated progress
  // Uses tar (native C, 10x faster than PowerShell Expand-Archive) with fallback
  const extractZip = (zipPath, destPath, startPct, endPct) => new Promise((resolve, reject) => {
    let pct = startPct;
    const ticker = setInterval(() => {
      if (pct < endPct - 2) { pct += 1; }
    }, 1000);
    // Try tar first (Windows 10+ built-in, much faster)
    const ps = spawn('tar', ['-xf', zipPath, '-C', destPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    ps.on('exit', (code) => {
      console.log("监听解压退出1===》",code);
      clearInterval(ticker);
      if (code === 0) { resolve(); return; }
      // Fallback to PowerShell if tar fails
      console.log('[runtime] tar failed, falling back to PowerShell...');
      const ps2 = spawn('powershell', ['-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      ps2.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`exit code ${c}`)));
      ps2.on('error', reject);
    });
    ps.on('error', () => {
      console.log("监听解压退出2===》")
      clearInterval(ticker);
      // tar not found, use PowerShell
      const ps2 = spawn('powershell', ['-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      ps2.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`exit code ${c}`)));
      ps2.on('error', reject);
    });
  });

  // 1. Copy node.exe to local runtime (openclaw.cmd needs it in same dir)
  const nodeSrc = path.join(runtimeSrc, 'node.exe');
  const nodeDest = path.join(RUNTIME_DIR, 'node.exe');
  if (fs.existsSync(nodeSrc) && !fs.existsSync(nodeDest)) { 
    updateSplash('正在复制 Node.js 运行时...', 8);
    fs.copyFileSync(nodeSrc, nodeDest);
    console.log('[runtime] Copied node.exe');
  }

  // 2. Extract openclaw.zip → local runtime/
  const openclawZip = path.join(runtimeSrc, 'openclaw.zip');
  let extractOk = true;
  if (fs.existsSync(openclawZip)) {
    try {
      console.log('[runtime] Extracting openclaw.zip...'); 
      updateSplash('正在解压 OpenClaw 核心组件...\n（首次可能需要 1-3 分钟）', 20);
      await extractZip(openclawZip, RUNTIME_DIR, 20, 70);
      updateSplash('OpenClaw 核心组件就绪', 70);
      console.log('[runtime] openclaw.zip extracted');
    } catch (e) {
      extractOk = false;
      console.log(`[runtime] Failed to extract openclaw.zip: ${e.message}`); 
      updateSplash('解压失败: ' + e.message);
    }
  }



  // weixin-plugin: kept as loose files in USB extensions/, no extraction needed

  // 3. Also copy any loose files (non-zip) from runtime/ to local runtime/
  if (fs.existsSync(runtimeSrc)) {
    for (const entry of fs.readdirSync(runtimeSrc)) {
      if (entry.endsWith('.zip') || entry === 'node.exe') continue;
      const src = path.join(runtimeSrc, entry);
      const dest = path.join(RUNTIME_DIR, entry);
      if (!fs.existsSync(dest)) {
        if (fs.statSync(src).isDirectory()) copyDirSync(src, dest);
        else fs.copyFileSync(src, dest);
      }
    }
  }

  // Verify critical files exist after extraction
  const criticalFiles = ['openclaw.cmd', 'node.exe'];
  const missingFiles = criticalFiles.filter(f => !fs.existsSync(path.join(RUNTIME_DIR, f)));
  if (missingFiles.length > 0) {
    extractOk = false;
    console.log(`[runtime] Missing critical files after extraction: ${missingFiles.join(', ')}`); 
    updateSplash(`解压不完整，缺少: ${missingFiles.join(', ')}`);
  }

  if (extractOk) {
    // Mark as extracted only if everything succeeded
    fs.writeFileSync(path.join(RUNTIME_DIR, '.extracted'), Date.now().toString());
    console.log('[runtime] Extraction complete'); 
    updateSplash('环境初始化完成！', 90);
  } else {
    console.log('[runtime] Extraction incomplete, will retry on next launch'); 
    updateSplash('环境初始化未完成，请使用环境检查修复', 90);
  }
}

function getOpenClawPath() {
  // Local extracted first (faster than USB)
  const extractedCli = path.join(RUNTIME_DIR, 'openclaw.cmd');
  if (fs.existsSync(extractedCli)) return extractedCli; 
  return 'openclaw';
}



/**
 * 写入 DNS Hook 文件，使 openrouter.ai 解析到 127.0.0.1。
 * Gateway 子进程通过 NODE_OPTIONS=--require 预加载此 hook，
 * 避免因国内网络无法访问 openrouter.ai 导致启动时价格请求阻塞 15 秒。
 */
function writeDnsHook() {
  const hookPath = path.join(RUNTIME_DIR, 'dns-hook.cjs');
  if (fs.existsSync(hookPath)) return hookPath;
  const content = `\
// DNS Hook: redirect openrouter.ai → 127.0.0.1 for fast-fail on pricing bootstrap
const dns = require('dns');
const origLookup = dns.lookup;
dns.lookup = function(hostname, options, cb) {
  if (typeof hostname === 'string' && (hostname === 'openrouter.ai' || hostname.endsWith('.openrouter.ai'))) {
    if (typeof options === 'function') { cb = options; }
    process.nextTick(() => cb(null, '127.0.0.1', 4));
    return;
  }
  origLookup.apply(this, arguments);
};
`;
  try {
    fs.writeFileSync(hookPath, content, 'utf-8');
    return hookPath;
  } catch (e) {
    console.error(`[DNS Hook] 写入失败: ${e.message}`);
    return null;
  }
}

function getGatewayEnv() {
  // Local runtime first (faster), USB as fallback
  const usbRuntime = path.join(getAppRoot(), 'runtime');
  const paths = [];
  if (fs.existsSync(path.join(RUNTIME_DIR, 'openclaw.cmd')) || fs.existsSync(path.join(RUNTIME_DIR, 'node_modules'))) {
    paths.push(RUNTIME_DIR);
  }
  if (fs.existsSync(usbRuntime)) {
    paths.push(usbRuntime);
  }
  const runtimePath = paths[0] || RUNTIME_DIR;

  // DNS Hook：让 openrouter.ai 解析到 127.0.0.1 快速失败，避免启动时定价请求阻塞 15 秒
  const dnsHookPath = writeDnsHook();
  const nodeOptions = [
    dnsHookPath ? `--require=${dnsHookPath}` : '',
    process.env.NODE_OPTIONS
  ].filter(Boolean).join(' ');

  // NO_PROXY：阻止 openrouter.ai 走用户中转代理，确保 DNS Hook 生效
  const noProxy = [
    'openrouter.ai',
    process.env.NO_PROXY
  ].filter(Boolean).join(',');

  return {
    ...process.env,
    OPENCLAW_HOME: getDataRoot(),
    OPENCLAW_WORKSPACE: path.join(getDataRoot(), '.openclaw', 'workspace'),
    NODE_PATH: path.join(runtimePath, 'node_modules'),
    PATH: `${paths.join(path.delimiter)}${path.delimiter}${process.env.PATH}`,
    NODE_OPTIONS: nodeOptions,
    NO_PROXY: noProxy,
  };
}


export {
  getLocalBase,
  getAppRoot,
  getDataRoot,
  getMediaDir,
  readJsonFileDir,
  readJsonFilePath,
  getOpenClawPath,
  getOpenClawEntry,
  deriveKeyFromSerial,
  readLicenseFile,
  getLicensePath,
  createLicenseFile,
  writeLicenseFile,
  getPaths,
  getResourcesPath,
  getAssetsPath,
  readJsonFile,
  ensureOpenClawDirectories,
  generateAndStoreGatewayToken,
  writeOpenClawConfig,
  getNodeBin,
  getNpmBin,
  extractRuntime,
  getGatewayEnv
};