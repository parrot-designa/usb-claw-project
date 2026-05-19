<template>
  <div class="video-grid-wrapper">
    <!-- 顶部工具栏 -->
    <div class="grid-toolbar">
      <div class="toolbar-left">
        <div class="search-box">
          <span class="iconfont icon-clawsousuo search-icon"></span>
          <input
            v-model="searchText"
            type="text"
            class="search-input"
            placeholder="搜索提示词或模型..."
            @input="onSearch"
          />
          <span v-if="searchText" class="search-clear" @click="searchText = ''; onSearch()">&times;</span>
        </div>
        <span class="count-badge">共 {{ filteredVideos.length }} 条</span>
      </div>
      <div class="toolbar-right">
        <button class="tool-btn" @click="$emit('openFolder')">
          <span class="iconfont icon-clawwenjianjia"></span>
          打开文件夹
        </button>
        <button class="tool-btn danger" @click="showClearConfirm = true" :disabled="videos.length === 0">
          <span class="iconfont icon-clawshanchu"></span>
          清空
        </button>
      </div>
    </div>

    <!-- 视频网格 -->
    <div v-if="filteredVideos.length > 0" class="video-grid">
      <div
        v-for="video in filteredVideos"
        :key="video.id"
        class="video-card"
        @click="previewVideo(video)"
      >
        <div class="card-video-wrapper">
          <video :src="video.url" preload="metadata" />
          <span v-if="video.type === 'image-to-video'" class="type-badge">图生视频</span>
          <div class="card-overlay">
            <button class="overlay-btn" title="从历史作品中移除" @click.stop="$emit('delete', video.id)">
              <span class="iconfont icon-clawshanchu"></span>
            </button>
          </div>
          <div class="play-icon">
            <span class="iconfont icon-clawicon_shipinshengcheng"></span>
          </div>
        </div>
        <div class="card-info">
          <div class="card-prompt" :title="video.prompt">
            {{ video.prompt || '无提示词' }}
          </div>
          <div class="card-meta">
            <span class="card-date">{{ video.date }}</span>
            <span class="card-time">{{ video.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="grid-empty">
      <div class="empty-content">
        <span class="iconfont icon-clawicon_shipinshengcheng empty-icon"></span>
        <h3>{{ videos.length === 0 ? '暂无历史作品' : '无匹配结果' }}</h3>
        <p>{{ videos.length === 0 ? '生成的视频将显示在这里' : '尝试其他搜索关键词' }}</p>
      </div>
    </div>

    <!-- 大图预览 -->
    <div v-if="previewUrl" class="preview-modal" @click="previewUrl = null">
      <div class="preview-content" @click.stop>
        <video :src="previewUrl" controls autoplay loop class="preview-video" />
        <div class="preview-info">
          <p class="preview-prompt">{{ previewPrompt }}</p>
        </div>
        <button @click="previewUrl = null" class="preview-close">&times;</button>
      </div>
    </div>

    <!-- 清空确认弹窗 -->
    <div v-if="showClearConfirm" class="modal-overlay" @click.self="showClearConfirm = false">
      <div class="modal-card">
        <h3 class="modal-title">确认清除</h3>
        <p class="modal-desc">确认是否清除所有历史作品？此操作不可逆，请确认是否操作。</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="showClearConfirm = false">取消</button>
          <button class="modal-btn confirm" @click="confirmClear">清除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  videos: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['delete', 'download', 'openFolder', 'clear']);

const searchText = ref('');
const previewUrl = ref(null);
const previewPrompt = ref('');
const showClearConfirm = ref(false);

const filteredVideos = computed(() => {
  const kw = searchText.value.trim().toLowerCase();
  if (!kw) return props.videos;
  return props.videos.filter(v => {
    const prompt = (v.prompt || '').toLowerCase();
    const model = (v.model || '').toLowerCase();
    return prompt.includes(kw) || model.includes(kw);
  });
});

function onSearch() {
  // 搜索由 computed 自动处理
}

function previewVideo(video) {
  previewUrl.value = video.url;
  previewPrompt.value = video.prompt || '';
}

function confirmClear() {
  showClearConfirm.value = false;
  emit('clear');
}
</script>

<style scoped lang="scss">
.video-grid-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.grid-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 360px;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 14px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 36px 8px 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-variant);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: rgb(160, 120, 220);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: var(--text-primary);
    background: var(--border);
  }
}

.count-badge {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-variant);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  .iconfont {
    font-size: 14px;
  }

  &:hover {
    background: var(--border);
  }

  &.danger {
    color: #e53e3e;
    border-color: rgba(229, 62, 62, 0.3);

    &:hover {
      background: rgba(229, 62, 62, 0.1);
      border-color: rgba(229, 62, 62, 0.5);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.video-card {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-variant);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
}

.card-video-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #1a1a2e;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .type-badge {
    position: absolute;
    top: 0;
    left: 0;
    padding: 3px 8px;
    font-size: 11px;
    color: #fff;
    background: linear-gradient(135deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
    border-radius: 0 0 6px 0;
    z-index: 2;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .play-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .iconfont {
      font-size: 18px;
      color: #fff;
    }
  }

  &:hover .card-overlay {
    opacity: 1;
  }
}

.overlay-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(229, 62, 62, 0.85);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;

  .iconfont {
    font-size: 16px;
    color: #fff;
  }

  &:hover {
    transform: scale(1.15);
    background: #e53e3e;
  }
}

.card-info {
  padding: 10px 12px;
}

.card-prompt {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.card-date {
  white-space: nowrap;
}

.card-time {
  white-space: nowrap;

  &::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text-secondary);
    margin-right: 8px;
    vertical-align: middle;
  }
}

// 空状态
.grid-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 12px;
  display: block;
}

.empty-content h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-content p {
  font-size: 13px;
  margin: 0;
}

// 预览弹窗
.preview-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-content {
  position: relative;
  max-width: 85vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;

  .preview-video {
    max-width: 100%;
    max-height: 75vh;
    border-radius: 8px;
  }
}

.preview-info {
  max-width: 600px;
  margin-top: 12px;
}

.preview-prompt {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  text-align: center;
  line-height: 1.5;
}

.preview-close {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

// 清空确认弹窗
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 24px;
  width: 380px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.modal-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }

  &.cancel {
    background: var(--surface-variant);
    color: var(--text-secondary);
  }

  &.confirm {
    background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
    color: white;
  }
}
</style>
