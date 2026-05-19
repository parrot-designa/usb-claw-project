<template>
  <div class="chat-chat-view"> 

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        class="chat-chat-tool-tab"
        :class="{ 'chat-active': activeChatTab === 'wechat' }"
        @click="activeChatTab = 'wechat'"
      >
        <img src="@assets/wechat.png" alt="wechat" style="width:20px;height:20px;vertical-align:middle;" />
        <span>微信</span>
      </button>
      <button
        class="chat-chat-tool-tab"
        :class="{ 'chat-active': activeChatTab === 'feishu' }"
        @click="activeChatTab = 'feishu'"
      >
       <img src="@assets/feishu.png" alt="wechat" style="width:20px;height:20px;vertical-align:middle;" />
        <span>飞书</span>
      </button>
    </div>

    <!-- WeChat Tab -->
    <div v-show="activeChatTab === 'wechat'" class="chat-chat-content">
      <!-- ========== CONNECTED ========== -->
      <div v-if="wechatStore.status === 'connected'" class="chat-wechat-card">
        <div class="chat-success-icon">✓</div>
        <h2 class="chat-wechat-title">微信助手已连接成功</h2>
        <p class="chat-wechat-desc">在微信中给 AI 发消息即可对话</p>
        <div class="chat-wechat-actions">
          <button @click="startScan" class="chat-btn-scan">
            🔄 重新扫码
          </button>
          <button @click="disconnectWeChat" class="chat-btn-disconnect">
            断开连接
          </button>
          <button @click="uninstallAndReinstall" class="chat-btn-reinstall">
            🗑️ 卸载重装
          </button>
        </div>
      </div>

      <!-- ========== INSTALLING ========== -->
      <div v-else-if="wechatStore.status === 'installing'" class="chat-wechat-card">
        <div class="chat-spinner">⟳</div>
        <h2 class="chat-wechat-title">正在安装微信插件...</h2>
        <p class="chat-wechat-desc">首次连接需要安装，请稍候</p>
        <div v-if="wechatStore.logs.length" class="chat-install-logs">
          <div v-for="(log, i) in wechatStore.logs" :key="i" class="chat-install-log-line">{{ log }}</div>
        </div>
      </div>

      <!-- ========== SCANNING ========== -->
      <div v-else-if="wechatStore.status === 'scanning'" class="chat-wechat-card">
        <!-- 有二维码 -->
        <template v-if="wechatStore.qrCodeUrl || wechatStore.qrCodeAscii">
          <div v-if="wechatStore.qrCodeUrl" class="chat-qr-container">
            <img :src="wechatStore.qrCodeUrl" alt="微信登录二维码" class="chat-qr-image" />
          </div>
          <div v-else-if="wechatStore.qrCodeAscii" class="chat-qr-container chat-qr-ascii">
            <pre>{{ wechatStore.qrCodeAscii }}</pre>
          </div>
          <p class="chat-qr-hint">请用手机微信扫描上方二维码</p>
        </template>
        <!-- 等待二维码 -->
        <template v-else>
          <div class="chat-spinner">⟳</div>
          <h2 class="chat-wechat-title">等待二维码...</h2>
        </template>

        <div class="chat-wechat-actions">
          <button @click="startScan" class="chat-btn-scan">
            重新生成
          </button>
          <button @click="cancelScan" class="chat-btn-cancel-danger">
            取消
          </button>
        </div>
      </div>

      <!-- ========== ERROR ========== -->
      <div v-else-if="wechatStore.status === 'error'" class="chat-wechat-card">
        <div class="chat-error-icon">✗</div>
        <h2 class="chat-wechat-title">连接失败</h2>
        <p class="chat-wechat-desc">请查看下方日志排查问题，或重试</p>
        <div v-if="wechatStore.logs.length" class="chat-install-logs">
          <div v-for="(log, i) in wechatStore.logs" :key="i" class="chat-install-log-line">{{ log }}</div>
        </div>
        <div class="chat-wechat-action">
          <button @click="retryConnection" class="chat-btn-scan">
            重试
          </button>
        </div>
      </div>

      <!-- ========== DISCONNECTED: 插件未安装 ========== -->
      <div v-else-if="wechatStore.isInstalled === false" class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="@assets/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">一键安装微信插件</h2>
        <p class="chat-wechat-desc">安装后扫码连接微信，让 AI 自动回复消息</p>

        <div class="chat-install-steps">
          <p class="chat-install-steps-title">流程：</p>
          <p>1. 点击安装，自动下载微信插件</p>
          <p>2. 安装完成后出现二维码</p>
          <p>3. 用手机微信扫码即可连接</p>
        </div>

        <div class="chat-wechat-action">
          <button @click="startInstall" class="chat-btn-install-primary">
            🚀 开始安装
          </button>
        </div>
      </div>

      <!-- ========== DISCONNECTED: 插件已安装 ========== -->
      <div v-else class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="@assets/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">连接微信</h2>
        <p class="chat-wechat-status-installed">✅ 插件已安装</p>
        <p class="chat-wechat-desc">扫码连接后，在微信中给 AI 发消息即可对话</p>

        <div class="chat-wechat-actions">
          <button @click="startScan" class="chat-btn-scan">
            🔗 扫码连接
          </button>
          <button @click="updatePlugin" class="chat-btn-update">
            🔄 联网更新
          </button>
          <button @click="uninstallAndReinstall" class="chat-btn-reinstall">
            🗑️ 卸载重装
          </button>
        </div>
      </div>

      <div class="chat-tip-card">
        <span>💡</span>
        <p>连接后，在微信里给AI发消息即可对话，断开后需要重新扫码。</p>
      </div>
    </div>

    <!-- Feishu Tab -->
    <div v-show="activeChatTab === 'feishu'" class="chat-chat-content">
      <div class="chat-feishu-card">
        <p class="text-on-surface-variant text-sm">飞书功能开发中...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useToast } from '../composables/useToast';
import { useWechatStore } from '../stores/wechat';

const { showToast } = useToast();
const wechatStore = useWechatStore();
const activeChatTab = ref('wechat');

onMounted(async () => {
  checkWeChatStatus();
  wechatStore.checkInstalled();
});

watch(() => wechatStore.status, (status) => {
  if (status === 'connected') {
    wechatStore.checkInstalled();
  }
});

async function checkWeChatStatus() {
  try {
    const result = await window.uclaw.ipcGetWeChatStatus();
    wechatStore.setStatus(result === 'refreshing' ? 'scanning' : result);
  } catch (e) {
    console.error('检测微信状态失败:', e);
  }
}

function retryConnection() {
  wechatStore.setStatus('disconnected');
}
 
 
async function startScan() {
  wechatStore.clearQrCode();

  window.uclaw.ipcOnWeChatQrUrl((url) => {
    console.log('WeChat QR URL received:', url);
    wechatStore.setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`, '');
  });

  try {
    const result = await window.uclaw.startWeChatScan();
    if (result?.error) {
      showToast(result.error, true);
      wechatStore.clearQrCode();
    } else {
      const output = result?.stdout || result?.stderr || '';
      const urlMatch = output.match(/https:\/\/liteapp\.weixin\.qq\.com\/q\/[^\s]+/);
      if (urlMatch) {
        wechatStore.setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlMatch[0])}`, '');
      } else if (output.includes('data:image')) {
        wechatStore.setQrCode('', output.trim());
      }
    }
  } catch (e) {
    showToast('扫码启动失败', true);
    wechatStore.clearQrCode();
  }
}

async function cancelScan() {
  await window.uclaw.cancelWeChatScan(); 
}

async function disconnectWeChat() {
  try {
    await window.uclaw.ipcDisconnectWeChat();
    showToast('微信已断开');
  } catch (e) {
    console.error('断开微信失败:', e);
    showToast('断开失败: ' + e.message, true);
    wechatStore.clearQrCode();
    return;
  }
  wechatStore.clearQrCode();
}

async function startInstall() {
  wechatStore.clearLogs();
  wechatStore.setStatus('installing');
  try {
    const result = await window.uclaw.wechatInstall();
    if (result?.success) {
      wechatStore.checkInstalled();
    } else {
      showToast(result?.error || '安装失败', true);
      wechatStore.setStatus('disconnected');
    }
  } catch (e) {
    showToast('安装失败: ' + e.message, true);
    wechatStore.setStatus('disconnected');
  }
}

async function updatePlugin() {
  try {
    showToast('正在联网更新微信插件...');
    const result = await window.uclaw.updateWeChatPlugin();
    if (result?.success) {
      showToast('微信插件更新成功');
    } else {
      showToast(result?.error || '更新失败', true);
    }
  } catch (e) {
    showToast('更新失败: ' + e.message, true);
  }
  wechatStore.checkInstalled();
}

async function uninstallAndReinstall() {
  try {
    showToast('正在卸载并重新安装微信插件...');
    const result = await window.uclaw.uninstallAndReinstallWeChat();
    if (result?.success) {
      showToast('微信插件重新安装成功');
    } else {
      showToast(result?.error || '重装失败', true);
    }
  } catch (e) {
    showToast('重装失败: ' + e.message, true);
  }
  wechatStore.checkInstalled();
}

</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.chat-chat-view {
  padding: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface);
  border-radius: 8px;
  width: fit-content;
  margin-bottom: 12px;
}

.chat-chat-tool-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;

  &.chat-active {
    background: var(--accent);
    color: white;
  }
}

.chat-chat-content {
  margin-top: 16px;
  
}

.chat-wechat-card {
  @extend %card-base;
  padding: 20px;
  max-width: 600px;
  text-align: center;
}

.chat-wechat-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 50px;
  }
}

.chat-wechat-title {
  font-size: 16px;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.chat-wechat-status {
  margin-bottom: 8px;
}

.chat-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.chat-wechat-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.chat-install-logs {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 10px 12px;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  margin-bottom: 16px;
}

.chat-install-log-line {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: #a0a0a0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.chat-placeholder {
  visibility: hidden;
}

.chat-process-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: left;
}

.chat-process-title {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.chat-process-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text-primary);
}

.chat-process-step {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--secondary-container);
  color: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 400;
  flex-shrink: 0;
}

.chat-wechat-action {
  display: flex;
  justify-content: center;
}

.chat-wechat-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.chat-install-steps {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
  line-height: 1.8;
  margin-bottom: 16px;
}

.chat-install-steps-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-wechat-status-installed {
  font-size: 14px;
  color: #22c55e;
  margin-bottom: 8px;
}

.chat-btn-install-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 32px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #15803d;
  }
}

.chat-btn-install,
.chat-btn-scan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 400;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.chat-btn-update {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--surface-container-high);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--surface-variant);
  }
}

.chat-btn-reinstall {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: rgba(220, 38, 38, 0.1);
  color: #f87171;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(220, 38, 38, 0.2);
  }
}

.chat-tip-card { 
  padding: 12px;
  margin-top: 12px;
  max-width: 600px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  @extend %card-base;


  .iconfont {
    color: var(--accent);
    font-size: 16px;
    flex-shrink: 0;
  }

  p {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 2;
  }
}

.chat-feishu-card {
  background: var(--surface-low);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.text-on-surface-variant {
  color: var(--text-secondary);
}

.text-sm {
  font-size: 14px;
}

.chat-btn-install.spinning .icon-clawinstall-fill,
.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.chat-success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(5, 150, 105, 0.15);
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0 auto 16px;
}

.chat-error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(220, 38, 38, 0.15);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0 auto 16px;
}

.chat-spinner {
  font-size: 40px;
  color: #22c55e;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.chat-qr-hint {
  font-size: 14px;
  color: #86efac;
  margin-top: 8px;
  margin-bottom: 16px;
}

.chat-btn-cancel-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(220, 38, 38, 0.1);
  color: #f87171;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(220, 38, 38, 0.2);
  }
}

.chat-qr-container {
  background: white;
  padding: 16px;
  border-radius: 12px;
  display: inline-block;
  margin: 16px 0;
}

.chat-qr-image {
  width: 180px;
  height: 180px;
}

.chat-qr-ascii {
  overflow: auto;
  max-width: 100%;

  pre {
    font-size: 6px;
    line-height: 1;
  }
}

.chat-qr-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.chat-qr-loading-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.chat-scan-actions {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.chat-btn-cancel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--surface-container-high);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-weight: 400;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--surface-variant);
  }
}

.chat-scan-logs {
  margin-top: 16px;
  background: var(--background);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  height: 300px;
}

.chat-scan-logs-header {
  background: var(--surface);
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.chat-scan-logs-title {
  font-size: 12px;
  font-family: monospace;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.chat-scan-logs-actions {
  display: flex;
  gap: 16px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;

  &:hover {
    color: var(--text-primary);
  }
}

.chat-scan-logs-content {
  padding: 16px;
  font-family: monospace;
  font-size: 14px;
  max-height: 256px;
  overflow-y: auto;

  .chat-log-line {
    margin-bottom: 2px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .chat-log-time {
    color: #6b7280;
    font-size: 12px;
    margin-right: 8px;
  }

  .chat-log-type {
    margin-right: 8px;
  }

  .chat-log-message {
    color: #e5e7eb;
  }
}

.text-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.chat-btn-disconnect {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  background: var(--surface-container-high);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-weight: 400;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin: 16px auto 0;

  &:hover {
    background: var(--surface-variant);
  }
}

.text-2xl {
  font-size: 24px;
}

.my-4 {
  margin-top: 16px;
  margin-bottom: 16px;
}
</style>
