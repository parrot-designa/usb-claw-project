<template>
  <div class="imagegen-view">
    <!-- Header with model selection -->
    <div class="imagegen-header">
      <div class="imagegen-model-selectors">
        <select v-model="selectedModel" class="imagegen-model-select">
          <option value="dall-e-3">DALL-E 3</option>
          <option value="dall-e-2">DALL-E 2</option>
          <option value="midjourney">Midjourney</option>
          <option value="stable-diffusion">Stable Diffusion</option>
        </select>
        <select v-model="imageSize" class="imagegen-size-select">
          <option value="1024x1024">1024x1024</option>
          <option value="1024x1792">1024x1792 (竖图)</option>
          <option value="1792x1024">1792x1024 (横图)</option>
        </select>
        <select v-model="imageQuality" class="imagegen-quality-select">
          <option value="standard">标准</option>
          <option value="hd">高清</option>
        </select>
      </div>
    </div>

    <!-- Chat messages container -->
    <div class="imagegen-chat-container" ref="chatContainer">
      <div v-if="messages.length === 0" class="imagegen-empty-state">
        <span class="imagegen-empty-icon">🎨</span>
        <p>输入描述，我来帮你生成图片</p>
      </div>

      <div
        v-for="(msg, index) in messages"
        :key="index"
        :class="['imagegen-message', msg.role === 'user' ? 'imagegen-user-message' : 'imagegen-ai-message']"
      >
        <div class="imagegen-message-avatar">
          <span v-if="msg.role === 'user'" class="imagegen-avatar-user">👤</span>
          <span v-else class="imagegen-avatar-ai">🤖</span>
        </div>
        <div class="imagegen-message-content">
          <!-- Text message or image -->
          <div v-if="msg.imageUrl" class="imagegen-message-image-container">
            <img :src="msg.imageUrl" :alt="msg.text" class="imagegen-message-image" @click="previewImage(msg.imageUrl)" />
            <button v-if="msg.text" @click="downloadImage(msg.imageUrl)" class="imagegen-download-btn">
              <span class="imagegen-download-icon">↓</span>
            </button>
          </div>
          <p v-if="msg.text" class="imagegen-message-text">{{ msg.text }}</p>

          <!-- Revised prompt display -->
          <div v-if="msg.revisedPrompt" class="imagegen-revised-prompt">
            <span class="imagegen-label">优化后的提示词：</span>
            <p>{{ msg.revisedPrompt }}</p>
          </div>

          <!-- Loading state -->
          <div v-if="msg.loading" class="imagegen-loading">
            <span class="iconfont icon-clawshuaxin"></span>
            <span>生成中...</span>
          </div>

          <!-- Error state -->
          <div v-if="msg.error" class="imagegen-error">
            <span class="iconfont icon-clawtishi"></span>
            <span>{{ msg.error }}</span>
          </div>

          <span class="imagegen-message-time">{{ msg.time }}</span>
        </div>
      </div>
    </div>

    <!-- Chat input area (always at bottom) -->
    <div class="imagegen-input-area">
      <div class="imagegen-input-wrapper">
        <textarea
          v-model="inputText"
          class="imagegen-chat-input"
          placeholder="描述你想要生成的图片..."
          rows="1"
          @keydown.enter.exact.prevent="sendMessage"
          @input="autoResize"
        ></textarea>
        <button
          @click="sendMessage"
          class="imagegen-send-btn"
          :disabled="!inputText.trim() || generating"
        >
          <span v-if="generating" class="iconfont icon-clawshuaxin"></span>
          <span v-else class="iconfont icon-clawfaxiaoxi"></span>
        </button>
      </div>
    </div>

    <!-- Image preview modal -->
    <div v-if="previewImageUrl" class="imagegen-preview-modal" @click="previewImageUrl = null">
      <div class="imagegen-preview-content" @click.stop>
        <img :src="previewImageUrl" alt="Preview" class="imagegen-preview-image" />
        <button @click="previewImageUrl = null" class="imagegen-preview-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, toRaw } from 'vue';
import { useToast } from '../composables/useToast';

const { showToast } = useToast();

const inputText = ref('');
const selectedModel = ref('dall-e-3');
const imageSize = ref('1024x1024');
const imageQuality = ref('standard');
const generating = ref(false);
const messages = ref([]);
const chatContainer = ref(null);
const previewImageUrl = ref(null);

const HISTORY_FILE = 'image-gen-history.json';

onMounted(async () => {
  await loadHistory();
});

function autoResize(e) {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

async function loadHistory() {
  try {
    const result = await window.uclaw.ipcLoadImageGenHistory();
    if (result?.ok && Array.isArray(result.messages)) {
      messages.value = result.messages;
      scrollToBottom();
    }
  } catch (e) {
    console.error('[ImageGen] Load history failed:', e);
  }
}

async function saveHistory() {
  try {
    // 使用 toRaw 去除 Vue 响应式代理，转换为普通对象
    const plainMessages = toRaw(messages.value);
    await window.uclaw.ipcSaveImageGenHistory(plainMessages);
  } catch (e) {
    console.error('[ImageGen] Save history failed:', e);
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || generating.value) return;

  inputText.value = '';
  const userMsg = {
    role: 'user',
    text,
    time: formatTime(),
  };
  messages.value.push(userMsg);
  scrollToBottom();

  generating.value = true;

  const aiMsg = {
    role: 'ai',
    text: '',
    imageUrl: '',
    revisedPrompt: '',
    loading: true,
    error: '',
    time: formatTime(),
  };
  messages.value.push(aiMsg);
  scrollToBottom();

  try {
    const result = await window.uclaw.generateImage({
      prompt: text,
      model: selectedModel.value,
      size: imageSize.value,
      quality: imageQuality.value,
    });

    aiMsg.loading = false;

    if (result?.error) {
      aiMsg.error = result.error;
      showToast(result.error, true);
    } else if (result?.url) {
      aiMsg.imageUrl = result.url;
      aiMsg.revisedPrompt = result.revisedPrompt || '';
      showToast('图片生成成功');
    }
  } catch (e) {
    aiMsg.loading = false;
    aiMsg.error = e.message || '生成失败';
    showToast('生成失败: ' + e.message, true);
  } finally {
    console.log("测试==>")
    generating.value = false;
    aiMsg.time = formatTime();
    await saveHistory();
    scrollToBottom();
  }
}

function previewImage(url) {
  previewImageUrl.value = url;
}

function downloadImage(url) {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-image-${Date.now()}.png`;
  link.click();
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.imagegen-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.imagegen-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.imagegen-model-selectors {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.imagegen-model-select,
.imagegen-size-select,
.imagegen-quality-select {
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--blue);
  }
}

.imagegen-chat-container {
  height: 320px;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;
}

.imagegen-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 0.5rem;

  .imagegen-empty-icon {
    font-size: 3rem;
  }

  p {
    font-size: 0.875rem;
  }
}

.imagegen-message {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
}

.imagegen-user-message {
  align-self: flex-end;
  flex-direction: row-reverse;

  .imagegen-message-content {
    background: var(--secondary);
    color: white;
    border-radius: 1rem 1rem 0.25rem 1rem;
  }

  .imagegen-message-time {
    color: rgba(255, 255, 255, 0.6);
  }
}

.imagegen-ai-message {
  align-self: flex-start;

  .imagegen-message-content {
    background: var(--surface);
    color: var(--text-primary);
    border-radius: 1rem 1rem 1rem 0.25rem;
    border: 1px solid var(--border);
  }
}

.imagegen-message-avatar {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.imagegen-message-content {
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.imagegen-message-text {
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.imagegen-message-image-container {
  position: relative;
  display: inline-block;
}

.imagegen-message-image {
  max-width: 280px;
  max-height: 200px;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
}

.imagegen-download-btn {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}

.imagegen-download-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.imagegen-revised-prompt {
  background: var(--surface-variant);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;

  .imagegen-label {
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
    display: block;
  }

  p {
    color: var(--text-primary);
    line-height: 1.4;
  }
}

.imagegen-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;

  .iconfont {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.imagegen-error {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--error);
  font-size: 0.8125rem;

  .iconfont {
    font-size: 0.875rem;
  }
}

.imagegen-message-time {
  font-size: 0.6875rem;
  color: var(--text-secondary);
  align-self: flex-end;
}

.imagegen-input-area {
  padding: 1rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.imagegen-input-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.imagegen-chat-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 1.5rem;
  border: 1px solid var(--border);
  background: var(--surface-variant);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 0.9375rem;
  resize: none;
  min-height: 3.5rem;
  max-height: 120px;
  overflow-y: auto;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: var(--blue);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
}

.imagegen-send-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: none;
  background: var(--secondary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .iconfont {
    font-size: 1.125rem;
  }
}

.imagegen-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.imagegen-preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.imagegen-preview-image {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 0.5rem;
}

.imagegen-preview-close {
  position: absolute;
  top: -2rem;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}
</style>
