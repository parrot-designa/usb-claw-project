<template>
  <aside class="sidebar-sidebar">
    <nav class="sidebar-nav-list">
      <router-link
        to="/home"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/home' }" 
      >
        <span class="iconfont icon-clawshouye"></span>
        <span>首页</span>
      </router-link>
      <router-link
        to="/model"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/model' }" 
      >
        <span class="iconfont icon-clawmoxingpeizhi"></span>
        <span>模型配置</span>
      </router-link>
      <router-link
        to="/recharge"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/recharge' }" 
      >
        <span class="iconfont icon-clawchongzhizhongxin"></span>
        <span>官方模型充值</span>
      </router-link>
      <router-link
        to="/skill"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/skill' }" 
      >
        <span class="iconfont icon-clawjinengguanli"></span>
        <span>技能管理</span>
      </router-link>
      <router-link
        to="/chat"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/chat' }"
      >
        <span class="iconfont icon-clawliaotiangongju-qun"></span>
        <span>聊天工具</span>
      </router-link>
      <router-link
        to="/image-gen"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/image-gen' }"
      >
        <span class="iconfont icon-clawtupianshengcheng"></span>
        <span>AI图片工具</span>
      </router-link>
      <router-link
        to="/video-gen"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/video-gen' }"
      >
        <span class="iconfont icon-clawicon_shipinshengcheng"></span>
        <span>AI视频工具</span>
      </router-link>
      <router-link
        to="/contact"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/contact' }" 
      >
        <span class="iconfont icon-clawlianxikefu"></span>
        <span>联系客服</span>
      </router-link>
      <router-link
        to="/env-check"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/env-check' }" 
      >
        <span class="iconfont icon-clawhuanjingjiancha"></span>
        <span>环境检查</span>
      </router-link>
      <router-link
        to="/settings"
        class="sidebar-nav-item"
        :class="{ active: $route.path === '/settings' }" 
      >
        <span class="iconfont icon-clawshezhi"></span>
        <span>设置</span>
      </router-link>
    </nav>

    <div class="sidebar-gateway-controls">
      <TechButton v-if="loading" variant="secondary" loading disabled>
        启动中
      </TechButton>
      <TechButton v-else-if="!gatewayStore.running" variant="primary" @click="handleStart">
        <template #icon>
          <span class="iconfont icon-clawopen"></span>
        </template>
        开启Gateway
      </TechButton>
      <TechButton v-else variant="danger" @click="stopGatewayHook">
        <template #icon>
          <span class="iconfont icon-clawguanbi"></span>
        </template>
        关闭Gateway
      </TechButton>
    </div>
  </aside>
</template>

<script setup>
import { useGatewayStore } from '../stores/gateway';
import { useGateway } from '../composables/useGateway';
import TechButton from './TechButton.vue';
import { useToast } from '../composables/useToast'

const { showToast } = useToast();

const gatewayStore = useGatewayStore();
const { loading, startGatewayHook, stopGatewayHook } = useGateway();  

async function handleStart() { 
  window.showLoadingOverlayVue?.(); 
  try {
    await startGatewayHook();
    showToast('小龙虾启动成功');
  } catch (e) {
    showToast('启动失败: ' + e.message, true);
  }
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.sidebar-sidebar {
  position: fixed;
  left: 0;
  top: 38px;
  height: calc(100% - 38px);
  width: 256px;
  background: var(--bg2);
  @extend %flex-column;
  z-index: 50;
  border-right:1px solid var(--border);
}

.sidebar-nav-list {
  flex: 1;
  padding: 16px 12px;
  @extend %flex-column;
  gap: 2px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 16px;
  border-radius: 8px;
  color: var(--text2);
  text-decoration: none;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid transparent;

  &.active{
    background: var(--card);
    color: var(--blue);

    &:before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: var(--blue);
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px rgba(79, 140, 255, .15);
    } 
  } 

  &:hover {
    background: var(--card);
    color:white;
  }

  &.enter-left::before {
    background: linear-gradient(90deg, rgba(0, 212, 255, 0.15), transparent);
    opacity: 1;
  }

  &.enter-right::before {
    background: linear-gradient(-90deg, rgba(0, 212, 255, 0.15), transparent);
    opacity: 1;
  }

  &.enter-top::before {
    background: linear-gradient(180deg, rgba(0, 212, 255, 0.15), transparent);
    opacity: 1;
  }

  &.enter-bottom::before {
    background: linear-gradient(0deg, rgba(0, 212, 255, 0.15), transparent);
    opacity: 1;
  }
 
  .iconfont {
    font-size: 20px;
  }
}

.sidebar-gateway-controls {
  padding: 12px;
  @extend %flex-column;
  gap: 8px;
}
</style>
