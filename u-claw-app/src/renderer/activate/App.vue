<template>
  <MenuBar title="OpenClawPro U盘便携版 v1.8.1" />

  <div class="activate-app-startup-check" v-if="status !== 'needActivate'">
    <!-- error 状态 -->
    <div v-if="status === 'error'" class="activate-app-error-state">
      <div class="activate-app-error-icon">⚠</div>
      <h2>检查失败</h2>
      <p class="activate-app-error-message">{{ errorMessage }}</p>
      <button class="activate-app-retry-btn" @click="startCheck">重新检测</button>
    </div>

    <!-- checking 状态 -->
    <div v-else class="activate-app-checking-state">
      <div class="activate-app-logo">
        <img src="@assets/logo.png" alt="min-claw" />
      </div>
      <div class="activate-app-spinner"></div>
      <h2>检查中...</h2>
      <div class="activate-app-progress-list">
        <div
          v-for="(item, index) in progressItems"
          :key="index"
          class="activate-app-progress-item"
          :class="{ done: item.done, active: item.active, error: item.error }"
        >
          <span class="activate-app-status-icon">{{ item.done ? '✓' : (item.active ? '●' : (item.error ? '✗' : '○')) }}</span>
          <span class="label">{{ item.label }}</span>
          <span v-if="item.error" class="activate-app-step-error">{{ item.error }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- needActivate 状态：显示激活表单 -->
  <div v-else class="activate-app-activate-state">
    <div class="activate-app-logo">
      <img src="@assets/logo.png" alt="min-claw" />
    </div>
    <h1><span>U盘便携版Claw</span></h1>
    <ActivateForm />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import ActivateForm from './components/ActivateForm.vue';
import MenuBar from '../main/components/MenuBar.vue';

const STEP_DELAY = 100; // 每步至少停留 200ms

const status = ref('checking'); // checking | needActivate | error
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
    // Step 1: 检测网络
    updateProgress(0);
    let stepResult = await window.uclaw.ipcCheckStepNetwork();
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      // 网络检查失败 → 显示错误但继续
      progressItems[0].done = false;
      progressItems[0].error = stepResult.error || '网络不可用，请检查网络连接';
    } else {
      progressItems[0].done = true;
    }
    progressItems[0].active = false;
    await delay(STEP_DELAY);

    // Step 2: 获取 U 盘序列号
    updateProgress(1);
    // 开发环境使用默认序列号
    const isDev = import.meta.env.VITE_IS_DEV === 'true';
    stepResult = await window.uclaw.ipcCheckStepSerial();

    if (isDev) {
      stepResult = { ok: true, serial: 'FOCF56A83156249B' };
      window.uclaw.ipcSetRuntimeStore({key:'serial',value:'FOCF56A83156249B'})
    } 
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      // 序列号获取失败 → 显示错误但继续
      progressItems[1].done = false;
      progressItems[1].error = stepResult.error || '获取序列号失败';
      currentSerial = 'FOCF56A83156249B'; // 失败时使用默认序列号继续
    } else {
      currentSerial = stepResult.serial;
      progressItems[1].done = true;
    }
    progressItems[1].active = false;
    await delay(STEP_DELAY);

    // Step 3: 验证 License 文件
    updateProgress(2);
    stepResult = await window.uclaw.ipcCheckStepLicense(currentSerial);
    await delay(STEP_DELAY);

    if (!stepResult.ok) {
      // License 检查失败 → 显示错误但继续
      progressItems[2].done = false;
      progressItems[2].error = stepResult.error || '权限文件验证失败';
      progressItems[2].active = false;
      await delay(500);
      status.value = 'needActivate';
      return ;
    } else {
      progressItems[2].done = true;
      progressItems[2].active = false;
      await delay(STEP_DELAY);
 
      const { serial, activation_code } = stepResult.license;
      const loginResult = await window.uclaw.ipcCheckStepLogin({ serial, activation_code });

      if (!loginResult.ok) {
        errorMessage.value = loginResult.error || '登录校验失败';
        status.value = 'error';
        return;
      }
    }

    // 所有检查通过 → 进入主窗口
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

.activate-app-startup-check,
.activate-app-activate-state {
  @extend %flex-column-center;
  padding: 40px 20px;
  padding-top: 58px;
  box-sizing: border-box;
}

.activate-app-logo {
  width: 80px;
  height: 80px;
  margin-bottom: 24px;

  img {
    width: 100%;
    height: 100%;
  }
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

/* error 状态 */
.activate-app-error-state {
  text-align: center;
}

.activate-app-error-icon {
  font-size: 3em;
  margin-bottom: 16px;
  color: var(--error);
}

.activate-app-error-message {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.activate-app-retry-btn {
  @extend %btn-primary;
  padding: 12px 40px;
  font-size: 1em;
}

/* checking 状态 */
.activate-app-checking-state {
    display: flex;
    flex-direction: column;
    align-items: center;

  h2 {
    color: var(--accent);
  }
}

.activate-app-spinner {
  @extend %spinner-base;
  margin: 0 auto 20px;
}

.activate-app-progress-list {
  margin-top: 24px;
  text-align: left;
}

.activate-app-progress-item {
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

.activate-app-status-icon {
  font-size: 1.1em;
}

.activate-app-step-error {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 28px;
  color: var(--error);
  font-size: 0.8em;
  white-space: nowrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>