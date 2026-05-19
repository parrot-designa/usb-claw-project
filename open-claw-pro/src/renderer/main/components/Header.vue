<template>
  <header class="header-header">
    <div class="header-left"> 
    </div>
    <div class="header-right">
      <div v-if="!activationStore.activated" class="header-badge header-badge-not-activated">
        <span class="iconfont icon-clawweijihuo"></span>
        <span>设备未激活</span>
      </div>
      <div v-else class="header-badge header-badge-activated">
        <span class="iconfont icon-clawyijihuo"></span>
        <span>设备已激活</span>
      </div>
      <div class="header-status-indicator">
        <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
        <span>Gateway已连接</span>
      </div>
      <div v-if="isDev" class="header-theme-switcher-wrapper">
        <ThemeSwitcher />
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useActivationStore } from '../stores/activation';
import ThemeSwitcher from './ThemeSwitcher.vue';

const route = useRoute();
const activationStore = useActivationStore();
const isDev = computed(() => import.meta.env.VITE_IS_DEV === 'true');

const pageTitle = computed(() => {
  const titles = {
    '/home': '首页',
    '/model': '模型配置',
    '/skill': '技能管理',
    '/chat': '聊天工具',
    '/image-gen': 'AI图片生成',
    '/video-gen': 'AI视频生成',
    '/contact': '联系客服',
    '/recharge': '官方模型充值',
    '/settings': '设置',
  };
  return titles[route.path] || '控制台';
});
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.header-header {
  height: 40px;
  @extend %flex-between;
  padding: 0 16px;
  background: var(--background);
  backdrop-filter: blur(12px);
  position: fixed;
  top: 38px;
  left: 256px;
  right: 0;
  z-index: 40;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-badge {
  @extend %badge-base;
}

.header-badge-not-activated {
  background: var(--error-container);
  border: 1px solid var(--error);
  color: var(--error);
}

.header-badge-activated {
  background: var(--secondary-container);
  border: 1px solid var(--secondary);
  color: var(--secondary);
}

.header-page-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 400;
  font-size: 14px;
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;

  .iconfont{
    font-size: 11px;
    line-height: 1;
  }
}

.header-status-indicator {
  @extend %badge-base;
  background: var(--secondary-container);
  border: 1px solid var(--secondary);
  color: var(--secondary);
}

.header-theme-switcher-wrapper {
  margin-left: 8px;
}
</style>
