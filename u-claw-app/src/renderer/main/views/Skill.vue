<template>
  <div class="skill-skill-view">
    <!-- Fixed header: title + search + tabs -->
    <div class="skill-header">
      <div class="skill-header-top">
        <div class="skill-stats">
          <span class="skill-stats-text">共 {{ totalSkills }} 技能</span>
          <span class="skill-stats-sep">，</span>
          <span class="skill-stats-text">已启用 {{ enabledSkills }}个技能</span>
        </div>
        <TechButton variant="primary" size="small"  @click="openSkillStore" title="技能商店">
          <template #icon>
            <span class="iconfont icon-clawwaibutiaozhuanlianjie"></span>
          </template>
          技能商店
        </TechButton>
      </div>
      <div class="skill-search-wrapper">
        <span class="skill-search-icon iconfont icon-clawsousuo"></span>
        <input
          type="text"
          v-model="searchQuery"
          @input="searchQuery = $event.target.value"
          placeholder="搜索技能..."
          class="skill-search-input"
        />
      </div>
    </div>

    <!-- Scrollable skill list -->
    <div class="skill-scroll">
      <div v-if="filteredSkills.length > 0" class="skill-grid">
        <div
          v-for="skill in filteredSkills"
          :key="skill.name"
          class="skill-card"
        >
          <div class="skill-info">
            <div class="skill-icon">{{ skill.emoji || '✨' }}</div>
            <div class="skill-details">
              <div class="skill-name-row">
                <span class="skill-name">{{ skill.cnName || skill.name }}</span>
              </div>
              <p class="skill-desc">{{ skill.description || '' }}</p>
            </div>
          </div>
          <label class="skill-toggle">
            <input type="checkbox" :checked="skill.enabled" @change="toggleSkill(skill.name, $event.target.checked)" />
            <div class="skill-toggle-track"></div>
          </label>
        </div>
      </div>

      <div v-else class="skill-no-skills">
        <span>✨</span>
        <p>暂无技能</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSkillsStore } from '../stores/skills';
import TechButton from '../components/TechButton.vue';

const searchQuery = ref('');
const skillsStore = useSkillsStore();
const allSkills = computed(() => skillsStore.allSkills);

const totalSkills = computed(() => allSkills.value.length);
const enabledSkills = computed(() => allSkills.value.filter(s => s.enabled).length);

function openSkillStore() {
  window.open('https://skillhub.cn/', '_blank');
}

const filteredSkills = computed(() => {
  let list = allSkills.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(s =>
      (s.cnName && s.cnName.toLowerCase().includes(q)) ||
      s.name.toLowerCase().includes(q)
    );
  }
  return list;
});

async function toggleSkill(name, enabled) {
  console.log('toggle skill:', name, enabled);
  try {
    await window.uclaw.ipcToggleSkill(name, enabled);
    // 更新本地状态
    const store = useSkillsStore();
    const skill = store.allSkills.find(s => s.name === name);
    if (skill) {
      skill.enabled = enabled;
    }
  } catch (err) {
    console.error('toggle skill failed:', err);
  }
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.skill-skill-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 0;
}

.skill-header {
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
  padding-bottom: 8px;
  padding-left:16px;
  padding-right:16px;
}

.skill-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.skill-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skill-stats-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.skill-stats-sep {
  color: var(--text-secondary);
  opacity: 0.5;
}

.skill-page-title {
  font-size: 24px;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 16px;
  flex-shrink: 0;
}

.skill-search-wrapper {
  position: relative;
  max-width: 448px; 
}

.skill-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 20px;
}

.skill-search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  background: var(--surface-low);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent);
  }
}

.skill-tab-bar {
  display: flex;
  gap: 4px;
  background: var(--surface-low);
  padding: 4px;
  border-radius: 12px;
  width: fit-content;
}

.skill-tab-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 400;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &.skill-active {
    background: var(--accent);
    color: white;
  }
}

.skill-scroll {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  padding: 10px 0;
  height: 580px;
  padding-left: 16px;
  padding-right: 16px;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.skill-card { 
  @extend %card-base;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.skill-icon {
  width: 32px;
  height: 32px;
  background: var(--primary-container);
  border-radius: 8px;
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.skill-details {
  min-width: 0;
}

.skill-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.skill-name {
  font-weight: 400;
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-desc {
  font-size: 12px;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.skill-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
}

.skill-toggle-track {
  width: 44px;
  height: 24px;
  background: var(--surface-high);
  border-radius: 9999px;
  position: relative;
  transition: all 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: all 0.2s;
  }
}

.skill-toggle {
  input {
    &:checked + .skill-toggle-track {
      background: var(--accent);

      &::after {
        transform: translateX(20px);
      }
    }
  }
}

.skill-no-skills {
  text-align: center;
  padding: 48px;
  color: var(--text-secondary);

  .iconfont {
    font-size: 48px;
    margin-bottom: 8px;
  }
}
</style>
