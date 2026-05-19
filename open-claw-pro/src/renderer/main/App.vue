<template>
  <div v-if="isActivatePage" class="activate-layout">
    <MenuBar />
    <div class="activate-page-content">
      <router-view />
    </div>
  </div>
  <div v-else class="main-app-layout">
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
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import MenuBar from './components/MenuBar.vue';
import Toast from './components/Toast.vue';
import LoadingOverlay from './components/LoadingOverlay.vue';
import { fetchAllModels, useModelsStore } from './stores/models';
import { fetchUserInfo, useUserStore } from './stores/user';
import { fetchAllSkills } from './stores/skills';
import { preloadAllImageSessions } from './stores/imageGen';
import { useGatewayStore } from './stores/gateway';
import { useWechatStore } from './stores/wechat';
import { useEnvCheck } from './composables/useEnvCheck';
import './assets/fonts/fonts-iconfont.scss';
import './assets/styles/main.scss';

const route = useRoute();
const isActivatePage = computed(() => route.path === '/activate');

const modelsStore = useModelsStore();
const userStore = useUserStore();
const gatewayStore = useGatewayStore();
const wechatStore = useWechatStore();
const { checkItems, runAllChecks } = useEnvCheck();

function doInit() {
  fetchUserInfo();
  fetchAllModels();
  fetchAllSkills();
  preloadAllImageSessions();
  runAllChecks();
  gatewayStore.setEnvCheckResults(JSON.parse(JSON.stringify(checkItems.value)));
}

function handleWechatStatus(status) {
  wechatStore.setStatus(status === 'refreshing' ? 'scanning' : status);
  if (status === 'connected') {
    wechatStore.checkInstalled();
  }
}

function onWechatLog(msg) {
  wechatStore.addLog(msg);
}

onMounted(async () => {
  window.addEventListener('main-init', doInit);
  window.uclaw.ipcOnWeChatStatus(handleWechatStatus);
  window.uclaw.ipcOnWechatLog(onWechatLog);

  try {
    const status = await window.uclaw.ipcGetWeChatStatus();
    handleWechatStatus(status);
  } catch {}
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

.activate-layout {
  min-height: 100vh;
  background: var(--background);
  color: var(--text-primary);
  padding-top: 38px;
}

.activate-page-content {
  height: calc(100vh - 38px);
  overflow: hidden;
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
  padding-top: 42px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--background);
}
</style>