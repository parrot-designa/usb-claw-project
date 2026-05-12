<template>
  <div class="home-home-view">
    <!-- Gateway Status Bar -->
    <div class="home-status-bar">
      <div class="home-status-info">
        <div class="home-status-title">Gateway 控制台</div>
        <div class="home-status-badges">
          <div v-if="gatewayStore.running" class="home-status-badge home-status-on">
            <span class="home-dot"></span>
            <span>运行中</span>
          </div>
          <div v-else class="home-status-badge home-status-off">
            <span class="home-dot"></span>
            <span>未启动</span>
          </div>
          <div class="home-port-info">
            <span class="label">端口:</span>
            <span class="value">{{ gatewayStore.port || '--' }}</span>
          </div>
        </div>
      </div>
      <div class="home-action-buttons">
        <TechButton v-if="!gatewayStore.running" variant="primary" @click="handleStart">
          <template #icon>
            <span class="iconfont icon-clawopen"></span>
          </template>
          启动
        </TechButton>
        <TechButton v-if="gatewayStore.running" variant="primary" @click="handleOpen">
          <template #icon>
            <span class="iconfont icon-clawwaibutiaozhuanlianjie"></span>
          </template>
          打开小龙虾
        </TechButton>
        <TechButton v-if="gatewayStore.running" variant="secondary" @click="handleRestart">
          <template #icon>
            <span class="iconfont icon-clawzhongqi"></span>
          </template>
          重启
        </TechButton>
        <TechButton v-if="gatewayStore.running" variant="danger" @click="handleStop">
          <template #icon>
            <span class="iconfont icon-clawtingzhi"></span>
          </template>
          停止
        </TechButton>
      </div>
    </div>

    <!-- Environment Check Cards -->
    <div class="home-env-checks">
      <div
        v-for="item in checkItems"
        :key="item.id"
        class="home-env-check-card"
        :class="[`home-env-check-status-${item.status}`]"
      >
        <div class="home-env-check-icon">
          <span class="iconfont" :class="item.icon"></span>
        </div>
        <div class="home-env-check-title">{{ item.title }}</div>
        <div class="home-env-check-badge" :class="'home-env-check-' + item.status">
          <span class="home-env-check-dot"></span>
          <span>{{ item.statusText }}</span>
        </div>
      </div>
    </div>

    <!-- Terminal -->
    <div class="home-terminal">
      <div class="home-terminal-header">
        <span class="home-terminal-title">实时日志</span>
        <div class="home-terminal-actions">
          <TechButton variant="ghost" size="small" icon-only @click="copyTerminal" title="复制">
            <template #icon>
              <span class="iconfont icon-clawfuzhirizhi"></span>
            </template>
          </TechButton>
          <TechButton variant="ghost" size="small" icon-only @click="clearTerminal" title="清空">
            <template #icon>
              <span class="iconfont icon-clawqingchurizhi"></span>
            </template>
          </TechButton>
        </div>
      </div>
      <div id="terminal-logs" class="home-terminal-logs custom-scrollbar" :class='{"has-data":logs.length > 0}'>
        <div v-if="logs.length === 0" class="home-no-logs">
          <img src="/no-log.png" alt="暂无日志" class="home-no-logs-icon" />
          <span class="home-no-logs-text">暂无日志</span>
        </div>
        <div v-else v-for="log in logs" :key="log.id" class="home-log-line">
          <span class="home-log-type" :style="{ color: log.typeColor }">{{ log.typeLabel }}</span>
          <span v-if="log.timestamp" class="home-log-time">{{ log.timestamp }}</span>
          <span class="home-log-message">{{ log.message }}</span>
        </div>
      </div>
    </div> 

    <!-- Quick Start Card -->
    <div class="home-quick-start">
      <h3 class="home-quick-start-title">快速开始</h3>
      <div class="home-quick-start-steps">
        <div class="home-step">
          <span class="home-step-num">1.</span>
          <span>点击上方 <span class="home-highlight">【启动】</span> 按钮启动 Gateway</span>
        </div>
        <div class="home-step">
          <span class="home-step-num">2.</span>
          <span>在 <span class="home-highlight">【模型配置】</span> 页面配置 AI 模型的 API Key</span>
        </div>
        <div class="home-step">
          <span class="home-step-num">3.</span>
          <span>在 <span class="home-highlight">【微信连接】</span> 页面扫码连接微信</span>
        </div>
        <div class="home-step">
          <span class="home-step-num">4.</span>
          <span>在微信里发消息给 AI 开始对话</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useGatewayStore } from '../stores/gateway';
import { useActivationStore } from '../stores/activation';
import { useGateway } from '../composables/useGateway';
import { useEnvCheck } from '../composables/useEnvCheck';
import { useToast } from '../composables/useToast';
import TechButton from '../components/TechButton.vue';

const gatewayStore = useGatewayStore();
const activationStore = useActivationStore();
const { startGatewayHook } = useGateway();
const { checkItems, runAllChecks } = useEnvCheck();
const { showToast } = useToast();

const logs = computed(() => gatewayStore.logs);

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function extractTimestamp(msg) {
  const stripped = msg.replace(/\x1b\[[0-9;]*m/g, '');
  const isoMatch = stripped.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2})?)/);
  if (isoMatch) {
    try {
      const d = new Date(isoMatch[1]);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      }
    } catch {}
  }
  return null;
}

function cleanLogMessage(msg) {
  const stripped = msg.replace(/\x1b\[[0-9;]*m/g, '');
  return stripped.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2})?)\s*/, '');
}
let liveLogsInterval = null;

onMounted(async () => {
  activationStore.setActivation({});
  runAllChecks();
  startLiveLogs();
});

onUnmounted(() => {
  if (liveLogsInterval) clearInterval(liveLogsInterval);
});

function startLiveLogs() {
  window.uclaw.ipcOnGatewayLog((log) => {
    const typeLabel = {
      stdout: '[stdout]',
      stderr: '[stderr]',
      error: '[error]',
      exit: '[exit]',
      close: '[close]',
    }[log.type] || '[log]';

    const typeColor = {
      stdout: '#4ade80',
      stderr: '#f87171',
      error: '#f87171',
      exit: '#a78bfa',
      close: '#a78bfa',
    }[log.type] || '#ffffff';

    const timestamp = extractTimestamp(log.msg);
    const message = cleanLogMessage(log.msg);

    gatewayStore.addLog({
      id: Date.now() + Math.random(),
      typeLabel,
      typeColor,
      message,
      timestamp,
    });

    nextTick(() => {
      const container = document.getElementById('terminal-logs');
      if (container) container.scrollTop = container.scrollHeight;
    });
  });
}

async function handleStart() { 
  window.showLoadingOverlayVue?.(); 
  try {
    await startGatewayHook();
    showToast('小龙虾启动成功');
  } catch (e) {
    showToast('启动失败: ' + e.message, true);
  }
}

async function handleStop() {
  try {
    const result = await window.uclaw.ipcStopGateway();
    if (!result.ok) {
      throw new Error(result.error);
    }
    showToast('小龙虾已停止');
  } catch (e) {
    showToast('停止失败: ' + e.message, true);
  }
}

async function handleRestart() {  
  window.showLoadingOverlayVue?.(); 
  try {
    await window.uclaw.ipcRestartGateway();
    showToast('小龙虾重启成功');
  } catch (e) {
    showToast('重启失败: ' + e.message, true);
  } finally {
    if (window.hideLoadingOverlayVue) {
      setTimeout(() => window.hideLoadingOverlayVue(), 500);
    }
  }
}

function handleOpen() {
  window.uclaw.ipcOpenDashboard();
}

function copyTerminal() {
  const logs = document.getElementById('terminal-logs');
  if (logs) {
    navigator.clipboard.writeText(logs.textContent);
    showToast('日志已复制');
  }
}

function clearTerminal() {
  gatewayStore.clearLogs();
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.home-home-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.home-status-bar {
  @extend %flex-between;
  @extend %card-base;
  padding: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.home-status-info {
  @extend %flex-column;
  gap: 0.5rem;
}

.home-status-title {
  font-size: 1.25rem;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
}

.home-status-badges {
  @extend %flex-center;
  gap: 1rem;
  margin-top: 0.25rem;
}

.home-status-badge {
  @extend %badge-base;
}

.home-status-on {
  background: var(--secondary-container);
  border: 1px solid var(--secondary);
  color: var(--secondary);
}

.home-status-off {
  background: var(--error-container);
  border: 1px solid var(--error);
  color: var(--error);
}

.home-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.home-status-on .home-dot {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.home-port-info {
  @extend %flex-center;
  gap: 0.25rem;
}

.home-port-info .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Manrope', sans-serif;
}

.home-port-info .value {
  font-size: 0.875rem;
  font-weight: 400;
  font-family: monospace;
  color: var(--primary);
}

.home-action-buttons {
  @extend %flex-center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.home-terminal { 
  overflow: hidden;
  @extend %card-base;
}

.home-terminal-header {
  @extend %flex-between;
  background: var(--surface);
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
}

.home-terminal-title {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-secondary);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.home-terminal-actions {
  @extend %flex-center;
  gap: 1rem;
}

.home-terminal-logs {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;

  &.has-data{
    flex-direction: column;
    max-height: 180px;
    overflow-x: hidden;
    overflow-y: auto;
    align-items: flex-start;
    justify-content: flex-start;
  }
}

.home-no-logs {
  @extend %flex-column-center;
  gap: 1rem;
  height: 100%;
  min-height: 12rem;
  justify-content: center;
}

.home-no-logs-icon {
  width: 80px;
  height: 80px;
  opacity: 0.6;
}

.home-no-logs-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-family: 'Manrope', sans-serif;
}

.home-log-line {
  margin-bottom: 2px;
  line-height: 0.8;
}

.home-log-time {
  color: #6b7280;
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.home-log-type {
  margin-right: 0.5rem;
  font-size: 0.75rem;
}

.home-log-message {
  color: #87898c;
  font-size: 0.75rem;
}

.home-env-checks {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

.home-env-check-card {
  @extend %card-base;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &.home-env-check-status-fail {
    border-color: var(--error);
  }

  &.home-env-check-status-warn {
    border-color: var(--accent);
  }
}

.home-env-check-icon {
  .iconfont {
    font-size: 1.25rem;
    color: var(--primary);
  }
}

.home-env-check-title {
  font-size: 0.75rem;
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
}

.home-env-check-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &.home-env-check-checking {
    color: var(--text-secondary);
  }

  &.home-env-check-pass {
    color: var(--secondary);
  }

  &.home-env-check-fail {
    color: var(--error);
  }

  &.home-env-check-warn {
    color: var(--accent);
  }
}

.home-env-check-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: currentColor;

  .home-env-check-checking & {
    animation: pulse 1s infinite;
  }
}

.home-quick-start { 
  padding: 1rem;   
  @extend %card-base;
}

.home-quick-start-title {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  margin-bottom: 0.75rem;
}

.home-quick-start-steps {
  @extend %flex-column;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.home-step {
  @extend %flex-row;
  align-items: flex-start;
  gap: 0.5rem;
}

.home-step-num {
  color: var(--accent);
  font-weight: 400;
}

.home-highlight {
  color: var(--primary);
}
</style>
