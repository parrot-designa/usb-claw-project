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
// 样式将在 Task 7 中添加
</style>