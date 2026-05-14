<template>
  <div class="settings-settings-view"> 

    <div class="settings-settings-card">
      <div class="settings-row">
        <div class="settings-label">版本</div>
        <div class="settings-value text-orange">{{ version }}</div>
      </div>
      <div class="settings-row">
        <div class="settings-label">激活状态</div>
        <div class="settings-value" :class="activationStore.activated ? 'text-green' : 'text-red'">
          {{ activationStore.activated ? '已激活' : '未激活' }}
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-label">U盘路径</div>
        <div class="settings-value">{{ usbPath }}</div>
      </div>
      <div class="settings-row">
        <div class="settings-label">U盘序列号</div>
        <div class="settings-value">{{ usbSerial }}</div>
      </div>
      <div class="settings-row">
        <div class="settings-label">数据目录</div>
        <div class="settings-value">{{ dataDir }}</div>
      </div>
      <div class="settings-row">
        <div class="settings-label">Gateway端口</div>
        <div class="settings-value">{{ defaultPort }}</div>
      </div>
    </div>

    <div class="settings-settings-actions">
      <button class="settings-btn-action" @click="checkUpdate" :disabled="checkingUpdate">
        <span class="iconfont icon-clawjianchagengxin"></span>
        <span v-if="checkingUpdate" class="settings-loading-spinner"></span>
        <span v-else>{{ updateBtnText }}</span>
      </button>
      <button class="settings-btn-action settings-btn-restart" @click="restartApp">
        <span class="iconfont icon-clawzhongqi"></span>
        重启软件
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useActivationStore } from '../stores/activation';
import { useGatewayStore } from '../stores/gateway';
import { useToast } from '../composables/useToast';

const activationStore = useActivationStore();
const gatewayStore = useGatewayStore();
const { showToast } = useToast();

const version = ref('...');
const usbPath = ref('--');
const usbSerial = ref('--');
const dataDir = ref('--');
const defaultPort = ref('--');
const checkingUpdate = ref(false);
const updateBtnText = ref('检查更新'); 

onMounted(async () => {
  await loadSettings();
});

async function loadSettings() {
  try { 
    version.value = `OpenClawPro U盘便携版`;
    let rootPath = await window.uclaw.ipcGetRuntimeStore('rootPath');
    usbPath.value = rootPath || "F:\\";
    let usbSerialFromRuntime = await window.uclaw.ipcGetRuntimeStore('serial');
    usbSerial.value = usbSerialFromRuntime || "FOCF56A83156249B";
    dataDir.value = await window.uclaw.ipcGetDataDir();
    defaultPort.value = await window.uclaw.ipcGetDefaultPort();
  } catch (e) {
    console.error('加载设置失败:', e);
  }
}

function checkUpdate() {
  checkingUpdate.value = true;
  updateBtnText.value = '检查中...';
  setTimeout(() => {
    checkingUpdate.value = false;
    updateBtnText.value = '检查更新';
    showToast('暂无更新');
  }, 3000);
}

function restartApp() {
  window.uclaw.ipcRestartApp();
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.settings-settings-view {
  @extend %flex-column;
  padding: 16px;

  .settings-page-title {
    font-size: 24px;
    font-weight: 400;
    font-family: 'Manrope', sans-serif;
    color: var(--text-primary);
    margin-bottom: 24px;
  }

  .settings-settings-card {
    @extend %card-base; 
    padding: 20px 24px;
    margin-bottom: 16px;
    box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.15); 

    .settings-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 14px 0;
      gap: 32px;

      &:not(:last-child) {
        border-bottom: 1px solid var(--border);
      }

      .settings-label {
        color: var(--text-secondary);
        font-size: 15px;
        flex-shrink: 0;
      }

      .settings-value {
        font-size: 16px;
        font-weight: 400;
        color: var(--text-primary);
        text-align: right;
        word-break: break-all;
        line-height: 1.5;
      }
    }
  }

  .text-orange {
    color: var(--accent) !important;
  }

  .text-green {
    color: var(--secondary) !important;
  }

  .text-red {
    color: var(--error) !important;
  }

  .settings-settings-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;

    .settings-btn-action {
      @extend %btn-ghost;
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;

      &:hover:not(:disabled) {
        background: var(--bg-secondary);
        border-color: var(--accent);
        color: var(--accent);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.settings-btn-restart:hover:not(:disabled) {
        border-color: var(--error);
        color: var(--error);
      }
    }

    .settings-loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>