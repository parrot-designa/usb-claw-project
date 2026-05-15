<template>
  <div class="chat-bubble">
    <div class="bubble-header">
      <span class="bubble-name">{{ name }}</span>
      <span v-if="statusText" class="bubble-status">{{ statusText }}</span>
    </div>
    <div class="bubble-content">
      <p>{{ text }}</p>
      <img v-if="imageUrl" :src="imageUrl" @click="previewImage" class="bubble-image" />
      <div v-if="isLoading && progress > 0" class="bubble-progress">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
    <div class="bubble-footer">
      <span v-if="isLoading" class="bubble-loading">
        <span class="iconfont icon-clawshuaxin"></span>
        生成中{{ progress > 0 ? ` ${progress}%` : '' }} 已用{{ elapsedSeconds }}秒
      </span>
      <span v-if="error" class="bubble-error">{{ error }}</span>
      <button v-if="imageUrl" class="download-btn" @click="downloadImage">↓</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  bubble: {
    type: Object,
    required: true
  },
  modelName: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['preview', 'copy', 'download']);

const role = computed(() => props.bubble.role);
const text = computed(() => props.bubble.text);
const imageUrl = computed(() => props.bubble.imageUrl);
const error = computed(() => props.bubble.error);
const status = computed(() => props.bubble.status);
const progress = computed(() => props.bubble.progress || 0);
const name = computed(() => '文生图');

const isLoading = computed(() => {
  return status.value === 'queued' || status.value === 'in_progress';
});

const statusText = computed(() => {
  switch (status.value) {
    case 'queued': return '排队中';
    case 'in_progress': return '生成中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return null;
  }
});

const elapsedSeconds = ref(0);
let timer = null;

function updateElapsedTime() {
  if (props.bubble.startTime) {
    const now = Date.now();
    elapsedSeconds.value = Math.floor((now - props.bubble.startTime) / 1000);
  }
}

onMounted(() => {
  if (isLoading.value) {
    updateElapsedTime();
    timer = setInterval(updateElapsedTime, 1000);
  }
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

function copyText() {
  if (text.value) {
    navigator.clipboard.writeText(text.value).then(() => {
      emit('copy', text.value);
    });
  }
}

function previewImage() {
  if (imageUrl.value) {
    emit('preview', imageUrl.value);
  }
}

function downloadImage() {
  if (imageUrl.value) {
    emit('download', imageUrl.value);
  }
}
</script>

<style scoped lang="scss">
.chat-bubble {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  background: var(--card);
  color: var(--text);
  margin-bottom: 12px;
  box-sizing: border-box;
  border: 1px solid var(--border);

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .bubble-name {
    font-weight: 600;
  }

  .bubble-status {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(160, 120, 220, 0.2);
    color: var(--text-secondary);
  }

  .bubble-progress {
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin-top: 8px;
    overflow: hidden;

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, rgb(160, 120, 220), rgb(201, 157, 245));
      transition: width 0.3s;
    }
  }

  .bubble-content {
    p {
      margin: 0;
      line-height: 1.5;
      word-break: break-word;
    }
  }

  .bubble-image {
    max-width: 100%;
    max-height: 300px;
    margin-top: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  .bubble-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
  }

  .download-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    opacity: 0.7;
    transition: opacity 0.2s, background 0.2s;

    &:hover {
      opacity: 1;
      background: var(--surface-variant);
    }
  }

  .bubble-loading {
    display: flex;
    align-items: center;
    gap: 4px;
    color: inherit;
    opacity: 0.8;

    .icon-clawshuaxin {
      animation: spin 1s linear infinite;
    }
  }

  .bubble-error {
    color: #ff4d4f;
    font-size: 12px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>