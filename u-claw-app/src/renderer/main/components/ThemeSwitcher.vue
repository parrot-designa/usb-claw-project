<template>
  <div class="theme-switcher-theme-switcher">
    <button @click="togglePanel" class="theme-switcher-btn" title="切换主题风格" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <span class="iconfont icon-clawshezhi"></span>
    </button>

    <div v-if="showPanel" class="theme-switcher-panel">
      <div class="theme-switcher-panel-title">界面主题</div>
      <div class="theme-switcher-options">
        <button
          v-for="theme in themes"
          :key="theme.id"
          @click="selectTheme(theme.id)"
          :class="['theme-switcher-option', { active: themeStore.scifiTheme === theme.id }]"
        >
          <div class="theme-switcher-preview" :style="{ background: theme.bg, borderColor: theme.accent }">
            <div class="theme-switcher-preview-bar" :style="{ background: theme.accent }"></div>
            <div class="theme-switcher-preview-bar short" :style="{ background: theme.primary }"></div>
          </div>
          <span class="theme-switcher-name">{{ theme.name }}</span>
        </button>
      </div>
      <button @click="clearTheme" class="theme-switcher-clear-btn">清除主题</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useThemeStore } from '../stores/theme';

const themeStore = useThemeStore();
const showPanel = ref(false);

const themes = [
  { id: 'fintech', name: '深色金融科技', bg: '#0B0F1A', primary: '#3B82F6', accent: '#00D1FF' },
  { id: 'cyberpunk', name: '赛博朋克 Neon', bg: '#0a0a0f', primary: '#bf00ff', accent: '#00ffff' },
  { id: 'lcars', name: '星际指令台 LCARS', bg: '#000022', primary: '#0055aa', accent: '#ff9900' },
  { id: 'space', name: '极简太空站', bg: '#050810', primary: '#4fc3f7', accent: '#81d4fa' },
  { id: 'minimal', name: '极简商业', bg: '#000000', primary: '#22C55E', accent: '#22C55E' },
];

function togglePanel() {
  showPanel.value = !showPanel.value;
}

function selectTheme(id) {
  themeStore.setScifiTheme(id);
  showPanel.value = false;
}

function clearTheme() {
  themeStore.setScifiTheme('none');
  showPanel.value = false;
}

function handleMouseEnter(event) {
  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (x < rect.width * 0.3) {
    btn.classList.add('enter-left');
  } else if (x > rect.width * 0.7) {
    btn.classList.add('enter-right');
  } else if (y < rect.height * 0.3) {
    btn.classList.add('enter-top');
  } else {
    btn.classList.add('enter-bottom');
  }
}

function handleMouseLeave(event) {
  const btn = event.currentTarget;
  btn.classList.remove('enter-left', 'enter-right', 'enter-top', 'enter-bottom');
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.theme-switcher-theme-switcher {
  position: relative;
}

.theme-switcher-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9999px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: var(--surface-high);
    color: var(--accent);
    border-color: rgba(0, 212, 255, 0.4);
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
    font-size: 16px;
  }
}

.theme-switcher-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.theme-switcher-panel-title {
  font-size: 12px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.theme-switcher-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-switcher-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--surface-low);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: var(--surface-high);
    border-color: var(--accent);
  }

  &:hover::before {
    background: linear-gradient(90deg, rgba(0, 212, 255, 0.08), transparent);
    opacity: 1;
  }

  &.active {
    border-color: var(--accent);
    background: var(--primary-container);
  }
}

.theme-switcher-preview {
  width: 48px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 4px;
  gap: 3px;
}

.theme-switcher-preview-bar {
  height: 4px;
  border-radius: 2px;

  &.short {
    width: 60%;
  }
}

.theme-switcher-name {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-primary);
}

.theme-switcher-clear-btn {
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: var(--surface-high);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:hover::before {
    background: linear-gradient(90deg, rgba(0, 212, 255, 0.08), transparent);
    opacity: 1;
  }
}
</style>
