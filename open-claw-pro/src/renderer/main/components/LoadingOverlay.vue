<template>
  <div id="loading-overlay" class="loading-overlay-loading-overlay" :class="{ 'loading-overlay-hidden': !visible }">
    <div class="loading-overlay-content">
      <!-- Logo/Title -->
      <div class="loading-overlay-logo">
        <img src="@assets/logo.png" alt="min-claw" class="loading-overlay-logo-icon" />
        <span class="loading-overlay-logo-text">OpenClawPro</span>
      </div>

      <!-- Progress Bar -->
      <div class="loading-overlay-progress-container">
        <div class="loading-overlay-progress-bar">
          <div class="loading-overlay-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="loading-overlay-progress-percent">{{ Math.round(progressPercent) }}%</div>
      </div>

      <!-- Status Text -->
      <p class="loading-overlay-text">{{ statusText }}</p>

      <!-- Detail Text -->
      <p v-if="detailText" class="loading-overlay-detail">{{ detailText }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const visible = ref(false);
const progressPercent = ref(0);
const statusText = ref('');
const detailText = ref('');

function show() {
  visible.value = true;
}

function updateStep(stepIndex, msg) {
  statusText.value = msg || statusText.value;
}

function updateProgress(progress, title, detail) {
  progressPercent.value = progress;
  if (title) statusText.value = title;
  if (detail !== undefined) detailText.value = detail;
}

function hide() {
  visible.value = false;
  progressPercent.value = 0;
  statusText.value = '正在启动...';
  detailText.value = '';
}

onMounted(() => {
  window.showLoadingOverlayVue = show;
  window.updateLoadingStep = (stepIndex, msg) => {
    statusText.value = msg || statusText.value;
  };
  window.updateLoadingProgress = updateProgress;
  window.hideLoadingOverlayVue = hide;
});
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.loading-overlay-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 20, 0.85);
  @extend %flex-center;
  z-index: 9999;
  backdrop-filter: blur(8px);

  &.loading-overlay-hidden {
    display: none;
  }
}

.loading-overlay-content {
  text-align: center;
  color: #fff;
  max-width: 400px;
  padding: 32px;
}

.loading-overlay-logo {
  @extend %flex-center;
  gap: 12px;
  margin-bottom: 32px;
}

.loading-overlay-logo-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.loading-overlay-logo-text {
  font-size: 32px;
  font-weight: 400;
  color: #ff6b35;
}

.loading-overlay-progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  justify-content: center;
}

.loading-overlay-progress-bar {
  width: 200px;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.loading-overlay-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b35, #ff8f65);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.loading-overlay-progress-percent {
  font-size: 14px;
  font-weight: 400;
  color: #ff8f65;
  min-width: 48px;
}

.loading-overlay-text {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.loading-overlay-detail {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>