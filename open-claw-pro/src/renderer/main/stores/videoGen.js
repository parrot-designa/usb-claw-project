import { defineStore } from 'pinia';
import { reactive } from 'vue';

// 视频会话缓存，登录后预加载
export const sessionsCache = reactive({});

export async function preloadAllVideoSessions() {
  try {
    const result = await window.uclaw.ipcLoadVideoSessions();
    if (result?.ok && result.data) {
      sessionsCache._all = result.data;
    }
    console.log('[videoGen] preloaded sessions');
  } catch (e) {
    console.error('[videoGen] preloadAllVideoSessions error:', e);
  }
}

export const useVideoGenStore = defineStore('videoGen', () => {
  return {};
});
