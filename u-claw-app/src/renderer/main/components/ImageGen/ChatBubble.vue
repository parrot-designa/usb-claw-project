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

        <!-- 参考图（如果有） -->
        <div v-if="referenceImages.length > 0" class="bubble-reference-images">
          <div v-for="(img, idx) in referenceImages" :key="idx" class="ref-image">
            <img :src="img" />
          </div>
        </div>
        <!-- 进度条 -->
        <div v-if="isLoading && fakeProgress > 0" class="bubble-progress">
          <div class="progress-bar" :style="{ width: fakeProgress + '%' }"></div>
        </div>
        <!-- 底部 -->
        <div class="bubble-footer">
          <div v-if="!error" class="bubble-actions">
            <button class="action-btn" @click="handleCopy" title="复制">
              <span class="iconfont icon-clawfuzhi"></span> 复制文字
            </button>
            <button v-if="!isLoading" class="action-btn" @click="regenerate" title="重新生成">
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

      <!-- 图片区域：气泡下方，图片上方显示时间和状态 -->
      <div v-if="imageUrls.length > 0" class="bubble-images-wrapper">
        <div v-if="loadDuration" class="bubble-image-meta">
          <span class="meta-time">耗时 {{ formatDuration(loadDuration) }}</span>
          <span class="meta-status" :class="loadStatus">{{ loadStatusText }}</span>
        </div>
        <div v-for="(url, index) in imageUrls" :key="index" class="bubble-image-item">
          <div class="image-placeholder" :class="{ loaded: imageLoaded[index], error: imageError[index] }">
            <img
              :src="url"
              @load="onImageLoad(index)"
              @error="onImageError(index)"
              @click="previewImage(url)"
              class="bubble-image"
            />
            <div class="image-actions">
              <button class="image-action-btn" @click.stop="insertImage(url)" title="基于此图生成（插入左侧参考图）">
                <span class="iconfont icon-clawtupian"></span>
              </button>
              <button class="image-action-btn" @click.stop="regenerateSingle(url)" title="根据相同参数重新生成">
                <span class="iconfont icon-clawshuaxin"></span>
              </button>
              <button class="image-action-btn" @click.stop="downloadImage(url)" title="下载">
                <span class="iconfont icon-clawxiazai"></span>
              </button>
            </div>
          </div>
          
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

const emit = defineEmits(['preview', 'copy', 'download', 'regenerate', 'copySuccess', 'insert']);

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
const referenceImages = computed(() => props.bubble.referenceImages || []);
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

const loadedTime = computed(() => props.bubble.loadedTime || '');
const loadDuration = computed(() => props.bubble.loadDuration ?? null);
const loadStatus = computed(() => props.bubble.loadStatus || '');
const loadStatusText = computed(() => {
  switch (loadStatus.value) {
    case 'success': return '加载成功';
    case 'failed': return '生成失败';
    default: return '';
  }
});

const elapsedSeconds = ref(0);
let timer = null;
let progressTimer = null;
const fakeProgress = ref(0);
const imageLoaded = ref({});
const imageError = ref({});

function onImageLoad(index) {
  imageLoaded.value[index] = true;
  imageError.value[index] = false;
}

function onImageError(index) {
  imageError.value[index] = true;
  imageLoaded.value[index] = false;
}

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
      fakeProgress.value += Math.random() * 0.6 + 0.2; // 随机增加0.2-0.8%，5倍慢
      if (fakeProgress.value > 90) fakeProgress.value = 90;
    }
  }, 1000); // 1秒间隔，5倍慢
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
  if (newStatus === 'in_progress') {
    fakeProgress.value = 0;
    elapsedSeconds.value = 0;
    stopFakeProgress();
    startFakeProgress();
    stopTimer();
    startTimer();
  } else if (newStatus === 'completed') {
    fakeProgress.value = 100;
    stopFakeProgress();
    stopTimer();
  }
});

function startTimer() {
  updateElapsedTime();
  timer = setInterval(updateElapsedTime, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

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

function insertImage(url) {
  if (url) {
    emit('insert', url);
  }
}

function regenerateSingle(url) {
  emit('regenerate', { ...props.bubble, regenerateImageUrl: url });
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

.bubble-reference-images {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;

  .ref-image {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
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

.bubble-image-meta {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;

  .meta-time {
    color: rgba(255, 255, 255, 0.6);
  }

  .meta-status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;

    &.success {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }

    &.failed {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  }
}

.bubble-image-item {
  position: relative;
  display: inline-block;

  .image-placeholder {
    position: relative;
    min-width: 100px;
    min-height: 100px;
    background: linear-gradient(135deg, rgba(157, 67, 234, 0.2) 0%, rgba(221, 54, 130, 0.2) 100%);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.15) 50%,
        transparent 100%
      );
      animation: shimmer 1.5s infinite;
    }

    &:not(.loaded)::after {
      content: '⏳';
      font-size: 32px;
      opacity: 0.6;
    }

    &.loaded::before {
      display: none;
    }

    &.loaded {
      background: transparent;
      position: relative;

      .bubble-image{
        opacity: 1;
      }

      .image-actions {
        position: absolute;
        left: 4px;
        top: 4px;
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 1;
      }

      &:hover {
        .image-actions {
          opacity: 1;
        }
      }
    }

    &.error::before {
      display: none;
    }

    .bubble-image {
      max-width: 100px;
      max-height: 100px;
      width: auto;
      height: auto;
      border-radius: 6px;
      cursor: pointer;
      transition: opacity 0.2s;
      position: relative;
      z-index: 1;
      opacity: 0;  
    }
  }

  .image-action-btn {
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: #fff;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }

    .iconfont {
      font-size: 12px;
    }
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

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>