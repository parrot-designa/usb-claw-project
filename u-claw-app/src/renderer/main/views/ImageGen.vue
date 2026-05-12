<template>
  <div class="imagegen-view">
    <div class="page-title">AI图片生成</div>

    <div class="imagegen-card">
      <div class="imagegen-prompt-area">
        <textarea
          v-model="prompt"
          class="imagegen-prompt-input"
          placeholder="描述你想要生成的图片..."
          rows="4"
        ></textarea>
        <div class="imagegen-prompt-actions">
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
        <button @click="generateImage" class="imagegen-btn-generate" :disabled="generating || !prompt.trim()">
          <span v-if="generating" class="iconfont icon-clawloading"></span>
          <span v-else class="iconfont icon-clawimage"></span>
          {{ generating ? '生成中...' : '生成图片' }}
        </button>
      </div>
    </div>

    <div v-if="generatedImageUrl" class="imagegen-result-card">
      <div class="imagegen-result-header">
        <span>生成结果</span>
        <button @click="downloadImage" class="imagegen-btn-download">
          <span class="iconfont icon-clawdownload"></span>
          下载图片
        </button>
      </div>
      <div class="imagegen-result-image-container">
        <img :src="generatedImageUrl" alt="生成的图片" class="imagegen-result-image" />
      </div>
      <div v-if="imageGenStore.revisedPrompt" class="imagegen-revised-prompt">
        <span class="imagegen-label">优化后的提示词：</span>
        <p>{{ imageGenStore.revisedPrompt }}</p>
      </div>
    </div>

    <div v-if="error" class="imagegen-error-card">
      <span class="iconfont icon-clawerror"></span>
      <span>{{ error }}</span>
    </div>

    <div class="imagegen-tip-card">
      <span>💡</span>
      <p>详细描述场景、风格、颜色、光线等因素可以获得更好的生成效果。</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useImageGenStore } from '../stores/imageGen';
import { useToast } from '../composables/useToast';

const { showToast } = useToast();
const imageGenStore = useImageGenStore();

const prompt = ref('');
const selectedModel = ref('dall-e-3');
const imageSize = ref('1024x1024');
const imageQuality = ref('standard');
const generating = ref(false);
const generatedImageUrl = ref('');
const error = ref('');

async function generateImage() {
  if (!prompt.value.trim()) return;

  generating.value = true;
  error.value = '';
  generatedImageUrl.value = '';

  try {
    const result = await window.uclaw.generateImage({
      prompt: prompt.value,
      model: selectedModel.value,
      size: imageSize.value,
      quality: imageQuality.value,
    });

    if (result?.error) {
      error.value = result.error;
      showToast(result.error, true);
    } else if (result?.url) {
      generatedImageUrl.value = result.url;
      imageGenStore.setRevisedPrompt(result.revisedPrompt || '');
      showToast('图片生成成功');
    }
  } catch (e) {
    error.value = e.message || '生成失败';
    showToast('生成失败: ' + e.message, true);
  } finally {
    generating.value = false;
  }
}

function downloadImage() {
  if (!generatedImageUrl.value) return;

  const link = document.createElement('a');
  link.href = generatedImageUrl.value;
  link.download = `ai-image-${Date.now()}.png`;
  link.click();
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.imagegen-view {
  padding: 1rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.imagegen-card {
  @extend %card-base;
  padding: 1.25rem;
  max-width: 42rem;
}

.imagegen-prompt-area {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.imagegen-prompt-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: var(--blue);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
}

.imagegen-prompt-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.imagegen-model-select,
.imagegen-size-select,
.imagegen-quality-select {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--blue);
  }
}

.imagegen-btn-generate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .iconfont {
    font-size: 1rem;
  }
}

.imagegen-result-card {
  @extend %card-base;
  padding: 1.25rem;
  max-width: 42rem;
  margin-top: 1rem;
}

.imagegen-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.imagegen-btn-download {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }

  .iconfont {
    font-size: 0.875rem;
  }
}

.imagegen-result-image-container {
  background: var(--surface);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.imagegen-result-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 0.375rem;
}

.imagegen-revised-prompt {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--surface);
  border-radius: 0.5rem;
  font-size: 0.75rem;

  .imagegen-label {
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
    display: block;
  }

  p {
    color: var(--text-primary);
    line-height: 1.5;
  }
}

.imagegen-error-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--error-container);
  border: 1px solid var(--error);
  border-radius: 0.5rem;
  color: var(--error);
  font-size: 0.875rem;
  margin-top: 1rem;
  max-width: 42rem;

  .iconfont {
    font-size: 1rem;
  }
}

.imagegen-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.75rem;
  max-width: 42rem;
  @extend %card-base;

  .iconfont {
    color: var(--accent);
    font-size: 1rem;
    flex-shrink: 0;
  }

  p {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 2;
  }
}
</style>
