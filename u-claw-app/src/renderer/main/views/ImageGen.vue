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
      <div class="left-panel" :class="{ collapsed: leftPanelCollapsed }">
        <span v-if="!leftPanelCollapsed" class="collapse-icon left" @click="toggleLeftPanel">←</span>
        <span v-else class="collapse-icon left" @click="toggleLeftPanel">→</span>
        <!-- 会话列表 -->
        <div class="session-list-placeholder">
          <SessionList
            :sessions="sessions"
            :currentSessionId="currentSessionId"
            @select="handleSessionSelect"
            @delete="handleSessionDelete"
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
              <option v-for="model in imageModels" :key="model.model_name" :value="model.model_name">
                {{ model.model_name }}
              </option>
            </select>
            <select v-model="imageSize" class="option-select">
              <option value="1024x1024">1024x1024 (正方形)</option>
              <option value="1024x1792">1024x1792 (竖图)</option>
              <option value="1792x1024">1792x1024 (横图)</option>
              <option value="1536x1024">1536x1024 (横向)</option>
              <option value="1024x1536">1024x1536 (纵向)</option>
              <option value="1344x1024">1344x1024 (横向)</option>
              <option value="1024x1344">1024x1344 (纵向)</option>
            </select>
            <input
              v-model.number="imageCount"
              type="number"
              min="1"
              max="4"
              class="option-input"
              placeholder="1-4"
            />
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

      <div class="right-panel">
        <span class="collapse-icon" @click="toggleLeftPanel">
          <span class="iconfont icon-clawzhedie"></span>
        </span>
        <!-- 空白占位符或聊天气泡 -->
        <div class="bubbles-area">
          <ChatBubble
            v-for="(bubble, index) in bubbles"
            :key="index"
            :bubble="bubble"
            :modelName="selectedModel"
            @regenerate="handleRegenerate"
          />
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
const leftPanelCollapsed = ref(false); // 左侧面板是否折叠
const referenceImages = ref([]);    // 参考图列表

const inputText = ref('');
const imageModels = ref([]);
const selectedModel = ref('gpt-image-2');
const imageSize = ref('1024x1024');
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

function toggleLeftPanel() {
  leftPanelCollapsed.value = !leftPanelCollapsed.value;
}

onMounted(async () => {
  await loadSessions();
  await loadImageModels();
});

async function loadImageModels() {
  try {
    const res = await apiRequest('/api/models/image', { method: 'POST' });
    if (res.success && res.data?.length > 0) {
      imageModels.value = res.data;
      if (!selectedModel.value || !res.data.find(m => m.model_name === selectedModel.value)) {
        selectedModel.value = res.data[0].model_name;
      }
    }
  } catch (e) {
    console.error('[ImageGen] loadImageModels failed:', e);
  }
}

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

function handleSessionDelete(sessionId) {
  const index = sessions.value.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions.value.splice(index, 1);
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value.length > 0 ? sessions.value[0].id : null;
    }
    saveSessions();
  }
}

async function generateImage() {
  const text = inputText.value.trim();
  if (!text || generating.value) return;

  if (!currentSessionId.value) {
    createNewSession();
  }

  generating.value = true;

  try {
    // 调用图片生成接口，返回任务 ID
    const taskResult = await apiRequest('/v1/images/generations', {
      method: 'POST',
      body: {
        model: selectedModel.value,
        prompt: text,
        size: imageSize.value,
        n: imageCount.value
      }
    });

    if (taskResult.error) {
      showToast('生成失败: ' + taskResult.error, true);
      generating.value = false;
      return;
    }

    // 兼容处理：直接返回图片URL（同步模式）或返回task_id（异步模式）
    let taskId = taskResult.id;
    let imageUrl = null;
    let status = 'queued';

    if (taskResult.result?.data && taskResult.result?.data[0]?.url) {
      // 同步模式：直接返回图片
      imageUrl = taskResult.result?.data[0].url;
      status = 'completed';
    } else if (taskResult.result?.data && taskResult.result?.data[0]?.b64_json) {
      // Base64 模式
      imageUrl = `data:image/png;base64,${taskResult.result?.data[0].b64_json}`;
      status = 'completed';
    }

    if (currentSession.value) {
      const msgIndex = currentSession.value.messages.length;
      const msgType = referenceImages.value.length > 0 ? 'image-to-image' : 'text-to-image';
      currentSession.value.messages.push({
        role: 'ai',
        type: msgType,
        text: text,
        taskId: taskId,
        status: status,
        progress: 0,
        imageUrl: imageUrl,
        revisedPrompt: taskResult.result?.data?.[0]?.revised_prompt || '',
        time: formatTime(),
        startTime: Date.now()
      });
      saveSessions();

      // 如果是异步任务（返回task_id），开始轮询
      if (taskId && status !== 'completed') {
        pollTaskStatus(taskId, msgIndex, selectedModel.value);
      } else {
        generating.value = false;
        if (imageUrl) {
          showToast('图片生成成功');
        }
      }
    }

    inputText.value = '';
    referenceImages.value = [];
  } catch (e) {
    showToast('生成失败: ' + e.message, true);
    generating.value = false;
  }
}

async function pollTaskStatus(taskId, msgIndex, model) {
  const maxPolls = 220;
  let pollCount = 0;

  const timer = setInterval(async () => {
    pollCount++;

    try {
      const result = await apiRequest(`/v1/images/generations/${taskId}`, {
        method: 'POST',
        body: {
          model: model
        }
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
      console.log("newStatus",newStatus,newProgress)
      if (msg.status !== newStatus || msg.progress !== newProgress) {
        msg.status = newStatus;
        msg.progress = newProgress;
        msg.revisedPrompt = result.result?.data?.[0]?.revised_prompt || msg.revisedPrompt;
        msg.error = result.error || null;
        if (newStatus === 'completed' && result.result?.data?.[0]?.url) {

          msg.imageUrl = result.result?.data[0].url;
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

      if (pollCount >= maxPolls) {
        clearInterval(timer);
        msg.error = '生成超时';
        generating.value = false;
        saveSessions();
      }
    } catch (e) {
      console.error('[ImageGen] Poll status failed:', e);
    }
  }, 2000);
}

async function handleRegenerate(bubble) {
  inputText.value = bubble.text;
  referenceImages.value = bubble.referenceImages || [];
  await generateImage();
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
  position: relative;
  transition: all 0.3s ease;

  &.collapsed {
    flex: 0;
    width: 0;
    padding: 0;
    opacity: 0;
    overflow: hidden;
  }

  .collapse-icon.left {
    position: absolute;
    top: 8px;
    right: 8px;
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

    .left-panel:hover & {
      opacity: 1;
    }
  }
}

.right-panel {
  flex: 1;
  position: relative;
  border-radius: 0;
  background: var(--surface);
  transition: all 0.3s ease;
  overflow: hidden;
  border-left: 1px solid var(--border);
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
  flex-wrap: wrap;

  .option-select {
    flex: 1;
    min-width: 100px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 14px;
  }

  .option-input {
    width: 70px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    text-align: center;
    font-size: 14px;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
}

.generate-btn {
  width: 100%;
  padding: 12px;
  margin-top: auto;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
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
  max-height: 400px;
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