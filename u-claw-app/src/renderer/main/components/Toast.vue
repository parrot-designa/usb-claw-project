<template>
  <div id="toast" class="toast-toast" :class="{ 'toast-show': visible, 'toast-error': isError, 'toast-success': !isError }">
    <span class="toast-message">{{ message }}</span>
    <div v-if="actionText" class="toast-actions">
      <button class="toast-btn" @click="handleAction">{{ actionText }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const message = ref('');
const visible = ref(false);
const isError = ref(false);
const actionText = ref('');
const actionCallback = ref(null);

onMounted(() => {
  window.showToastVue = (msg, isErr = false, action = null) => {
    message.value = msg;
    isError.value = isErr;
    actionText.value = action?.text || '';
    actionCallback.value = action?.onClick || null;
    visible.value = true;
    setTimeout(() => {
      visible.value = false;
    }, action ? 10000 : 3000);
  };
});

function handleAction() {
  if (actionCallback.value) {
    actionCallback.value();
  }
  visible.value = false;
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.toast-toast {
  position: fixed;
  top: 46px;
  left: 50%;
  transform: translate(-50%, -12px);
  background: #16a34a;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.88em;
  font-weight: 400;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  pointer-events: auto;

  .toast-message {
    flex: 1;
  }

  .toast-actions {
    display: flex;
    gap: 8px;

    .toast-btn {
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: inherit;
      font-size: 0.85em;
      font-weight: 400;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }

  &.toast-show {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  &.toast-success {
    background: #16a34a;
    color: #fff;
  }

  &.toast-error {
    background: #dc2626;
    color: #fff;
  }
}
</style>
