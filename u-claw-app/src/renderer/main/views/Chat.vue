<template>
  <div class="chat-chat-view"> 

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        class="chat-chat-tool-tab"
        :class="{ 'chat-active': activeChatTab === 'wechat' }"
        @click="activeChatTab = 'wechat'"
      >
        <img src="/wechat.png" alt="wechat" style="width:20px;height:20px;vertical-align:middle;" />
        <span>微信</span>
      </button>
      <button
        class="chat-chat-tool-tab"
        :class="{ 'chat-active': activeChatTab === 'feishu' }"
        @click="activeChatTab = 'feishu'"
      >
       <img src="/feishu.png" alt="wechat" style="width:20px;height:20px;vertical-align:middle;" />
        <span>飞书</span>
      </button>
    </div>

    <!-- WeChat Tab -->
    <div v-show="activeChatTab === 'wechat'" class="chat-chat-content">
      <!-- Loading/Installing state -->
      <div v-if="wechatStore.scanStep === 'loading'" class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">{{ '正在加载二维码...' }}</h2>
        <p class="chat-wechat-desc">{{ '请稍候...' }}</p>
      </div>

      <!-- Refreshing QR state -->
      <div v-else-if="wechatStore.scanStep === 'refreshing'" class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">二维码已过期</h2>
        <p class="chat-wechat-desc">正在刷新二维码，请稍候...</p>
        <div class="chat-qr-container chat-qr-loading">
          <div class="chat-qr-loading-text">正在刷新...</div>
        </div>
      </div>

      <!-- QR Code display state -->
      <div v-else-if="wechatStore.scanStep === 'qr'" class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">请使用微信扫码</h2>
        <p class="chat-wechat-desc">请使用手机微信扫描下方二维码进行连接</p>
        <div v-if="wechatStore.qrCodeUrl" class="chat-qr-container">
          <img :src="wechatStore.qrCodeUrl" alt="微信登录二维码" class="chat-qr-image" />
        </div>
        <div v-else-if="wechatStore.qrCodeAscii" class="chat-qr-container chat-qr-ascii">
          <pre>{{ wechatStore.qrCodeAscii }}</pre>
        </div>
        <div v-else class="chat-qr-container chat-qr-loading">
          <div class="chat-qr-loading-text">正在加载二维码...</div>
        </div>
        <div class="chat-scan-actions">
          <button @click="cancelScan" class="chat-btn-cancel">
            取消扫码
          </button>
        </div>
      </div>

      <!-- Success state -->
      <div v-else-if="wechatStore.scanStep === 'success'" class="chat-wechat-card">
        <div class="chat-success-icon">✓</div>
        <h2 class="chat-wechat-title">微信助手已连接</h2>
        <p class="chat-wechat-desc">在微信中给AI发送消息即可对话</p>
        <button @click="disconnectWeChat" class="chat-btn-disconnect">
          断开连接
        </button> 
      </div> 

      <!-- Default state: installed but not scanning -->
      <div v-else class="chat-wechat-card">
        <div class="chat-wechat-icon">
          <img src="/send-msg.png" alt="wechat" />
        </div>
        <h2 class="chat-wechat-title">{{ '一键安装微信插件' }}</h2>
        <div class="chat-wechat-status">
          <span class="chat-status-badge">
            <img src="/installed.png" style="width: 20px;height: 20px;">
            <span>{{ statusText }}</span>
          </span>
        </div>
        <p class="chat-wechat-desc">{{ wechatDesc }}</p>

        <div class="chat-wechat-action">
          <button @click="startScan" class="chat-btn-scan">
            <span class="iconfont icon-clawiconfontscan"></span>
            扫码连接
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from '../composables/useToast';
import { useWechatStore } from '../stores/wechat';

const { showToast } = useToast();
const wechatStore = useWechatStore();
const activeChatTab = ref('wechat');  
const wechatDesc = ref('安装后扫码连接微信，让AI自动回复消息');
const statusIcon = ref('');
const statusText = ref('检测中...'); 

onMounted(async () => { 
  window.uclaw.ipcOnWeChatStatus(handleWechatStatus);
  checkWeChatStatus();
});

onUnmounted(() => {
  window.uclaw.ipcOffWeChatStatus(handleWechatStatus);
});

function handleWechatStatus(status) {
  console.log('WeChat status changed:', status);
  switch (status) {
    case 'disconnected':
      wechatStore.setScanStep('idle');
      wechatStore.setConnected(false);
      wechatStore.setConnecting(false);
      statusText.value = '插件已安装';
      break;
    case 'installing':
      wechatStore.setScanStep('loading');
      statusText.value = '正在安装...';
      break;
    case 'scanning':
      wechatStore.setScanStep('loading');
      wechatStore.setConnecting(true);
      statusText.value = '扫码中...';
      break;
    case 'refreshing':
      wechatStore.setScanStep('refreshing');
      statusText.value = '二维码更新中...';
      break;
    case 'connected':
      wechatStore.setScanStep('success');
      wechatStore.setConnected(true);
      wechatStore.setConnecting(false);
      statusText.value = '已连接';
      break;
    case 'error':
      wechatStore.setScanStep('idle');
      wechatStore.setConnected(false);
      wechatStore.setConnecting(false);
      statusText.value = '连接错误';
      break;
  }
}

async function checkWeChatStatus() {
  try {
    const wechatStatus = await window.uclaw.ipcGetWeChatStatus(); 
    handleWechatStatus(wechatStatus);
  } catch (e) {
    statusIcon.value = '❌';
    statusText.value = '检测失败';
  }
}
 
 
async function startScan() { 
  wechatStore.clearQrCode();  
  
  window.uclaw.ipcOnWeChatQrUrl((url) => {
    console.log('WeChat QR URL received:', url);
    wechatStore.setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`, '');
    wechatStore.setScanStep('qr');
  });

  try {
    const result = await window.uclaw.startWeChatScan();
    if (result?.error) {
      showToast(result.error, true);
      wechatStore.setScanStep('idle');
      wechatStore.clearQrCode();
    } else {
      const output = result?.stdout || result?.stderr || '';
      const urlMatch = output.match(/https:\/\/liteapp\.weixin\.qq\.com\/q\/[^\s]+/);
      if (urlMatch) {
        wechatStore.setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlMatch[0])}`, '');
        wechatStore.setScanStep('qr');
      } else if (output.includes('data:image')) {
        wechatStore.setQrCode('', output.trim());
        wechatStore.setScanStep('qr');
      }
    }
  } catch (e) {
    showToast('扫码启动失败', true);
    wechatStore.setScanStep('idle');
    wechatStore.clearQrCode();
  } finally {
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
  wechatStore.setScanStep('idle');
  wechatStore.clearQrCode(); 
}

</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.chat-chat-view {
  padding: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.tab-bar {
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--surface);
  border-radius: 0.5rem;
  width: fit-content;
  margin-bottom: 0.75rem;
}

.chat-chat-tool-tab {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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
  margin-top: 1rem;
  
}

.chat-wechat-card {
  @extend %card-base;
  padding: 1.25rem;
  max-width: 42rem;
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
  font-size: 1rem;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.chat-wechat-status {
  margin-bottom: 0.5rem;
}

.chat-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.chat-wechat-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.chat-placeholder {
  visibility: hidden;
}

.chat-process-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  text-align: left;
}

.chat-process-title {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.chat-process-steps {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.chat-process-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.chat-step-num {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--secondary-container);
  color: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 400;
  flex-shrink: 0;
}

.chat-wechat-action {
  display: flex;
  justify-content: center;
}

.chat-btn-install,
.chat-btn-scan {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.chat-tip-card { 
  padding: 0.75rem;
  margin-top: 0.75rem;
  max-width: 42rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  @extend %card-base;


  .iconfont {
    color: var(--accent);
    font-size: 1rem;
    flex-shrink: 0;
  }

  p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 2;
  }
}

.chat-feishu-card {
  background: var(--surface-low);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
}

.text-on-surface-variant {
  color: var(--text-secondary);
}

.text-sm {
  font-size: 0.875rem;
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
  font-size: 0.875rem;
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
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  height: 300px;
}

.chat-scan-logs-header {
  background: var(--surface);
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.chat-scan-logs-title {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.chat-scan-logs-actions {
  display: flex;
  gap: 1rem;
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
  padding: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  max-height: 16rem;
  overflow-y: auto;

  .chat-log-line {
    margin-bottom: 2px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .chat-log-time {
    color: #6b7280;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  .chat-log-type {
    margin-right: 0.5rem;
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
