<template>
  <div class="chat-bubble">
    <div class="bubble-main">
      <!-- 左侧头像 -->
      <div class="bubble-avatar">
        <span class="iconfont icon-clawziyouchuangzuo"></span>
      </div>

      <!-- 右侧内容区 -->
      <div class="bubble-body">
        <div class="bubble-header">
          <span class="bubble-type">{{ bubbleType }}</span>
          <span class="bubble-model">{{ modelName }}</span>
        </div>
        <div class="bubble-divider"></div>
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
    default: ''
  }
});

const emit = defineEmits(['preview', 'copy', 'download']);

const role = computed(() => props.bubble.role);
const text = computed(() => props.bubble.text);
const imageUrl = computed(() => props.bubble.imageUrl);
const error = computed(() => props.bubble.error);
const status = computed(() => props.bubble.status);
const progress = computed(() => props.bubble.progress || 0);

const bubbleType = computed(() => {
  const type = props.bubble.type || 'text-to-image';
  return type === 'image-to-image' ? '图生图' : '文生图';
});

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
  margin-bottom: 10px;
  box-sizing: border-box;
}

.bubble-main {
  display: flex;
  gap: 10px;
  padding: 0;
}

.bubble-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .iconfont {
    font-size: 14px;
    color: #fff;
  }
}

.bubble-body {
  flex: 1;
  min-width: 0;
  background: rgb(38, 49, 68);
  border: 1px solid rgb(35, 44, 66);
  border-radius: 8px 8px 12px 12px;
  padding: 10px 12px;
  position: relative;
  color: #fff;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 11px;
}

.bubble-type {
  font-weight: 600;
  opacity: 0.95;
}

.bubble-model {
  opacity: 0.75;
  font-size: 10px;
}

.bubble-divider {
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}

.bubble-content {
  p {
    margin: 0;
    line-height: 1.5;
    word-break: break-word;
    font-size: 13px;
  }
}

.bubble-progress {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;

  .progress-bar {
    height: 100%;
    background: #fff;
    transition: width 0.3s;
  }
}

.bubble-image {
  max-width: 100%;
  max-height: 280px;
  margin-top: 8px;
  border-radius: 6px;
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
  font-size: 11px;
}

.download-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0.7;
  color: #fff;
  transition: opacity 0.2s, background 0.2s;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.2);
  }
}

.bubble-loading {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.9;

  .icon-clawshuaxin {
    animation: spin 1s linear infinite;
  }
}

.bubble-error {
  color: #ffcccc;
  font-size: 11px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>