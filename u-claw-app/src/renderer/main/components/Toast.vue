<template>
  <div id="toast" class="toast-toast" :class="{ 'toast-show': visible, 'toast-error': isError }">
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
  top: 20px;
  right: 20px;
  background: var(--secondary);
  color: var(--on-primary);
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.9em;
  font-weight: 400;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 12px;

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
    transform: translateY(0);
  }

  &.toast-error {
    background: var(--error);
    color: white;
  }
}
</style>
