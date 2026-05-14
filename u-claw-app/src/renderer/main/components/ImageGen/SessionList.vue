<template>
  <div class="session-list">
    <div class="session-header" @click="toggleExpand">
      <span class="iconfont icon-clawa-huihua2"></span>
      <span class="session-title">会话列表</span>
      <span class="header-right">
        <span class="header-hint">点击生成图片，即可会话</span>
        <span class="iconfont arrow" :class="{ expanded }"></span>
      </span>
    </div>
    <div v-show="expanded" class="session-items">
      <div v-if="sessions.length === 0" class="session-empty">
        暂无会话
      </div>
      <div
        v-for="session in sessions"
        :key="session.id"
        :class="['session-item', { active: session.id === currentSessionId }]"
        @click="selectSession(session.id)"
      >
        <span class="session-text">{{ getSessionPreview(session) }}</span>
        <span class="session-status">{{ getSessionStatus(session) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  sessions: {
    type: Array,
    default: () => []
  },
  currentSessionId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['select', 'create']);

const expanded = ref(true);

function toggleExpand() {
  expanded.value = !expanded.value;
}

function selectSession(id) {
  emit('select', id);
}

function getSessionPreview(session) {
  const messages = session.messages || [];
  if (messages.length === 0) {
    return '新会话';
  }
  const lastMessage = messages[messages.length - 1];
  const text = lastMessage.text || '';
  if (text.length <= 20) {
    return text || '新会话';
  }
  return text.substring(0, 20) + '...';
}

function getSessionStatus(session) {
  const messages = session.messages || [];
  if (messages.length === 0) {
    return '新建';
  }
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.loading) {
    return '生成中';
  }
  if (lastMessage.imageUrl || lastMessage.error) {
    return '已完成';
  }
  return '新建';
}
</script>

<style scoped lang="scss">
.session-list {
  font-size: 14px;

  .session-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 12px;
    cursor: pointer;
    user-select: none;
    background: linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%);
    color: inherit;

    .icon-clawa-huihua2 {
      font-size: 12px;
      color: #999;
    }
  }

  .session-title {
    font-weight: 500;
    font-size: 13px;
  }

  .header-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-hint {
    font-size: 10px;
    opacity: 0.6;
  }

  .arrow {
    font-size: 12px;
    transition: transform 0.2s;

    &.expanded {
      transform: rotate(180deg);
    }

    &::before {
      content: "\e649";
    }
  }

  .session-items {
    padding: 8px 0;
  }

  .session-empty {
    padding: 12px;
    text-align: center;
    color: inherit;
    font-size: 12px;
  }

  .session-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    margin-bottom: 4px;
    color: inherit;

    &.active {
      background: #1a1a1a;
    }
  }

  .session-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .session-status {
    font-size: 11px;
    color: inherit;
    margin-left: 8px;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .session-item.active .session-status {
    opacity: 1;
  }
}
</style>