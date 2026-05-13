<template>
  <div class="main-app-layout">
    <Sidebar />
    <MenuBar />
    <div class="main-app-main-wrapper">
      <Header />
      <div class="main-app-page-content">
        <router-view />
      </div>
    </div>
    <Toast />
    <LoadingOverlay />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import MenuBar from './components/MenuBar.vue';
import Toast from './components/Toast.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import { fetchAllModels, useModelsStore } from './stores/models';
import { fetchUserInfo, useUserStore } from './stores/user';
import { fetchAllSkills } from './stores/skills';
import { useGatewayStore } from './stores/gateway';
import { useEnvCheck } from './composables/useEnvCheck';
import './assets/fonts/fonts-iconfont.scss';
import './assets/styles/main.scss';

const modelsStore = useModelsStore();
const userStore = useUserStore();
const gatewayStore = useGatewayStore();
const { checkItems, runAllChecks } = useEnvCheck();

function doInit() {
  fetchUserInfo();
  fetchAllModels();
  fetchAllSkills();
  runAllChecks();
  gatewayStore.setEnvCheckResults(JSON.parse(JSON.stringify(checkItems.value)));
}

onMounted(() => {
  window.addEventListener('main-init', doInit);
});

onUnmounted(() => {
  window.removeEventListener('main-init', doInit);
}); 
// 监听 已选列表 变化，写入 openclaw 配置
watch(() => modelsStore.selectedModels,(models) => { 
  console.log("model变化===>",models);
  window.uclaw?.ipcWriteOpenClawConfig({ models: JSON.parse(JSON.stringify(models)) }, "model")
} , { immediate: true, deep: true });
 
</script>

<style lang="scss">
@use '@renderer/public/assets/styles/mixins';

.main-app-layout {
  @extend %flex-row;
  min-height: 100vh;
  background: var(--background);
  color: var(--text-primary);
}

.main-app-main-wrapper {
  flex: 1;
  margin-left: 256px;
  margin-top: 38px;
  display: flex;
  flex-direction: column;
  background: var(--background);
}

.main-app-page-content {
  flex: 1; 
  padding-top: 72px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--background);
}
</style>