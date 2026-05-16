import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiRequest } from '@renderer/js/api.js';

export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null);

  function setUserInfo(info) {
    userInfo.value = info;
  }

  return { userInfo, setUserInfo };
});

export async function fetchUserInfo() {
  try {
    const res = await apiRequest('/api/user/self', { method: 'POST' });
    if (!res.success) {
      console.log('[user] 获取用户信息失败:', res.message);
      return;
    }

    const { tokens,used_balance,remain_balance,total_balance } = res.data || {};

    console.log('[user] 获取到用户信息:', res.data);
    if (res.data) {

      const userInfo = {
        id: res.data.id,
        token: tokens?.[0],
        used_balance: used_balance,
        remain_balance: remain_balance,
        total_balance: total_balance,
        used_percent: total_balance > 0 ? used_balance / total_balance : 0
      }
      const store = useUserStore();
      store.setUserInfo(userInfo);
    }
  } catch (e) {
    console.error('[user] fetchUserInfo error:', e);
  }
}