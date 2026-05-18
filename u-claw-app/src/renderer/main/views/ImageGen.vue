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
        <!-- 折叠图标 -->
        <span v-if="!leftPanelCollapsed" class="collapse-icon left" @click="toggleLeftPanel">←</span>
        <span v-else class="collapse-icon left" @click="toggleLeftPanel">→</span>

        <!-- 上部：会话列表区域 -->
        <div class="session-section">
          <div class="session-list-wrapper">
            <SessionList
              :sessions="sessions"
              :currentSessionId="currentSessionId"
              @select="handleSessionSelect"
              @delete="handleSessionDelete"
              @edit="handleSessionEdit"
            />
          </div>
          <div class="api-key-hint">已自动使用【模型配置】的API Key</div>
        </div>

        <!-- 中部：表单区域 -->
        <div class="form-area">
          <div class="form-item">
            <label class="form-label">参考图</label>
            <ReferenceImages v-model:images="referenceImages" />
          </div>

          <div class="form-item">
            <label class="form-label">提示词</label>
            <div class="prompt-area">
              <textarea
                v-model="inputText"
                class="prompt-textarea"
                placeholder="描述你想要生成的图片..."
                :rows="4"
              ></textarea>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">模型</label>
            <select v-model="selectedModel" class="option-select">
              <option v-for="model in imageModels" :key="model.model_name" :value="model.model_name">
                {{ model.model_name }}
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-item form-col">
              <label class="form-label">分辨率</label>
              <select v-model="selectedResolution" class="option-select">
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
            <div class="form-item form-col">
              <label class="form-label">尺寸</label>
              <select v-model="selectedSizeRatio" class="option-select">
                <option v-for="size in currentSizeOptions" :key="size.ratio" :value="size.ratio">
                  {{ size.ratio }} ({{ size.pixels }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 下部：生成按钮（固定在底部） -->
        <div class="btn-area">
          <button
            @click="generateImage"
            class="generate-btn"
            :class="{ active: inputText.trim() && !generating, generating: generating }"
            :disabled="!inputText.trim()"
          >
            <span v-if="generating" class="iconfont icon-clawshuaxin spinning"></span>
            <span v-else class="iconfont icon-clawtupianshengcheng"></span>
            <span v-if="generating">添加到队列中</span>
            <span v-else>生成图片</span>
          </button>
        </div>
      </div>

      <div class="right-panel" :class="{ 'right-panel-active': bubbles.length > 0 }">
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
            @copySuccess="showToast"
            @insert="handleInsertImage"
            @download="handleDownloadImage"
            @preview="handlePreviewImage"
          />
          <div v-if="!bubbles.length" class="empty-bubbles">
            <div class="empty-bubbles-content">
              <div class="empty-bubbles-icon">
                <span class="iconfont icon-clawtupianshengcheng"></span>
              </div>
              <h3 class="empty-bubbles-title">开始创作</h3>
              <p class="empty-bubbles-desc">在左侧填写描述 → 点"生成图片"<br/>每次生成会自动新建会话，保存到 U 盘</p>
              <ul class="empty-bubbles-tips">
                <li>💡 文生图：不传参考图，从文字生成</li>
                <li>💡 图生图：上传参考图 + 描述修改</li>
                <li>💡 继续修改：点结果图的按钮→图到左侧参考图</li>
                <li>💡 右键图片：复制到剪贴板</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史作品 Tab -->
    <div v-show="activeTab === 'history'" class="history-works-tab">
      <ImageGrid
        v-if="historyImages.length > 0"
        :images="historyImages"
        @delete="handleDeleteHistory"
        @download="handleDownloadImage"
        @openFolder="handleOpenMediaFolder"
        @clear="handleClearHistory"
      />
      <div v-else class="history-empty">
        <div class="history-empty-icon">
          <span class="iconfont icon-clawtupianshengcheng"></span>
        </div>
        <p class="history-empty-title">还没有作品</p>
        <p class="history-empty-desc">去<span class="history-empty-link" @click="activeTab = 'free'">「自由创作」</span>生成第一张图吧</p>
      </div>
    </div>

    <!-- 删除会话确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDeleteSession">
      <div class="modal-card">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-desc">确定要删除该会话吗？</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelDeleteSession">取消</button>
          <button class="modal-btn confirm" @click="confirmDeleteSession">删除</button>
        </div>
      </div>
    </div>

    <!-- 编辑会话标题弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-card">
        <h3 class="modal-title">编辑会话标题</h3>
        <input
          ref="editInput"
          v-model="editingTitle"
          class="modal-input"
          placeholder="输入会话标题..."
          @keyup.enter="saveSessionTitle"
          @keyup.esc="closeEditModal"
        />
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="closeEditModal">取消</button>
          <button class="modal-btn confirm" @click="saveSessionTitle">保存</button>
        </div>
      </div>
    </div>

    <!-- 全屏图片预览 -->
    <div v-if="showPreview" class="fullscreen-preview" @click="closePreview">
      <button class="preview-download-btn" @click.stop="handleDownloadImage(previewUrl)" title="下载">
        <span class="iconfont icon-clawxiazai"></span>
      </button>
      <button class="preview-close-btn" @click.stop="closePreview" title="关闭">
        <span class="iconfont icon-clawguanbi"></span>
      </button>
      <img :src="previewUrl" class="preview-image" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, toRaw, watch } from 'vue';
import { useToast } from '../composables/useToast';
import { useModelsStore } from '../stores/models';
import { useUserStore } from '../stores/user';
import { sessionsCache } from '../stores/imageGen';
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
const pollingTimers = ref(new Map()); // 存储轮询定时器: taskId -> timer

// 历史作品：从所有会话中提取已完成的图片
const historyImages = computed(() => {
  const images = [];
  for (const session of sessions.value) {
    if (session.deleted) continue;
    for (let i = 0; i < session.messages.length; i++) {
      const msg = session.messages[i];
      if (msg.status === 'completed' && msg.imageUrl && !msg.hideInHistory) {
        images.push({
          id: msg.taskId || `${session.id}_${i}`,
          url: msg.imageUrl,
          prompt: msg.text || '',
          model: msg.model || '',
          type: msg.type || '',
          date: msg.startTime ? new Date(msg.startTime).toLocaleDateString('zh-CN') : '',
          time: msg.loadedTime || msg.time || '',
        });
      }
    }
  }
  images.reverse();
  return images;
});

const inputText = ref('');
const imageModels = ref([]);
const selectedModel = ref('gpt-image-2');
const selectedResolution = ref('1K');
const selectedSizeRatio = ref('1:1');
const generating = ref(false);
const pendingTasks = ref(0); // 待完成的轮询任务数量

// 删除会话确认
const showDeleteConfirm = ref(false);
const deletingSessionId = ref(null);

// 编辑会话标题
const showEditModal = ref(false);
const editingSessionId = ref(null);
const editingTitle = ref('');
const editInput = ref(null);

// 全屏图片预览
const showPreview = ref(false);
const previewUrl = ref('');

// resolution 与 size 选项的映射
const resolutionSizeMap = {
  '1K': [
    { ratio: '1:1', label: '1:1', pixels: '1024x1024' },
    { ratio: '3:2', label: '3:2', pixels: '1536x1024' },
    { ratio: '2:3', label: '2:3', pixels: '1024x1536' }
  ],
  '2K': [
    { ratio: '1:1', label: '1:1', pixels: '2048x2048' },
    { ratio: '3:2', label: '3:2', pixels: '2048x1360' },
    { ratio: '2:3', label: '2:3', pixels: '1360x2048' },
    { ratio: '4:3', label: '4:3', pixels: '2048x1536' },
    { ratio: '3:4', label: '3:4', pixels: '1536x2048' },
    { ratio: '5:4', label: '5:4', pixels: '2560x2048' },
    { ratio: '4:5', label: '4:5', pixels: '2048x2560' },
    { ratio: '16:9', label: '16:9', pixels: '2048x1152' },
    { ratio: '9:16', label: '9:16', pixels: '1152x2048' },
    { ratio: '2:1', label: '2:1', pixels: '2688x1344' },
    { ratio: '1:2', label: '1:2', pixels: '1344x2688' },
    { ratio: '21:9', label: '21:9', pixels: '2688x1152' },
    { ratio: '9:21', label: '9:21', pixels: '1152x2688' }
  ],
  '4K': [
    { ratio: '16:9', label: '16:9', pixels: '3840x2160' },
    { ratio: '9:16', label: '9:16', pixels: '2160x3840' },
    { ratio: '2:1', label: '2:1', pixels: '3840x1920' },
    { ratio: '1:2', label: '1:2', pixels: '1920x3840' },
    { ratio: '21:9', label: '21:9', pixels: '3840x1648' },
    { ratio: '9:21', label: '9:21', pixels: '1648x3840' }
  ]
};

// 根据当前 resolution 获取 size 选项
const currentSizeOptions = computed(() => {
  return resolutionSizeMap[selectedResolution.value] || resolutionSizeMap['1K'];
});

// 根据 ratio 和 resolution 计算实际像素尺寸
const imageSize = computed(() => {
  const sizeOption = currentSizeOptions.value.find(opt => opt.ratio === selectedSizeRatio.value);
  return sizeOption?.pixels || '1024x1024';
});

// 监听 resolution 变化，确保 selectedSizeRatio 在合法范围内
watch(selectedResolution, (newRes) => {
  const validRatios = resolutionSizeMap[newRes]?.map(opt => opt.ratio) || [];
  if (!validRatios.includes(selectedSizeRatio.value)) {
    selectedSizeRatio.value = validRatios[0] || '1:1';
  }
});

const currentSession = computed(() => {
  return sessions.value.find(s => s.id === currentSessionId.value && !s.deleted);
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
  resumePendingPolls();
});

// 切换模型时保存当前会话，加载新模型的会话
watch(selectedModel, async (newModel, oldModel) => {
  if (!oldModel) return; // 首次初始化不处理
  await saveSessions();
  sessions.value = [];
  currentSessionId.value = null;
  await loadSessions();
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
  // 优先从预加载缓存读取
  const cached = sessionsCache._all;
  if (cached) {
    sessions.value = cached.sessions || [];
    currentSessionId.value = cached.currentSessionId;
    return;
  }
  try {
    const result = await window.uclaw.ipcLoadImageSessions();
    if (result?.ok && result.data) {
      sessions.value = result.data.sessions || [];
      currentSessionId.value = result.data.currentSessionId;
      sessionsCache._all = result.data;
    }
  } catch (e) {
    console.error('[ImageGen] Load sessions failed:', e);
  }
}

function resumePendingPolls() {
  for (const session of sessions.value) {
    if (session.deleted) continue;
    for (let i = 0; i < session.messages.length; i++) {
      const msg = session.messages[i];
      // 只恢复未完成的任务（in_progress 或 queued），且必须有 taskId
      if (!msg.taskId) continue;
      if (msg.status !== 'in_progress' && msg.status !== 'queued') continue;
      // 已经存在轮询定时器则跳过
      if (pollingTimers.value.has(msg.taskId)) continue;

      pendingTasks.value++;
      generating.value = true;
      pollTaskStatus(msg.taskId, i, session.id, selectedModel.value);
    }
  }
}

async function saveSessions() {
  console.log('saveSessions 被调用', {
    sessionsCount: sessions.value.length,
    currentSessionId: currentSessionId.value,
    currentSessionIdInSession: sessions.value.find(s => s.id === currentSessionId.value)?.id
  });
  try {
    // 深度转换为原始对象，避免 Vue 响应式代理导致 IPC 克隆失败
    const plainSessions = JSON.parse(JSON.stringify(toRaw(sessions.value)));
    // 同步更新缓存
    sessionsCache._all = { sessions: plainSessions, currentSessionId: currentSessionId.value };
    await window.uclaw.ipcSaveImageSessions(plainSessions, currentSessionId.value);
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
  deletingSessionId.value = sessionId;
  showDeleteConfirm.value = true;
}

function confirmDeleteSession() {
  const sessionId = deletingSessionId.value;
  if (!sessionId) return;

  // 取消该会话下所有轮询定时器
  sessions.value.forEach(session => {
    if (session.id === sessionId) {
      session.messages.forEach(msg => {
        if (msg.taskId && pollingTimers.value.has(msg.taskId)) {
          clearInterval(pollingTimers.value.get(msg.taskId));
          pollingTimers.value.delete(msg.taskId);
        }
      });
    }
  });

  // 标记为已删除，而不是真正删除（保留历史数据）
  const session = sessions.value.find(s => s.id === sessionId);
  if (session) {
    session.deleted = true;
    if (currentSessionId.value === sessionId) {
      const nextSession = sessions.value.find(s => !s.deleted);
      currentSessionId.value = nextSession?.id || null;
    }
    saveSessions();
  }

  cancelDeleteSession();
}

function cancelDeleteSession() {
  showDeleteConfirm.value = false;
  deletingSessionId.value = null;
}

function handleSessionEdit(sessionId) {
  const session = sessions.value.find(s => s.id === sessionId);
  if (!session) return;
  editingSessionId.value = sessionId;
  // 没有标题时，用最后一条消息的 text 作为初始值
  if (session.title) {
    editingTitle.value = session.title;
  } else {
    const messages = session.messages || [];
    const lastMsg = messages[messages.length - 1];
    editingTitle.value = lastMsg?.text || '';
  }
  showEditModal.value = true;
  nextTick(() => {
    editInput.value?.focus();
  });
}

function saveSessionTitle() {
  const session = sessions.value.find(s => s.id === editingSessionId.value);
  if (!session) return;
  session.title = editingTitle.value.trim() || '';
  saveSessions();
  closeEditModal();
}

function closeEditModal() {
  showEditModal.value = false;
  editingSessionId.value = null;
  editingTitle.value = '';
}

async function generateImage() {
  const text = inputText.value.trim();
  if (!text) return;

  const isRegenerate = regenerateSessionId !== null;

  if (!isRegenerate) {
    createNewSession();
  }

  generating.value = true;

  const msgType = referenceImages.value.length > 0 ? 'image-to-image' : 'text-to-image';

  // 乐观更新：先立即插入气泡，等接口返回再更新
  const optimisticMsg = {
    role: 'ai',
    type: msgType,
    text: text,
    taskId: null,
    status: 'queued',
    progress: 0,
    imageUrl: null,
    revisedPrompt: '',
    model: selectedModel.value,
    time: formatTime(),
    startTime: Date.now(),
    referenceImages: referenceImages.value
  };

  let msgIndex = -1;
  if (currentSession.value) {
    currentSession.value.messages.push(optimisticMsg);
    msgIndex = currentSession.value.messages.length - 1;
    saveSessions();
  }

  try {
    const taskResult = await apiRequest('/v1/images/generations', {
      method: 'POST',
      body: {
        model: selectedModel.value,
        prompt: text,
        size: selectedSizeRatio.value,
        resolution: selectedResolution.value,
        n: 1,
        ...(
referenceImages.value.length > 0 && { reference_images: referenceImages.value })
      }
    });

    const msg = currentSession.value?.messages[msgIndex];
    if (!msg) {
      generating.value = false;
      return;
    }

    if (taskResult.error) {
      msg.status = 'failed';
      msg.error = taskResult.error;
      msg.loadStatus = 'failed';
      msg.loadDuration = Math.round((Date.now() - msg.startTime) / 1000);
      saveSessions();
      showToast('生成失败: ' + taskResult.error, true);
      generating.value = false;
      return;
    }

    let taskId = taskResult.id;
    let imageUrl = null;
    let status = 'queued';

    if (taskResult.result?.data && taskResult.result?.data[0]?.url) {
      imageUrl = taskResult.result?.data[0].url;
      status = 'completed';
    } else if (taskResult.result?.data && taskResult.result?.data[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${taskResult.result?.data[0].b64_json}`;
      status = 'completed';
    }

    msg.taskId = taskId;
    msg.status = status;
    msg.imageUrl = imageUrl;
    msg.revisedPrompt = taskResult.result?.data?.[0]?.revised_prompt || '';
    saveSessions();

    if (taskId && status !== 'completed') {
      pendingTasks.value++;
      pollTaskStatus(taskId, msgIndex, currentSession.value.id, selectedModel.value);
    } else {
      if (imageUrl) {
        showToast('图片生成成功');
        saveImageToMedia(imageUrl, taskId, msg);
      }
      if (pendingTasks.value === 0) {
        generating.value = false;
      }
    }

    inputText.value = '';
    referenceImages.value = [];

    regenerateSessionId = null;
  } catch (e) {
    const msg = currentSession.value?.messages[msgIndex];
    if (msg) {
      msg.status = 'failed';
      msg.error = e.message;
      msg.loadStatus = 'failed';
      msg.loadDuration = Math.round((Date.now() - msg.startTime) / 1000);
      saveSessions();
    }
    showToast('生成失败: ' + e.message, true);
    generating.value = false;
    regenerateSessionId = null;
  }
}

async function pollTaskStatus(taskId, msgIndex, sessionId, model) {
  const maxPolls = 200; // 10分钟 = 600秒 / 3秒
  let pollCount = 0;
  let errorCount = 0;
  const maxErrors = 5;

  const timer = setInterval(async () => {
    pollCount++;

    try {
      const result = await apiRequest(`/v1/images/generations/${taskId}`, {
        method: 'POST',
        body: {
          model: model
        }
      });
      errorCount = 0; // 成功后重置错误计数

      // 使用创建消息时的会话ID，而不是当前的currentSessionId
      const session = sessions.value.find(s => s.id === sessionId);
      if (!session || msgIndex >= session.messages.length) {
        clearInterval(timer);
        pollingTimers.value.delete(taskId);
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
          msg.loadedTime = formatTime();
          msg.loadDuration = Math.round((Date.now() - msg.startTime) / 1000);
          msg.loadStatus = 'success';
          saveImageToMedia(result.result?.data[0].url, taskId, msg);
          clearInterval(timer);
          pollingTimers.value.delete(taskId);
          pendingTasks.value--;
          showToast('图片生成成功');
          if (pendingTasks.value === 0) {
            generating.value = false;
          }
        } else if (newStatus === 'failed') {
          msg.error = result.result?.error || result.error || '生成失败';
          msg.loadStatus = 'failed';
          msg.loadDuration = Math.round((Date.now() - msg.startTime) / 1000);
          clearInterval(timer);
          pollingTimers.value.delete(taskId);
          pendingTasks.value--;
          showToast('图片生成失败: ' + msg.error, true);
          if (pendingTasks.value === 0) {
            generating.value = false;
          }
        }

        saveSessions();
      }

      if (pollCount >= maxPolls) {
        clearInterval(timer);
        pollingTimers.value.delete(taskId);
        pendingTasks.value--;
        msg.status = 'failed';
        msg.error = '生成超时';
        msg.loadStatus = 'failed';
        msg.loadDuration = Math.round((Date.now() - msg.startTime) / 1000);
        if (pendingTasks.value === 0) {
          generating.value = false;
        }
        saveSessions();
      }
    } catch (e) {
      console.error('[ImageGen] Poll status failed:', e);
      errorCount++;
      if (errorCount >= maxErrors) {
        clearInterval(timer);
        pollingTimers.value.delete(taskId);
        pendingTasks.value--;
        const session = sessions.value.find(s => s.id === sessionId);
        if (session && msgIndex < session.messages.length) {
          session.messages[msgIndex].error = '轮询失败: 网络错误';
          session.messages[msgIndex].status = 'failed';
          session.messages[msgIndex].loadStatus = 'failed';
          session.messages[msgIndex].loadDuration = Math.round((Date.now() - session.messages[msgIndex].startTime) / 1000);
        }
        if (pendingTasks.value === 0) {
          generating.value = false;
        }
        saveSessions();
        showToast('图片生成失败: 网络连接异常', true);
      }
    }
  }, 3000);

  pollingTimers.value.set(taskId, timer);
}

// 重新生成：标记在哪个会话上追加新气泡（null = 普通生成，会创建新会话）
let regenerateSessionId = null;

async function handleRegenerate(bubble) {
  // 查找气泡所在的会话
  let targetSession = null;

  for (const session of sessions.value) {
    if (session.deleted) continue;
    for (let i = 0; i < session.messages.length; i++) {
      const msg = session.messages[i];
      if (msg.taskId === bubble.taskId && msg.text === bubble.text) {
        targetSession = session;
        break;
      }
    }
    if (targetSession) break;
  }

  if (!targetSession) {
    // 找不到时降级为普通生成
    regenerateSessionId = null;
    inputText.value = bubble.text;
    referenceImages.value = bubble.referenceImages || [];
    await generateImage();
    return;
  }

  // 在当前会话中追加新气泡（不覆盖原气泡）
  inputText.value = bubble.text;
  referenceImages.value = bubble.referenceImages || [];
  regenerateSessionId = targetSession.id;
  currentSessionId.value = targetSession.id;

  await generateImage();
}

function handleInsertImage(url) {
  referenceImages.value = [...referenceImages.value, url];
  showToast('已添加为参考图，可进行图生图');
}

function handlePreviewImage(url) {
  previewUrl.value = url;
  showPreview.value = true;
}

function closePreview() {
  showPreview.value = false;
  previewUrl.value = '';
}

async function handleDownloadImage(url) {
  const dirResult = await window.uclaw.ipcSelectDownloadDir();
  if (!dirResult.ok || dirResult.canceled) {
    return;
  }

  const filepath = dirResult.path;

  try {
    let base64;
    if (url.startsWith('data:')) {
      // data URL 格式，直接提取 base64 部分
      base64 = url.split(',')[1];
    } else {
      // 普通 URL，通过主进程下载（避免 CORS 问题）
      const downloadResult = await window.uclaw.ipcDownloadImage({ url });
      if (!downloadResult.ok) {
        showToast('下载失败: ' + (downloadResult.error || '无法下载图片'), true);
        return;
      }
      base64 = downloadResult.base64;
    }

    // 通过主进程保存文件
    const saveResult = await window.uclaw.ipcSaveFile({ filepath, buffer: base64 });
    if (saveResult.ok) {
      showToast(`图片已保存至: ${filepath}`);
    } else {
      showToast('保存失败: ' + (saveResult.error || '未知错误'), true);
    }
  } catch (e) {
    console.error('[ImageGen] download error:', e);
    showToast('下载失败: ' + (e.message || '未知错误'), true);
  }
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

async function saveImageToMedia(url, taskId, msg) {
  if (!url || url.startsWith('data:')) return;
  try {
    const result = await window.uclaw.ipcSaveMediaImage({ url, taskId });
    if (result?.ok && result.filepath) {
      msg.localPath = result.filepath;
    }
  } catch (e) {
    console.error('[ImageGen] saveImageToMedia failed:', e);
  }
}

function handleDeleteHistory(id) {
  for (const session of sessions.value) {
    if (session.deleted) continue;
    for (let i = 0; i < session.messages.length; i++) {
      const msg = session.messages[i];
      const msgId = msg.taskId || `${session.id}_${i}`;
      if (msgId === id) {
        msg.hideInHistory = true;
        saveSessions();
        return;
      }
    }
  }
}

async function handleOpenMediaFolder() {
  await window.uclaw.ipcOpenMediaFolder();
}

function handleClearHistory() {
  for (const session of sessions.value) {
    if (session.deleted) continue;
    for (const msg of session.messages) {
      if (msg.status === 'completed' && msg.imageUrl) {
        msg.hideInHistory = true;
      }
    }
  }
  saveSessions();
  showToast('已清空历史作品');
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
  background-color: transparent;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1px;

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
      .tab-text {
        color: rgb(189, 60, 182);
        font-weight: 600;
      }

      .iconfont {
        color: rgb(189, 60, 182);
      }
    }

    .tab-content {
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
      z-index: 1;
    }

    .tab-text {
      font-weight: 500;
      color: var(--text-secondary);
      transition: color 0.2s;
    }

    .iconfont {
      font-size: 16px;
      color: var(--text-secondary);
      transition: color 0.2s;
    }

    .tab-desc {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-secondary);
      transition: color 0.2s, background 0.2s;
      position: relative;
      z-index: 1;
    }

    &.active .tab-desc {
      color: rgb(189, 60, 182);
      opacity: 0.8;
    }

    .tab-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
      border-radius: 2px 2px 0 0;
      opacity: 0;
      transition: opacity 0.2s;
    }

    &.active .tab-indicator {
      opacity: 1;
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
  overflow: hidden;
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
    border: 1px solid rgba(160, 120, 220, 0.35);
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s;
    z-index: 10;

    &:hover {
      background: rgba(160, 120, 220, 0.15);
      border-color: rgba(160, 120, 220, 0.6);
    }

    .left-panel:hover & {
      opacity: 1;
    }
  }
}

.session-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .session-list-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
}

.right-panel {
  flex: 1;
  position: relative;
  border-radius: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230F121C'/%3E%3Cstop offset='50%25' stop-color='%23161A30'/%3E%3Cstop offset='100%25' stop-color='%23443782'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1' height='1' fill='url(%23g)'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
  transition: all 0.3s ease;
  overflow: hidden;
  border-left: 1px solid var(--border);

  &.right-panel-active {
    background: var(--surface);
  }
}

.collapse-icon {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-variant);
  border: 1px solid rgba(160, 120, 220, 0.35);
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s, border-color 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(160, 120, 220, 0.15);
    border-color: rgba(160, 120, 220, 0.6);
  }

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

.empty-bubbles-content {
  text-align: center;
  max-width: 360px;
}

.empty-bubbles-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);

  .iconfont {
    font-size: 30px;
    color: white;
  }
}

.empty-bubbles-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.empty-bubbles-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.empty-bubbles-tips {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;

  li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.form-area {
  flex: 1;
  overflow-y: auto;
  background: var(--surface);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-col {
  flex: 1;
  min-width: 0;
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

.option-select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 14px;
}

.btn-area {
  flex-shrink: 0;
  padding: 12px;
}

.generate-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);
  color: white;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &:not(:disabled) {
    &.active, &:hover {
      background: linear-gradient(90deg, rgb(175, 77, 255) 0%, rgb(240, 74, 160) 100%);
      box-shadow: 0 4px 20px rgba(157, 67, 234, 0.4);
      transform: translateY(-1px);
    }
  }

  .iconfont {
    font-size: 16px;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230F121C'/%3E%3Cstop offset='50%25' stop-color='%23161A30'/%3E%3Cstop offset='100%25' stop-color='%23443782'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1' height='1' fill='url(%23g)'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
}

.history-empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgb(157, 67, 234) 0%, rgb(221, 54, 130) 100%);

  .iconfont {
    font-size: 32px;
    color: white;
  }
}

.history-empty-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.history-empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.history-empty-link {
  color: rgb(157, 67, 234);
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}

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
  margin: 0 0 16px 0;
}

.modal-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
}

.modal-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-variant);
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: rgb(160, 120, 220);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
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

.fullscreen-preview {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.preview-download-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .iconfont {
    font-size: 18px;
  }
}

.preview-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .iconfont {
    font-size: 18px;
  }
}

.preview-image {
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 120px);
  object-fit: contain;
  cursor: zoom-out;
}
</style>