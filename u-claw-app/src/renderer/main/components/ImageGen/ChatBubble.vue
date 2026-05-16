<template>
  <div class="chat-bubble">
    <div class="bubble-main">
      <!-- 头部：头像、类型、模型、横线 -->
      <div class="bubble-header">
        <div class="bubble-avatar">
          <span class="iconfont icon-clawziyouchuangzuo"></span>
        </div>
        <span class="bubble-type">{{ bubbleType }}</span>
        <span class="bubble-model">{{ modelName }}</span>
        <div class="bubble-divider"></div>
      </div>

      <!-- 右侧内容区 -->
      <div class="bubble-body">
        <!-- 内容 -->
        <div class="bubble-content">
          <p>{{ text }}</p>
        </div>
        <!-- 进度条 -->
        <div v-if="isLoading && fakeProgress > 0" class="bubble-progress">
          <div class="progress-bar" :style="{ width: fakeProgress + '%' }"></div>
        </div>
        <!-- 底部 -->
        <div class="bubble-footer">
          <div v-if="!isLoading && !error" class="bubble-actions">
            <button class="action-btn" @click="handleCopy" title="复制">
              <span class="iconfont icon-clawfuzhi"></span> 复制文字
            </button>
            <button class="action-btn" @click="regenerate" title="重新生成">
              <span class="iconfont icon-clawshuaxin"></span> 重新生成
            </button>
          </div>
          <span v-if="isLoading" class="bubble-loading">
            <span class="iconfont icon-clawshuaxin"></span>
            生成中{{ fakeProgress > 0 ? ` ${Math.round(fakeProgress)}%` : '' }} 已用{{ formatDuration(elapsedSeconds) }}
          </span>
          <span v-if="error" class="bubble-error">{{ error }}</span>
        </div>
      </div>

      <!-- 图片单独显示在气泡下方 -->
      <div v-if="imageUrls.length > 0" class="bubble-images-wrapper">
        <div v-for="(url, index) in imageUrls" :key="index" class="bubble-image-item">
          <img :src="url" @click="previewImage(url)" class="bubble-image" />
          <button class="download-btn" @click="downloadImage(url)">↓</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

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

const emit = defineEmits(['preview', 'copy', 'download', 'regenerate', 'copySuccess']);

function handleCopy() {
  if (text.value) {
    navigator.clipboard.writeText(text.value).then(() => {
      emit('copySuccess', '已复制到剪贴板');
      emit('copy', text.value);
    });
  }
}

const role = computed(() => props.bubble.role);
const text = computed(() => props.bubble.text);
const imageUrls = computed(() => {
  if (!props.bubble.imageUrl) return [];
  if (Array.isArray(props.bubble.imageUrl)) return props.bubble.imageUrl;
  return [props.bubble.imageUrl];
});
const error = computed(() => props.bubble.error);
const status = computed(() => props.bubble.status);

// 假的进度：从0慢慢增加到90%，成功时跳到100%
const progress = computed(() => props.bubble.progress ?? 0);

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
let progressTimer = null;
const fakeProgress = ref(0);

function updateElapsedTime() {
  if (props.bubble.startTime) {
    const now = Date.now();
    elapsedSeconds.value = Math.floor((now - props.bubble.startTime) / 1000);
  }
}

function formatDuration(seconds) {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  }
  return `${seconds}秒`;
}

function startFakeProgress() {
  fakeProgress.value = 0;
  progressTimer = setInterval(() => {
    if (fakeProgress.value < 90) {
      fakeProgress.value += Math.random() * 3 + 1; // 随机增加1-4%
      if (fakeProgress.value > 90) fakeProgress.value = 90;
    }
  }, 200);
}

function stopFakeProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

onMounted(() => {
  if (isLoading.value) {
    updateElapsedTime();
    timer = setInterval(updateElapsedTime, 1000);
    startFakeProgress();
  }
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  stopFakeProgress();
});

watch(() => props.bubble.status, (newStatus) => {
  if (newStatus === 'completed') {
    fakeProgress.value = 100;
    stopFakeProgress();
  }
});

function copyText() {
  if (text.value) {
    navigator.clipboard.writeText(text.value).then(() => {
      emit('copy', text.value);
    });
  }
}

function regenerate() {
  emit('regenerate', props.bubble);
}

function previewImage(url) {
  if (url) {
    emit('preview', url);
  }
}

function downloadImage(url) {
  if (url) {
    emit('download', url);
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
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding-left: 42px; /* 32px avatar + 10px gap */
  margin-bottom: 16px;
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
  position: absolute;
  left: 16px;

  .iconfont {
    font-size: 14px;
    color: #fff;
  }
}

.bubble-type {
  font-weight: 600;
  opacity: 0.95;
  color: #fff;
  flex-shrink: 0;
}

.bubble-model {
  opacity: 0.75;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}

.bubble-divider {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  min-width: 20px;
}

.bubble-body {
  min-width: 0;
  background: rgb(38, 49, 68);
  border: 1px solid rgb(35, 44, 66);
  border-radius: 4px 20px 20px 20px;
  padding: 10px 12px;
  position: relative;
  color: #fff;
  margin-left:36px;
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

.bubble-images-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  margin-left: 36px;
}

.bubble-image-item {
  position: relative;
  display: inline-block;

  .bubble-image {
    max-width: 100px;
    max-height: 100px;
    width: auto;
    height: auto;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  .download-btn {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    opacity: 0;
    color: #fff;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.7);
    }
  }

  &:hover .download-btn {
    opacity: 1;
  }
}

.bubble-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
}

.bubble-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
  }

  .iconfont {
    font-size: 12px;
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