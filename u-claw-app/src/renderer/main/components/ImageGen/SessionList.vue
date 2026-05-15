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
        <span class="session-delete iconfont icon-clawguanbi" @click.stop="deleteSession(session.id)"></span>
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

const emit = defineEmits(['select', 'create', 'delete']);

const expanded = ref(true);

function toggleExpand() {
  expanded.value = !expanded.value;
}

function selectSession(id) {
  emit('select', id);
}

async function deleteSession(id) {
  const result = await window.uclaw.ipcShowConfirmDialog('确认删除', '确定要删除该会话吗？');
  if (!result?.confirmed) return;
  emit('delete', id);
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
</script>

<style scoped lang="scss">
.session-list {
  font-size: 14px;

  .session-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
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
  }

  .session-empty {
    text-align: center;
    color: inherit;
    font-size: 12px;
  }

  .session-item {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px 8px 12px; 
    cursor: pointer;
    border-radius: 4px;
    color: inherit;
    font-size: 13px;
    background: linear-gradient(90deg, rgba(160, 120, 220, 0.3) 0%, rgba(160, 120, 220, 0.05) 100%);

    &.active {
      background: linear-gradient(90deg, rgba(160, 120, 220, 0.6) 0%, rgba(160, 120, 220, 0.15) 100%);

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: rgb(160, 120, 220);
        border-radius: 0 2px 2px 0;
      }
    }

    &:hover:not(.active) {
      background: linear-gradient(90deg, rgba(160, 120, 220, 0.4) 0%, rgba(160, 120, 220, 0.1) 100%);
    }
  }

  .session-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 1;
  }

  .session-delete {
    font-size: 12px;
    color: inherit; 
    margin-left: 8px;
    flex-shrink: 0;
    transition: opacity 0.2s;
    padding: 4px;
    border-radius: 4px;
    position: absolute;
    right: 8px;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .session-item:hover & {
      opacity: 0.7;
    }

    .session-item.active & {
      opacity: 0.7;
    }
  }
}
</style>