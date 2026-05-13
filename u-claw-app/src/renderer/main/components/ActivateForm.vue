<template>
  <div class="activate-form">
    <div class="activate-form-input-row">
      <input
        type="text"
        class="activate-form-code-input"
        v-model="activationCode"
        autocomplete="off"
        placeholder="激活码"
      />
    </div>
    <button class="activate-form-btn" @click="handleActivate" :disabled="loading">
      {{ loading ? '验证中...' : '激活' }}
    </button>
    <p class="activate-form-hint">输入激活码即可</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { apiRequest } from '@renderer/js/api.js';

const props = defineProps({
  serial: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['activation-success', 'activation-error']);

const activationCode = ref('');
const loading = ref(false);

async function handleActivate() {
  const code = activationCode.value.trim();
  if (!code) {
    await window.uclaw.ipcShowErrorDialog('请输入激活码', '激活码不能为空');
    return;
  }

  loading.value = true;
  try {
    const result = await apiRequest('/api/usb_key/activate', {
      method: 'POST',
      body: { activation_code: code, usb_serial: props.serial }
    });

    if (result.success) {
      emit('activation-success', result);
    } else {
      await window.uclaw.ipcShowErrorDialog('激活失败', result.message || result.error || '激活失败');
      activationCode.value = '';
      emit('activation-error', result);
    }
  } catch (e) {
    await window.uclaw.ipcShowErrorDialog('验证失败', 'Verification failed');
    emit('activation-error', e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.activate-form {
  @extend %flex-column;
  align-items: center;
  margin-top:10px;
}

.activate-form-input-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}

.activate-form-code-input {
  @extend %input-base;
  width: 260px;
  height: 52px;
  font-size: 1.2em;
  text-align: center;
}

.activate-form-btn {
  @extend %btn-primary;
  padding: 12px 40px;
  font-size: 1em;
  margin-top: 20px;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:active:not(:disabled) {
    opacity: 0.7;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.activate-form-hint {
  color: var(--text-muted);
  font-size: 0.75em;
  margin-top: 20px;
}
</style>