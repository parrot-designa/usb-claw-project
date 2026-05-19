<template>
  <div v-if="visible" class="confirm-overlay" @click.self="cancel">
    <div class="confirm-card">
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="confirm-btn-cancel" @click="cancel">取消</button>
        <button class="confirm-btn-ok" @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const visible = ref(false);
const title = ref('');
const message = ref('');
let resolvePromise = null;

onMounted(() => {
  window.showConfirmVue = (t, msg) => {
    title.value = t;
    message.value = msg;
    visible.value = true;
    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  };
});

function confirm() {
  visible.value = false;
  resolvePromise?.(true);
}

function cancel() {
  visible.value = false;
  resolvePromise?.(false);
}
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  min-width: 360px;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--on-surface);
}

.confirm-message {
  font-size: 14px;
  color: var(--on-surface-variant);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.confirm-btn-cancel {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid var(--outline);
  background: transparent;
  color: var(--on-surface-variant);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--surface-variant);
  }
}

.confirm-btn-ok {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #1d4ed8;
  }
}
</style>
