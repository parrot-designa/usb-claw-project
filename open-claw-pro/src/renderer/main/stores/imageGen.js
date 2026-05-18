import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

// 图片会话缓存，登录后预加载
export const sessionsCache = reactive({});

export async function preloadAllImageSessions() {
  try {
    const result = await window.uclaw.ipcLoadImageSessions();
    if (result?.ok && result.data) {
      sessionsCache._all = result.data;
    }
    console.log('[imageGen] preloaded sessions');
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
