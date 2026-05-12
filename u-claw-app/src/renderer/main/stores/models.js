import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiRequest } from '@renderer/js/api.js';
import { useUserStore } from './user.js';

export const useModelsStore = defineStore('models', () => {
  const allModels = ref([]);
  const selectedModels = ref([]);
  const apiKey = ref('');

  const currentModel = computed(() =>
    selectedModels.value.find(item => item.isCurrent) || null
  );

  function setAllModels(models) {
    allModels.value = models;
  }

  function setSelectedModels(models) {
    const userStore = useUserStore();
    const userToken = userStore.userInfo?.token;
    const modelUrl = import.meta.env.VITE_OPENCLAW_MODEL_URL || ''; 

    const processedModels = models.map(model => {
      if (model.source === 'official') { 
        return {
            ...model,
            url: modelUrl,
            key: `sk-${userToken?.key}`|| ''
        }; 
      }
      return model;
    });

    selectedModels.value = processedModels;
    localStorage.setItem('uclaw_selected_models', JSON.stringify(processedModels));
  }

  function setApiKey(key) {
    apiKey.value = key;
  }

  return { allModels, selectedModels, currentModel, apiKey, setAllModels, setSelectedModels, setApiKey };
});

export async function fetchAllModels() {
  try {
    const res = await apiRequest('/api/models/all', { method: 'POST' });
    if (!res.success) {
      console.log('[models] 获取模型列表失败:', res.message);
      return;
    }

    console.log('[models] 获取到所有模型:', res.data);
    const store = useModelsStore();

    if (res.data?.length > 0) {
      const allModelsData = res.data.map(item => ({ label:item.model_name, value:item.model_name, source:'official' }));
      store.setAllModels(allModelsData);

      // 从 localStorage 同步已选模型
      const stored = localStorage.getItem('uclaw_selected_models');
      let selectedModels = stored ? JSON.parse(stored) : [];

      // 如果没有已选模型，初始化为第一个模型
      if (selectedModels.length === 0 && allModelsData.length > 0) {
        selectedModels = [{ label: allModelsData[0].label, value: allModelsData[0].value, source:'official', isCurrent: true }];
      }

      // 同步到 store（setSelectedModels 会自动写入 openclaw）
      if (selectedModels.length > 0) {
        store.setSelectedModels(selectedModels);
      }
    }
  } catch (e) {
    console.error('[models] fetchAllModels error:', e);
  }
}