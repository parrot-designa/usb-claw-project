import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('uclaw', {
  ipcSend: (channel, ...args) => ipcRenderer.send(channel, ...args),
  ipcOpenDashboard: () => ipcRenderer.invoke('open-dashboard'), 
  ipcActivationSuccess: () => ipcRenderer.invoke('activation-success'),   
  ipcWriteOpenClawConfig: ({ models }, type) => ipcRenderer.invoke('write-openclaw-config', { models }, type),
  ipcWriteLicenseFile: (serial, activationCode) => ipcRenderer.invoke('write-license-file', { serial, activationCode }),
  // Gateway control
  ipcStartGateway: () => ipcRenderer.invoke('start-gateway'),
  ipcStopGateway: () => ipcRenderer.invoke('stop-gateway'),
  ipcRestartGateway: () => ipcRenderer.invoke('restart-gateway'),
  // Gateway boot phase listener
  onGatewayBootPhase: (callback) => ipcRenderer.on('gateway-boot-phase', (_, data) => callback(data)),
  offGatewayBootPhase: (callback) => ipcRenderer.removeListener('gateway-boot-phase', callback),
  // Gateway status listener
  onGatewayStatus: (callback) => ipcRenderer.on('gateway-status', (_, data) => callback(data)),
  offGatewayStatus: (callback) => ipcRenderer.removeListener('gateway-status', callback),
  // Gateway log listener
  ipcOnGatewayLog: (callback) => ipcRenderer.on('gateway-log', (_, log) => callback(log)),
  // 扫码本地skill
  ipcScanLocalSkills: () => ipcRenderer.invoke('scan-local-skills'),
  // 启用/禁用 skill
  ipcToggleSkill: (skillName, enabled) => ipcRenderer.invoke('toggle-skill', { skillName, enabled }),
  // WeChat plugin
  ipcGetWeChatStatus: () => ipcRenderer.invoke('get-wechat-status'), 
  // Start WeChat scan (check gateway then get QR code)
  startWeChatScan: async () => { 
    return ipcRenderer.invoke('openclaw-channels-login', { channel: 'openclaw-weixin' });
  },
  // WeChat QR code URL listener
  ipcOnWeChatQrUrl: (callback) => ipcRenderer.on('wechat-qr-url', (_, url) => callback(url)),
  // WeChat scan result listener 
  // WeChat status listener
  ipcOnWeChatStatus: (callback) => ipcRenderer.on('wechat-status', (_, status) => callback(status)),
  ipcOffWeChatStatus: (callback) => ipcRenderer.removeListener('wechat-status', callback),
  // Cancel WeChat scan
  cancelWeChatScan: () => ipcRenderer.invoke('openclaw-wechat-cancel'),
  // Disconnect WeChat
  ipcDisconnectWeChat: () => ipcRenderer.invoke('openclaw-wechat-disconnect'),
  // Desktop error dialog
  ipcShowErrorDialog: (title, message) => ipcRenderer.invoke('show-error-dialog', { title, message }),
  // 路由导航（单窗口模式）
  ipcNavigateTo: (route) => ipcRenderer.invoke('navigate-to', route), 
  ipcCheckStepSerial: () => ipcRenderer.invoke('check-step-serial'),
  ipcCheckStepLicense: (serial) => ipcRenderer.invoke('check-step-license', serial),
  // Step 3.5: 登录接口校验
  ipcCheckStepLogin: ({ serial, activation_code }) => ipcRenderer.invoke('check-step-login', { serial, activation_code }),
  // 获取内存中的 session_cookie
  ipcGetSessionCookie: () => ipcRenderer.invoke('store-get', 'session_cookie'),
  ipcSetRuntimeStore: ({ key, value }) => ipcRenderer.invoke('store-set', { key, value }),
  ipcGetRuntimeStore: (key) => ipcRenderer.invoke('store-get', key),
  // data dir
  ipcGetDataDir: () => ipcRenderer.invoke('get-data-dir'),
  // default port
  ipcGetDefaultPort: () => ipcRenderer.invoke('get-default-port'),
  // restart app
  ipcRestartApp: () => ipcRenderer.invoke('restart-app'),
  // Environment check
  ipcGetNodeVersion: () => ipcRenderer.invoke('get-node-version'),
  ipcGetNpmVersion: () => ipcRenderer.invoke('get-npm-version'),
  ipcGetOpenClawVersion: () => ipcRenderer.invoke('get-openclaw-version'), 
  ipcCheckPort: (port) => {
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
      return Promise.reject(new Error('Invalid port'));
    }
    return ipcRenderer.invoke('check-port', port);
  },
  // Session invalid - show activation window
  ipcShowActivation: () => ipcRenderer.invoke('show-activation'),
  // ImageGen chat history
  ipcSaveImageGenHistory: (messages) => ipcRenderer.invoke('save-image-gen-history', messages),
  ipcLoadImageGenHistory: () => ipcRenderer.invoke('load-image-gen-history'),
  // Image generation
  generateImage: (params) => ipcRenderer.invoke('generate-image', params),
});