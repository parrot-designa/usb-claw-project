<template>
  <div class="imagegen-view">
    <!-- Tab header -->
    <div class="tab-header">
      <button :class="{ active: activeTab === 'free' }" @click="activeTab = 'free'">
        自由创作
        <small>文生图/图生图/多会话</small>
      </button>
      <button :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">
        历史作品
        <small>我的作品</small>
      </button>
    </div>

    <!-- 自由创作 Tab -->
    <div v-show="activeTab === 'free'" class="free-create-tab">
      <div class="left-panel">
        <!-- 会话列表 -->
        <div class="session-list-placeholder">
          <SessionList />
        </div>

        <!-- 参考图上传 -->
        <div class="reference-images-placeholder">
          <ReferenceImages />
        </div>

        <!-- 描述 textarea -->
        <div class="prompt-area">
          <textarea
            v-model="inputText"
            class="prompt-textarea"
            placeholder="描述你想要生成的图片..."
            :rows="4"
          ></textarea>
        </div>

        <!-- 模型、尺寸、数量选择 -->
        <div class="generate-options">
          <select v-model="selectedModel" class="option-select">
            <option value="gpt-image-2">GPT Image 2</option>
            <option value="dall-e-3">DALL-E 3</option>
            <option value="dall-e-2">DALL-E 2</option>
          </select>
          <select v-model="imageSize" class="option-select">
            <option value="auto">自动</option>
            <option value="1024x1024">1024x1024</option>
            <option value="1024x1792">1024x1792 (竖图)</option>
            <option value="1792x1024">1792x1024 (横图)</option>
          </select>
          <select v-model="imageCount" class="option-select">
            <option :value="1">1 张</option>
            <option :value="2">2 张</option>
            <option :value="4">4 张</option>
          </select>
        </div>

        <!-- 生成按钮 -->
        <button
          @click="generateImage"
          class="generate-btn"
          :disabled="!inputText.trim() || generating"
        >
          <span v-if="generating" class="iconfont icon-clawshuaxin"></span>
          <span v-else>生成图片</span>
        </button>
      </div>

      <div class="right-panel" :class="{ collapsed: rightPanelCollapsed }">
        <span class="collapse-icon" @click="toggleRightPanel">
          {{ rightPanelCollapsed ? '☰' : '×' }}
        </span>
        <!-- 空白占位符或聊天气泡 -->
        <div class="bubbles-area">
          <ChatBubble v-for="(bubble, index) in bubbles" :key="index" :bubble="bubble" />
          <div v-if="!bubbles.length" class="empty-bubbles">
            <span>生成的图片将在这里显示</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史作品 Tab -->
    <div v-show="activeTab === 'history'" class="history-works-tab">
      <ImageGrid />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, toRaw } from 'vue';
import { useToast } from '../composables/useToast';
import { useModelsStore } from '../stores/models';
import { useUserStore } from '../stores/user';
import { apiRequest } from '@renderer/js/api';

const { showToast } = useToast();
const modelsStore = useModelsStore();
const userStore = useUserStore();

// 核心数据结构
const sessions = ref([]);           // 会话列表
const currentSessionId = ref(null); // 当前会话ID
const activeTab = ref('free');      // 当前激活的 Tab
const rightPanelCollapsed = ref(false); // 右侧面板是否折叠
const referenceImages = ref([]);    // 参考图列表

const inputText = ref('');
const selectedModel = ref('gpt-image-2');
const imageSize = ref('auto');
const imageCount = ref(1);
const generating = ref(false);

const currentSession = computed(() => {
  return sessions.value.find(s => s.id === currentSessionId.value);
});

const bubbles = computed(() => {
  return currentSession.value?.messages || [];
});

function toggleRightPanel() {
  rightPanelCollapsed.value = !rightPanelCollapsed.value;
}

onMounted(async () => {
  // 初始化逻辑
});

async function generateImage() {
  const text = inputText.value.trim();
  if (!text || generating.value) return;

  generating.value = true;

  try {
    // 获取用户 token
    const token = userStore.userInfo?.token;
    const authHeader = token ? { Authorization: `Bearer ${token.key}` } : {};

    // 调用图片生成接口
    const result = await apiRequest('/v1/images/generations', {
      method: 'POST',
      body: {
        model: selectedModel.value,
        prompt: text,
        size: imageSize.value === 'auto' ? '1024x1024' : imageSize.value,
        n: imageCount.value
      },
      headers: authHeader
    });

    if (result.error) {
      showToast('生成失败: ' + result.error, true);
    } else if (result.url) {
      showToast('图片生成成功');
      // 添加到当前会话的气泡
      if (currentSession.value) {
        currentSession.value.messages.push({
          role: 'ai',
          text: '',
          imageUrl: result.url,
          revisedPrompt: result.revisedPrompt || '',
          time: formatTime()
        });
      }
    } else {
      showToast('未返回图片', true);
    }
  } catch (e) {
    showToast('生成失败: ' + e.message, true);
  } finally {
    generating.value = false;
  }
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.tab-header {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface);
  border-radius: 8px;
  width: fit-content;
  margin-bottom: 12px;

  button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.2s;

    small {
      font-size: 11px;
      color: var(--text-secondary);
    }

    &.active {
      background: var(--secondary);
      color: white;

      small {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }
}

.free-create-tab {
  display: flex;
  gap: 16px;
  height: calc(100vh - 100px);
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.right-panel {
  flex: 1;
  position: relative;
  border-radius: 12px;
  background: var(--surface);
  transition: all 0.3s ease;
  overflow: hidden;

  &.collapsed {
    flex: 0;
    width: 0;
    padding: 0;
    opacity: 0;
  }
}

.collapse-icon {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-variant);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;

  .right-panel:hover & {
    opacity: 1;
  }
}

.bubbles-area {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.empty-bubbles {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.prompt-area {
  width: 100%;
}

.prompt-textarea {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface-variant);
  resize: none;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: var(--blue);
  }
}

.generate-options {
  display: flex;
  gap: 8px;

  .option-select {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
}

.generate-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: var(--secondary);
  color: white;
  font-weight: 500;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.session-list-placeholder {
  flex-shrink: 0;
}

.reference-images-placeholder {
  flex-shrink: 0;
}

.history-works-tab {
  height: calc(100vh - 100px);
}
</style>