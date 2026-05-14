<template>
  <div :class="['chat-bubble', { 'user': role === 'user', 'ai': role === 'ai' }]">
    <div class="bubble-header">
      <span class="bubble-name">{{ name }}</span>
      <span v-if="modelName" class="bubble-model">{{ modelName }}</span>
    </div>
    <div class="bubble-content">
      <p>{{ text }}</p>
      <img v-if="imageUrl" :src="imageUrl" @click="previewImage" class="bubble-image" />
    </div>
    <div class="bubble-footer">
      <button v-if="role === 'user'" class="copy-btn" @click="copyText">📋</button>
      <span v-if="loading" class="bubble-loading">
        <span class="iconfont icon-clawshuaxin"></span>
        生成中 已用{{ elapsedSeconds }}秒
      </span>
      <span v-if="error" class="bubble-error">{{ error }}</span>
      <button v-if="imageUrl && !loading" class="download-btn" @click="downloadImage">↓</button>
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
const loading = computed(() => props.bubble.loading);
const error = computed(() => props.bubble.error);
const name = computed(() => role.value === 'user' ? '我' : '文生图');

const elapsedSeconds = ref(0);
let timer = null;

function updateElapsedTime() {
  if (props.bubble.startTime) {
    const now = Date.now();
    elapsedSeconds.value = Math.floor((now - props.bubble.startTime) / 1000);
  }
}

onMounted(() => {
  if (loading.value) {
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
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;

  &.user {
    align-self: flex-end;
    background: linear-gradient(135deg, #4a9eff, #00d4ff);
    color: #fff;
    margin-left: auto;

    .bubble-header {
      justify-content: flex-end;
    }

    .bubble-footer {
      justify-content: flex-end;
    }
  }

  &.ai {
    align-self: flex-start;
    background: #f0f2f5;
    color: #333;
    margin-right: auto;

    .bubble-model {
      background: #e6e6e6;
      color: #666;
    }
  }

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

  .bubble-model {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.2);
    color: inherit;
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

  .copy-btn,
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
      background: rgba(0, 0, 0, 0.1);
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