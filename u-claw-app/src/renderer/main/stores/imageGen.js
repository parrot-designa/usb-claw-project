import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

// 图片会话缓存（按模型名索引），登录后预加载
export const sessionsCache = reactive({});

export async function preloadAllImageSessions() {
  try {
    const { apiRequest } = await import('@renderer/js/api.js');
    const res = await apiRequest('/api/models/image', { method: 'POST' });
    if (!res.success || !res.data?.length) return;

    for (const m of res.data) {
      const model = m.model_name;
      try {
        const result = await window.uclaw.ipcLoadImageSessions(model);
        if (result?.ok && result.data) {
          sessionsCache[model] = result.data;
        }
      } catch (e) {
        console.error('[imageGen] preload failed:', model, e);
      }
    }
    console.log('[imageGen] preloaded sessions for', res.data.length, 'models');
  } catch (e) {
    console.error('[imageGen] preloadAllImageSessions error:', e);
  }
}

export const useImageGenStore = defineStore('imageGen', () => {
  const revisedPrompt = ref('');

  function setRevisedPrompt(prompt) {
    revisedPrompt.value = prompt;
  }

  return {
    revisedPrompt,
    setRevisedPrompt,
  };
});
