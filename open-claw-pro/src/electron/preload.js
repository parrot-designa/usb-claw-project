import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('uclaw', {
  ipcSend: (channel, ...args) => ipcRenderer.send(channel, ...args),
  // 自定义窗口控制
  ipcMinimize: () => ipcRenderer.send('window-minimize'),
  ipcClose: () => ipcRenderer.send('window-close'),
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
  startWeChatScan: () =>  ipcRenderer.invoke('wechat-start-login'),
  // WeChat QR code URL listener
  ipcOnWeChatQrUrl: (callback) => ipcRenderer.on('wechat-qr-url', (_, url) => callback(url)),
  // WeChat scan result listener 
  // WeChat status listener
  ipcOnWeChatStatus: (callback) => ipcRenderer.on('wechat-status', (_, status) => callback(status)),
  ipcOffWeChatStatus: (callback) => ipcRenderer.removeListener('wechat-status', callback),
  // Cancel WeChat scan
  cancelWeChatScan: () => ipcRenderer.invoke('openclaw-wechat-cancel'), 
  // Check if WeChat plugin is installed
  isWechatPluginInstalled: () => ipcRenderer.invoke('is-wechat-plugin-installed'),
  // Update WeChat plugin (force online install)
  updateWeChatPlugin: () => ipcRenderer.invoke('update-wechat-plugin'),
  // Uninstall and reinstall WeChat plugin
  uninstallAndReinstallWeChat: () => ipcRenderer.invoke('uninstall-reinstall-wechat'),
  wechatInstall: () => ipcRenderer.invoke('wechat-install'),
  wechatUninstall: () => ipcRenderer.invoke('wechat-uninstall'),
  ipcOnWechatLog: (callback) => ipcRenderer.on('wechat-log', (_, msg) => callback(msg)),
  ipcOffWechatLog: (callback) => ipcRenderer.removeListener('wechat-log', callback),
  // Desktop error dialog
  ipcShowErrorDialog: (title, message) => ipcRenderer.invoke('show-error-dialog', { title, message }),
  // Desktop confirm dialog
  ipcShowConfirmDialog: (title, message) => ipcRenderer.invoke('show-confirm-dialog', { title, message }),
  // Select download directory
  ipcSelectDownloadDir: () => ipcRenderer.invoke('select-download-dir'),
  // Save file to disk
  ipcSaveFile: ({ filepath, buffer }) => ipcRenderer.invoke('save-file', { filepath, buffer }),
  // Download image (to avoid CORS)
  ipcDownloadImage: ({ url }) => ipcRenderer.invoke('download-image', { url }),
  ipcCheckStepSerial: () => ipcRenderer.invoke('check-step-serial'),
  ipcCheckStepLicense: (serial) => ipcRenderer.invoke('check-step-license', serial),
  // Step 3.5: 登录接口校验
  ipcCheckStepLogin: ({ serial, activation_code }) => ipcRenderer.invoke('check-step-login', { serial, activation_code }),
  // 获取内存中的 session_cookie
  ipcGetSessionCookie: () => ipcRenderer.invoke('store-get', 'session_cookie'),
  // 设置 HTTP Cookie 到 Electron cookie 存储
  ipcSetSessionCookie: (value) => ipcRenderer.invoke('set-session-cookie', value),
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
  // Image sessions
  ipcSaveImageSessions: (sessions, currentSessionId) => ipcRenderer.invoke('save-image-sessions', { sessions, currentSessionId }),
  ipcLoadImageSessions: () => ipcRenderer.invoke('load-image-sessions'),
  // Video sessions
  ipcSaveVideoSessions: (sessions, currentSessionId) => ipcRenderer.invoke('save-video-sessions', { sessions, currentSessionId }),
  ipcLoadVideoSessions: () => ipcRenderer.invoke('load-video-sessions'),
  // Image generation
  generateImage: (params) => ipcRenderer.invoke('generate-image', params),
  // Save image to local media directory
  ipcSaveMediaImage: ({ url, taskId }) => ipcRenderer.invoke('save-media-image', { url, taskId }),
  // Save video to local media directory
  ipcSaveMediaVideo: ({ url, taskId }) => ipcRenderer.invoke('save-media-video', { url, taskId }),
  // 历史作品 message.json 读写
  ipcLoadMessageJson: () => ipcRenderer.invoke('load-message-json'),
  ipcSaveMessageJson: (messages) => ipcRenderer.invoke('save-message-json', { messages }),
  ipcOpenMediaFolder: () => ipcRenderer.invoke('open-media-folder'),
  ipcOpenMediaImageFolder: () => ipcRenderer.invoke('open-media-image-folder'),
  ipcOpenMediaVideoFolder: () => ipcRenderer.invoke('open-media-video-folder'),
});