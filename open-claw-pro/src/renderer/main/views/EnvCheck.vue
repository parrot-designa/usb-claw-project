<template>
  <div class="env-check-env-check-view">
    <div class="env-check-page-header"> 
      <button class="env-check-btn-check" @click="handleRecheck" :disabled="isChecking">
        <span class="iconfont icon-clawjianchagengxin" :class="{ 'env-check-spinning': isChecking }"></span>
        <span>{{ isChecking ? '检测中...' : '重新检测' }}</span>
      </button>
    </div>

    <div class="env-check-check-grid">
      <div
        v-for="item in checkItems"
        :key="item.id"
        class="env-check-check-card"
        :class="[`env-check-status-${item.status}`]"
      >
        <div class="env-check-card-header">
          <span class="iconfont env-check-card-icon" :class="item.icon"></span>
          <span class="env-check-card-title">{{ item.title }}</span>
        </div>
        <div class="env-check-card-status">
          <span class="env-check-status-badge" :class="'env-check-' + item.status">
            <span class="env-check-status-dot"></span>
            <span class="env-check-status-text">{{ item.statusText }}</span>
          </span>
        </div>
        <div class="env-check-card-detail" v-if="item.detail">{{ item.detail }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useGatewayStore } from '../stores/gateway';
import { useEnvCheck } from '../composables/useEnvCheck';

const gatewayStore = useGatewayStore();
const { checkItems, runAllChecks } = useEnvCheck();

console.log("checkItems==>",checkItems);

const isChecking = computed(() => checkItems.value.some(item => item.status === 'checking'));

// 从全局缓存读取初始状态
if (gatewayStore.envCheckResults) {
  checkItems.value = JSON.parse(JSON.stringify(gatewayStore.envCheckResults));
}

async function handleRecheck() {
  runAllChecks();
  gatewayStore.setEnvCheckResults(JSON.parse(JSON.stringify(checkItems.value)));
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.env-check-env-check-view {
  padding:16px;

  .env-check-page-header {
    @extend %flex-between;
    margin-bottom: 24px;
  }

  .env-check-page-title {
    font-size: 24px;
    font-weight: 400;
    font-family: 'Manrope', sans-serif;
    color: var(--text-primary);
  }

  .env-check-btn-check {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--bg-secondary);
      border-color: var(--accent);
      color: var(--accent);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .env-check-spinning {
    animation: env-check-spin 1s linear infinite;
  }

  @keyframes env-check-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .env-check-check-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  .env-check-check-card { 
    @extend %card-base;
    padding: 20px;
    transition: all 0.2s;
 
    &.env-check-status-pass { 
    }

    &.env-check-status-fail {
      border-color: var(--error);
    }

    &.env-check-status-warn {
      border-color: var(--accent);
    }

    .env-check-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .env-check-card-icon {
      font-size: 24px;
      color: var(--primary);
    }

    .env-check-card-title {
      font-size: 16px;
      font-weight: 400;
      color: var(--text-primary);
      font-family: 'Manrope', sans-serif;
    }

    .env-check-card-status {
      margin-bottom: 8px;
    }

    .env-check-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.env-check-checking {
        background: var(--surface-high);
        color: var(--text-secondary);
      }

      &.env-check-pass {
        background: var(--secondary-container);
        color: var(--secondary);
      }

      &.env-check-fail {
        background: var(--error-container);
        color: var(--error);
      }

      &.env-check-warn {
        background: rgba(255, 107, 53, 0.15);
        color: var(--accent);
      }

      .env-check-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      &.env-check-checking .env-check-status-dot {
        animation: env-check-pulse 1s infinite;
      }
    }

    @keyframes env-check-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .env-check-card-detail {
      font-size: 12px;
      color: var(--text-secondary);
      font-family: monospace;
      word-break: break-all;
    }
  }
}
</style>
