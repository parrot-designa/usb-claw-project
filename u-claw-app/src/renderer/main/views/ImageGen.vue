<template>
  <div class="imagegen-view">
    <!-- Tab header -->
    <div class="tab-card">
      <div class="tab-header">
        <button :class="{ active: activeTab === 'free' }" @click="activeTab = 'free'">
          <span class="tab-content">
            <span class="iconfont icon-clawziyouchuangzuo"></span>
            <span class="tab-text">自由创作</span>
          </span>
          <span class="tab-desc">文生图/图生图 · 多会话</span>
        <span class="tab-indicator"></span>
        </button>
        <button :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">
          <span class="tab-content">
            <span class="iconfont icon-clawlishizuopin"></span>
            <span class="tab-text">历史作品</span>
          </span>
          <span class="tab-desc">我的作品</span>
          <span class="tab-indicator"></span>
        </button>
      </div>
    </div>

    <!-- 自由创作 Tab -->
    <div v-show="activeTab === 'free'" class="free-create-tab">
      <div class="left-panel">
        <!-- 会话列表 -->
        <div class="session-list-placeholder">
          <SessionList
            :sessions="sessions"
            :currentSessionId="currentSessionId"
            @select="handleSessionSelect"
          />
        </div>
        <!-- API Key 提示 -->
        <div class="api-key-hint">已自动使用【模型配置】的API Key</div>

        <!-- 参考图 & 表单区域 -->
        <div class="form-area">
          <ReferenceImages v-model:images="referenceImages" />

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
import SessionList from '../components/ImageGen/SessionList.vue';
import ReferenceImages from '../components/ImageGen/ReferenceImages.vue';
import ChatBubble from '../components/ImageGen/ChatBubble.vue';
import ImageGrid from '../components/ImageGen/ImageGrid.vue';

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
  await loadSessions();
});

async function loadSessions() {
  try {
    const result = await window.uclaw.ipcLoadImageSessions();
    if (result?.ok && result.data) {
      sessions.value = result.data.sessions || [];
      currentSessionId.value = result.data.currentSessionId;
    }
  } catch (e) {
    console.error('[ImageGen] Load sessions failed:', e);
  }
}

async function saveSessions() {
  try {
    await window.uclaw.ipcSaveImageSessions({
      sessions: toRaw(sessions.value),
      currentSessionId: currentSessionId.value
    });
  } catch (e) {
    console.error('[ImageGen] Save sessions failed:', e);
  }
}

function createNewSession() {
  const newSession = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    messages: [],
    status: 'empty'
  };
  sessions.value.unshift(newSession);
  currentSessionId.value = newSession.id;
  saveSessions();
  return newSession;
}

function selectSession(sessionId) {
  currentSessionId.value = sessionId;
  saveSessions();
}

function handleSessionSelect(sessionId) {
  selectSession(sessionId);
}

async function generateImage() {
  const text = inputText.value.trim();
  if (!text || generating.value) return;

  // 如果没有当前会话，创建新会话
  if (!currentSessionId.value) {
    createNewSession();
  }

  generating.value = true;

  try {
    // 获取用户 token
    const token = "sk-8Ij4Fan8qXefCv2h9S6lgJiLczsTP9nuRgcKBIs5BAqOeKWg";
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    // 调用图片生成接口，返回任务 ID
    const taskResult = await apiRequest('/v1/images/generations', {
      method: 'POST',
      body: {
        model: selectedModel.value,
        prompt: text,
        size: imageSize.value === 'auto' ? '1024x1024' : imageSize.value,
        n: imageCount.value
      },
      headers: authHeader
    });

    if (taskResult.error) {
      showToast('生成失败: ' + taskResult.error, true);
      generating.value = false;
      return;
    }

    if (!taskResult.id) {
      showToast('未返回任务ID', true);
      generating.value = false;
      return;
    }

    // 添加 AI 气泡（包含用户输入的文本和任务信息）
    if (currentSession.value) {
      const msgIndex = currentSession.value.messages.length;
      currentSession.value.messages.push({
        role: 'ai',
        text: text,
        taskId: taskResult.id,
        status: taskResult.status || 'queued',
        progress: 0,
        imageUrl: null,
        revisedPrompt: '',
        time: formatTime(),
        startTime: Date.now()
      });
      saveSessions();

      // 轮询任务状态
      pollTaskStatus(taskResult.id, msgIndex);
    }

    inputText.value = '';
    referenceImages.value = [];
  } catch (e) {
    showToast('生成失败: ' + e.message, true);
    generating.value = false;
  }
}

async function pollTaskStatus(taskId, msgIndex) {
  const maxPolls = 120; // 最多轮询 120 秒
  let pollCount = 0;

  const timer = setInterval(async () => {
    pollCount++;

    try {
      const token = "sk-8Ij4Fan8qXefCv2h9S6lgJiLczsTP9nuRgcKBIs5BAqOeKWg";
      const result = await apiRequest(`/v1/images/generations/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const session = currentSession.value;
      if (!session || !session.messages[msgIndex]) {
        clearInterval(timer);
        generating.value = false;
        return;
      }

      const msg = session.messages[msgIndex];
      const newStatus = result.status;
      const newProgress = result.progress || 0;

      // 状态变更时更新本地
      if (msg.status !== newStatus || msg.progress !== newProgress) {
        msg.status = newStatus;
        msg.progress = newProgress;
        msg.revisedPrompt = result.revised_prompt || msg.revisedPrompt;
        msg.error = result.error || null;

        // 完成后保存结果
        if (newStatus === 'completed' && result.url) {
          msg.imageUrl = result.url;
          clearInterval(timer);
          showToast('图片生成成功');
          generating.value = false;
        } else if (newStatus === 'failed') {
          msg.error = result.error || '生成失败';
          clearInterval(timer);
          showToast('图片生成失败: ' + msg.error, true);
          generating.value = false;
        }

        saveSessions();
      }

      // 超时停止轮询
      if (pollCount >= maxPolls) {
        clearInterval(timer);
        msg.error = '生成超时';
        generating.value = false;
        saveSessions();
      }
    } catch (e) {
      console.error('[ImageGen] Poll status failed:', e);
    }
  }, 1000);
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.tab-card {
  background: var(--surface);
  border-radius: 0; 
  margin-bottom: 0;
  width: 100%;
}

.tab-header {
  display: flex; 
  overflow: hidden;
  background-color: var(--card2);

  button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border: none;
    background: none;
    cursor: pointer;
    transition: color 0.2s;
    font-size: 14px;
    color: var(--text-secondary);

    &.active {
      color: rgb(175, 153, 215);
      font-weight: 500;
    }

    .tab-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab-text {
      font-weight: 500;
    }

    .tab-desc {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      transition: color 0.2s;
    }

    &.active .tab-desc {
      color: rgb(175, 153, 215);
      opacity: 0.7;
    }

    .tab-indicator {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 2px;
      background: rgb(175, 153, 215);
      border-radius: 1px;
      transition: width 0.2s;
    }

    &.active .tab-indicator {
      width: 100%;
    }
  }
}

.imagegen-view {
  padding: 0;
}

.free-create-tab {
  display: flex; 
  height: calc(100vh - 100px - 32px);
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
}

.right-panel {
  flex: 1;
  position: relative;
  border-radius: 0;
  background: var(--surface);
  transition: all 0.3s ease;
  overflow: hidden;
  border-left: 1px solid var(--border);

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

.form-area {
  background: var(--surface);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-area {
  width: 100%;
}

.prompt-textarea {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
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
  margin-top: auto;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, rgb(201, 157, 245) 0%, rgb(160, 120, 220) 100%);
  color: white;
  font-weight: 500;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.session-list-placeholder {
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 200px;
}

.api-key-hint {
  font-size: 11px;
  color: #22c55e;
  padding: 4px 12px;
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
}

.history-works-tab {
  height: calc(100vh - 100px - 32px);
}
</style>