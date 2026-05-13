<template>
  <div class="activate-view">
    <div class="activate-container">
      <div class="activate-logo">
        <img src="@assets/logo.png" alt="min-claw" />
      </div>

      <div v-if="status === 'checking'" class="activate-checking">
        <div class="activate-spinner"></div>
        <h2>检查中...</h2>
        <div class="activate-progress-list">
          <div
            v-for="(item, index) in progressItems"
            :key="index"
            class="activate-progress-item"
            :class="{ done: item.done, active: item.active, error: item.error }"
          >
            <span class="activate-status-icon">{{ item.done ? '✓' : (item.active ? '●' : (item.error ? '✗' : '○')) }}</span>
            <span class="label">{{ item.label }}</span>
            <span v-if="item.error" class="activate-step-error">{{ item.error }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="status === 'error'" class="activate-error">
        <div class="activate-error-icon">⚠</div>
        <h2>检查失败</h2>
        <p class="activate-error-message">{{ errorMessage }}</p>
        <button class="activate-retry-btn" @click="startCheck">重新检测</button>
      </div>

      <div v-else-if="status === 'needActivate'" class="activate-form-container">
        <h1><span>U盘便携版Claw</span></h1>
        <ActivateForm />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import ActivateForm from '../components/ActivateForm.vue';
import { apiRequest } from '@renderer/js/api.js';
import { useSessionStore } from '@main/stores/session.js';

const STEP_DELAY = 10;
const sessionStore = useSessionStore();

const status = ref('checking');
const errorMessage = ref('');
let currentSerial = null;

const progressItems = reactive([
  { label: '检测网络连通性', done: false, active: true, error: null },
  { label: '获取 U 盘序列号', done: false, active: false, error: null },
  { label: '验证权限文件', done: false, active: false, error: null },
]);

function updateProgress(index) {
  progressItems.forEach((item, i) => {
    item.done = i < index;
    item.active = i === index;
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startCheck() {
  status.value = 'checking';
  errorMessage.value = '';
  currentSerial = null;
  updateProgress(0);

  try {
    updateProgress(0);
    let stepResult = await window.uclaw.ipcCheckStepNetwork();
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      progressItems[0].done = false;
      progressItems[0].error = stepResult.error || '网络不可用，请检查网络连接';
    } else {
      progressItems[0].done = true;
    }
    progressItems[0].active = false;
    await delay(STEP_DELAY);

    updateProgress(1);
    const isDev = import.meta.env.VITE_IS_DEV === 'true';
    stepResult = await window.uclaw.ipcCheckStepSerial();

    if (isDev) {
      stepResult = { ok: true, serial: 'FOCF56A83156249B' };
      window.uclaw.ipcSetRuntimeStore({key:'serial',value:'FOCF56A83156249B'})
    }
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      progressItems[1].done = false;
      progressItems[1].error = stepResult.error || '获取序列号失败';
      currentSerial = 'FOCF56A83156249B';
    } else {
      currentSerial = stepResult.serial;
      progressItems[1].done = true;
    }
    progressItems[1].active = false;
    await delay(STEP_DELAY);

    updateProgress(2);
    stepResult = await window.uclaw.ipcCheckStepLicense(currentSerial);
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      progressItems[2].done = false;
      progressItems[2].error = stepResult.error || '权限文件验证失败';
      progressItems[2].active = false;
      await delay(500);
      status.value = 'needActivate';
      return;
    } else {
      progressItems[2].done = true;
      progressItems[2].active = false;
      await delay(STEP_DELAY);

      const { serial, activation_code } = stepResult.license;
      // 直接调用登录 API
      const loginResult = await apiRequest('/api/usb_key/login', {
        method: 'POST',
        body: { serial_number: serial, activation_code: activation_code }
      });

      if (!loginResult.success) {
        errorMessage.value = loginResult.message || '登录校验失败';
        status.value = 'error';
        return;
      }
      if (loginResult.data?.session_cookie) {
        sessionStore.setSessionCookie(loginResult.data.session_cookie);
      }
    }

    status.value = 'ready';
    await window.uclaw.ipcCheckPassed();
  } catch (e) {
    errorMessage.value = e.message || '检查失败';
    status.value = 'error';
  }
}

onMounted(() => {
  startCheck();
});
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.activate-view {
  @extend %flex-column-center;
  justify-content: center;
  min-height: calc(100vh - 72px);
  padding: 40px 20px;
}

.activate-container {
  @extend %flex-column-center;
  max-width: 400px;
  width: 100%;
}

.activate-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 24px;

  img {
    width: 100%;
    height: 100%;
  }
}

.activate-checking,
.activate-error,
.activate-form-container {
  @extend %flex-column-center;
  text-align: center;
  width: 100%;
}

h1 {
  font-size: 1.8em;
  margin-bottom: 8px;
  font-weight: 400;
  color: var(--text-primary);

  span {
    color: var(--accent);
  }
}

h2 {
  color: var(--accent);
  font-weight: 400;
}

.activate-spinner {
  @extend %spinner-base;
  margin: 0 auto 20px;
}

.activate-progress-list {
  margin-top: 24px;
  text-align: left;
}

.activate-progress-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--text-secondary);
  font-size: 0.9em;

  &.active {
    color: var(--accent);
  }

  &.done {
    color: #4caf50;
  }

  &.error {
    color: var(--error);
  }
}

.activate-status-icon {
  font-size: 1.1em;
}

.activate-step-error {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 28px;
  color: var(--error);
  font-size: 0.8em;
  white-space: nowrap;
}

.activate-error-icon {
  font-size: 3em;
  margin-bottom: 16px;
  color: var(--error);
}

.activate-error-message {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.activate-retry-btn {
  @extend %btn-primary;
  padding: 12px 40px;
  font-size: 1em;
}
</style>