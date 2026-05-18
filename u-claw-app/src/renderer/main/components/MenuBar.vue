<template>
  <div class="menu-bar">
    <div class="menu-bar-center">
      <img src="@assets/logo.png"/>
      <span class="menu-bar-title">{{ title }}</span>
    </div>
    <div class="menu-bar-right">
      <button class="win-btn win-btn-minimize" @click="onMinimize" title="最小化">
        <span class="iconfont icon-clawzuixiaohua"></span>
      </button>
      <button class="win-btn win-btn-close" @click="onClose" title="关闭">
        <span class="iconfont icon-clawguanbi1"></span>
      </button> 
    </div>
  </div>
</template>

<script setup>
const menuItems = [
  // { label: '文件', onClick: () => console.log('文件菜单') },
  // { label: '编辑', onClick: () => console.log('编辑菜单') },
  // { label: '视图', onClick: () => console.log('视图菜单') },
  // { label: '帮助', onClick: () => console.log('帮助菜单') },
];

function onMinimize() {
  window.uclaw?.ipcMinimize();
}

function onClose() {
  window.uclaw?.ipcClose();
}

defineProps({
  title: {
    type: String,
    default: 'OpenClawPro U盘便携版 v1.8.1'
  }
});
</script>

<style lang="scss" scoped>
.menu-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 38px;
  background: var(--background); 
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  user-select: none;
  z-index: 100;
  border-bottom: 1px solid #2A3040;

  &-left,
  &-right {
    flex: 1;
    display: flex;
    align-items: center;
  }

  &-right {
    justify-content: flex-end;
    gap: 4px;
  }

  .win-btn {
    -webkit-app-region: no-drag;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-secondary, #94a3b8);
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, #fff);
    }
  }

  .win-btn-close:hover {
    background: #e81123;
    color: #fff;
  }

  &-center {
    flex: 0 0 auto;
    display: flex;

    img{
      width:20px;
      height:20px;
      margin-right: 8px;
    }
  }

  &-placeholder {
    font-size: 13px;
    color: var(--text-secondary, #888);
    cursor: default;
  }

  .menu-item {
    font-size: 13px;
    color: var(--text-primary, #fff);
    padding: 4px 12px;
    margin-right: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: var(--hover-bg, rgba(255, 255, 255, 0.1));
    }
  }

  &-title {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-primary, #fff);
  }
}
</style>
