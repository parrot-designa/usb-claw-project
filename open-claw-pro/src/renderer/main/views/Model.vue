<template>
  <div class="model-model-view"> 

    <!-- Restart notification card -->
    <Transition name="slide-up">
      <div v-if="showRestartCard" class="model-restart-card">
        <div class="model-restart-content">
          <span class="model-restart-text">配置已更换，是否需要重启？</span>
        </div>
        <div class="model-restart-actions">
          <button class="model-restart-btn" @click="handleRestart">重启</button>
          <button class="model-restart-btn model-restart-btn-dismiss" @click="showRestartCard = false">不再提示</button>
        </div>
      </div>
    </Transition>

    <!-- Selected models -->
    <div class="model-selected-models" v-if="modelsStore.selectedModels.length > 0">
      <TransitionGroup name="model-remove">
        <div
          v-for="(model, index) in modelsStore.selectedModels"
          :key="model.value"
          class="model-model-row"
          :class="{ 'model-current': model.isCurrent, 'model-removing': removingId === model.value, 'model-dragging': dragIndex === index }"
          draggable="true"
          @dragstart="onDragStart($event, index)"
          @dragend="onDragEnd"
          @dragover.prevent="onDragOver($event, index)"
          @dragenter.prevent="onDragEnter($event, index)"
          @drop.prevent="onDrop($event, index)"
          @click="switchModel(model)"
        >

          <div class="model-model-info">
            <span class="model-drag-handle" title="拖拽排序">
              <span class="iconfont icon-clawtuozhuai"></span>
            </span>
            <div class="model-model-badge" v-if="model.source === 'official'">
              <img src="@assets/logo.png" alt="官方助手" class="model-badge-icon" />
              <span>官方龙虾</span>
            </div>
            <div class="model-model-badge" v-else-if="model.source === 'recommend'">
              <img src="@assets/recommend.png" alt="推荐模型" class="model-badge-icon" />
              <span>推荐模型</span>
            </div>
            <div class="model-model-badge" v-else-if="model.source === 'custom'">
              <span>自定义</span>
            </div>
            <span style="margin:0 6px;">/</span>
            <span class="model-model-name">{{ model.label }}</span>
          </div>
          <button
            v-if="modelsStore.selectedModels.length > 1 && !model.isCurrent"
            @click.stop="removeModel(model)"
            class="model-row-remove"
            title="删除"
          >删除</button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Tab switch -->
    <div class="model-tab-bar">
      <button
        class="model-model-tab"
        :class="{ 'model-active': activeTab === 'official' }"
        @click="activeTab = 'official'"
      >
        <img src="@assets/logo.png" alt="min-claw" class="model-tab-icon" />
        <span>官方模型</span>
      </button>
      <button
        class="model-model-tab"
        :class="{ 'model-active': activeTab === 'recommended' }"
        @click="activeTab = 'recommended'"
      >
        推荐模型
      </button>
      <button
        class="model-model-tab"
        :class="{ 'model-active': activeTab === 'custom' }"
        @click="activeTab = 'custom'"
      >
        自定义模型
      </button>
    </div>

    <!-- Official Tab -->
    <div v-show="activeTab === 'official'" class="model-tab-content">
      <div class="model-grid-layout">
        <!-- Left: Official model config -->
        <div class="model-config-panel">
          <div class="model-panel-header">
            <img src="@assets/logo.png" alt="min-claw" class="model-panel-icon" />
            <div>
              <h3 class="model-panel-title">龙虾便携助手</h3>
              <p class="model-panel-subtitle">官方模型</p>
            </div>
          </div>
          <p class="model-panel-desc">稳定高效AI 模型聚合平台</p>

          <div class="model-feature-list">
            <div class="model-feature">
              <img src="@assets/zhichi.png" alt="check" class="model-check-icon" />
              <span>支持 GPT-5、Claude、Gemini 等主流模型</span>
            </div> 
            <div class="model-feature">
              <img src="@assets/zhichi.png" alt="check" class="model-check-icon" />
              <span>高速网络优化，低延迟稳定调用 ，按量计费</span>
            </div>
          </div>

          <!-- Model select -->
          <div class="model-form-group">
            <label class="model-form-label">选择模型</label>
            <div class="model-input-row">
              <select class="model-form-select" v-model="modelValue">
                <option v-if="modelsStore.allModels.length === 0" value="">请先填写 API Key 获取可用模型</option>
                <option v-for="m in modelsStore.allModels" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
              <button @click="handleRefreshModels" class="model-btn-icon" :class="{ 'model-spinning': isRefreshing }" title="刷新模型列表">
                <span class="iconfont icon-clawshuaxin"></span>
              </button>
            </div>
          </div>

          <!-- API Key input -->
          <div class="model-form-group">
            <label class="model-form-label">API Key</label>
            <div class="model-input-row model-password-row">
              <input
                type="password"
                id="official-api-key"
                class="model-form-input"
                placeholder="此处为API KEY"
                v-model="apiKeyValue"
                readonly
              />
              <button @click="toggleOfficialPw" class="model-btn-icon" title="切换可见性">
                <span class="iconfont" :class="[showPw ? 'icon-clawkejianxing-bukejian' : 'icon-clawkejianxing-kejian']"></span>
              </button>
            </div>
          </div>

          <button @click="saveOfficialConfig" class="model-btn-save">
            保存配置
          </button>
        </div>

        <!-- Right: Balance -->
        <div class="model-balance-panel">
          <h4 class="model-balance-title">剩余积分</h4>
          <div class="model-balance-content">
            <div class="model-usage-bar-container">
              <div class="model-usage-labels">
                <span>已用积分</span>
                <span>{{ userStore.userInfo?.used_percent ? Math.round(userStore.userInfo.used_percent * 100) + '%' : '0%' }}</span>
              </div>
              <div class="model-usage-bar-bg">
                <div class="model-usage-bar-fill" :style="{ width: (userStore.userInfo?.used_percent ? userStore.userInfo.used_percent * 100 : 0) + '%' }"></div>
              </div>
            </div>
            <div class="model-balance-stats">
              <div class="model-stat-item">
                <div class="model-stat-label">已用</div>
                <div class="model-stat-value"><span class="model-balance-symbol"></span>{{ formatBalance(userStore.userInfo?.used_balance) }}</div>
              </div>
              <div class="model-stat-item">
                <div class="model-stat-label">剩余</div>
                <div class="model-stat-value"><span class="model-balance-symbol"></span>{{ formatBalance(userStore.userInfo?.remain_balance) }}</div>
              </div>
            </div>
            <button @click="refreshUsage" class="model-btn-refresh">
              <span class="iconfont icon-clawshuaxin"></span>
              刷新积分
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recommended Tab -->
    <div v-show="activeTab === 'recommended'" class="model-tab-content">
      <div class="model-model-grid">
        <div
          v-for="model in recommendedModels"
          :key="model.provider"
          class="model-model-card"
          :class="{ 'model-selected': selectedRecommendModel?.provider === model.provider }"
          :data-provider="model.provider"
          :data-base="model.base"
          :data-model="model.model"
          @click="selectRecommendedModel(model)"
        >
          <span class="model-check">✓</span>
          <h4>
            {{ model.name }}
            <span v-for="(tag, index) in model.tags" :key="index" class="model-tag" :class="getTagClass(tag)">{{ tag }}</span>
          </h4>
          <p>{{ model.desc }}</p>
          <a v-if="model.buyLink" class="model-buy-link" :href="model.buyLink" target="_blank" @click.stop>→ 获取 API Key</a>
        </div>
      </div>

      <!-- 推荐模型配置表单 -->
      <Transition name="slide-up">
        <div v-if="selectedRecommendModel" class="model-config-form">
          <div class="model-form-header">
            <h4>{{ selectedRecommendModel.name }} 配置</h4>
            <button class="model-close-btn" @click="closeRecommendForm">×</button>
          </div>
          <div class="model-form-group">
            <label class="model-form-label">API URL</label>
            <input
              type="text"
              class="model-form-input"
              v-model="recommendUrl"
              placeholder="请输入 API 地址"
            />
          </div>
          <div class="model-form-group">
            <label class="model-form-label">API Key</label>
            <input
              type="password"
              class="model-form-input"
              v-model="recommendKey"
              placeholder="请输入 API Key"
            />
          </div>
          <div class="model-form-group">
            <label class="model-form-label">模型名称</label>
            <input
              type="text"
              class="model-form-input"
              v-model="recommendModelName"
              :placeholder="'请输入模型名称，如 ' + selectedRecommendModel.model"
            />
          </div>
          <div class="model-form-group">
            <label class="model-form-label">API 类型</label>
            <select class="model-form-input" v-model="recommendApiType">
              <option v-for="opt in recommendApiTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <button @click="saveRecommendConfig" class="model-btn-save">保存配置</button>
        </div>
      </Transition>
    </div>

    <!-- Custom Tab -->
    <div v-show="activeTab === 'custom'" class="model-tab-content">
      <div class="model-custom-intro">
        <h3>自定义 OpenAI 兼容模型</h3>
        <p>填写任意 OpenAI 格式的 API 地址，快速接入第三方模型服务</p>
      </div>

      <div class="model-config-form">
        <div class="model-form-group">
          <label class="model-form-label">API URL</label>
          <input
            type="text"
            class="model-form-input"
            v-model="customUrl"
            placeholder="请输入 API 地址，例如 https://api.example.com/v1"
          />
        </div>
        <div class="model-form-group">
          <label class="model-form-label">API Key</label>
          <input
            type="password"
            class="model-form-input"
            v-model="customKey"
            placeholder="请输入 API Key"
          />
        </div>
        <div class="model-form-group">
          <label class="model-form-label">API 类型</label>
          <select class="model-form-input" v-model="customApiType">
            <option v-for="opt in apiTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="model-form-group">
          <label class="model-form-label">自定义模型名称</label>
          <input
            type="text"
            class="model-form-input"
            v-model="customModelName"
            placeholder="请输入自定义模型名称"
          />
        </div>
        <button @click="saveCustomModel" class="model-btn-save">添加模型</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useModelsStore, fetchAllModels } from '../stores/models';
import { fetchUserInfo } from '../stores/user';
import { useToast } from '../composables/useToast';
import { useUserStore } from '../stores/user';
import { useGatewayStore } from '../stores/gateway';

const modelsStore = useModelsStore();
const gatewayStore = useGatewayStore();
const userStore = useUserStore();
const { showToast } = useToast();
const activeTab = ref('official');

const showRestartCard = ref(false);

function formatBalance(value) {
  if (value == null) return '0.00';
  const truncated = Math.trunc(value * 100) / 100;
  return truncated.toFixed(2);
}

function showRestartCardNotice() {
  showRestartCard.value = true;
}

async function handleRestart() {
  showRestartCard.value = false;
  window.showLoadingOverlayVue?.();
  try {
    await window.uclaw.ipcRestartGateway();
    if (window.hideLoadingOverlayVue) {
      setTimeout(() => window.hideLoadingOverlayVue(), 500);
    }
  } catch (err) {
    console.error('重启失败:', err);
    if (window.hideLoadingOverlayVue) {
      setTimeout(() => window.hideLoadingOverlayVue(), 500);
    }
    if (window.showToastVue) {
      window.showToastVue('重启失败: ' + err.message, true);
    }
  }
}

const modelValue = ref('');
const showPw = ref(false);
const apiKeyValue = ref('');
const isRefreshing = ref(false);
const removingId = ref(null);

// 拖拽排序
const dragIndex = ref(null);
const dropIndex = ref(null);

function onDragStart(event, index) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index);
  event.target.classList.add('dragging');
}

function onDragEnd(event) {
  dragIndex.value = null;
  dropIndex.value = null;
  event.target.classList.remove('model-dragging');
  document.querySelectorAll('.model-model-row').forEach(el => el.classList.remove('model-drag-over'));
}

function onDragOver(event, index) {
  event.dataTransfer.dropEffect = 'move';
}

function onDragEnter(event, index) {
  if (dragIndex.value === null || dragIndex.value === index) return;
  dropIndex.value = index;
  document.querySelectorAll('.model-model-row').forEach((el, i) => {
    el.classList.toggle('model-drag-over', i === index);
  });
}

function onDrop(event, index) {
  if (dragIndex.value === null || dragIndex.value === index) return;
  const newModels = [...modelsStore.selectedModels];
  const [removed] = newModels.splice(dragIndex.value, 1);
  newModels.splice(index, 0, removed);

  // 如果当前模型被移动，需要更新 isCurrent
  const currentValue = modelsStore.selectedModels.find(m => m.isCurrent)?.value;
  const currentIndex = dragIndex.value;
  modelsStore.setSelectedModels(
    newModels.map(m => ({ ...m, isCurrent: m.value === currentValue }))
  );
  showToast('模型顺序已调整');
  if (currentValue && (dragIndex.value === index || dragIndex.value === currentIndex)) {
    // showRestartCardNotice();
  }
}

// 推荐模型配置
const selectedRecommendModel = ref(null);
const recommendUrl = ref('');
const recommendKey = ref('');
const recommendModelName = ref('');
const recommendApiType = ref('openai-completions');

const recommendApiTypeOptions = [
  { value: 'openai-completions', label: 'OpenAI (兼容格式)' },
  { value: 'anthropic-messages', label: 'Anthropic Claude' },
];

// 自定义模型配置
const customUrl = ref('');
const customKey = ref('');
const customModelName = ref('');
const customApiType = ref('openai-completions');

const apiTypeOptions = [
  { value: 'openai-completions', label: 'OpenAI (兼容格式)' },
  { value: 'anthropic-messages', label: 'Anthropic Claude' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'lmstudio', label: 'LM Studio' },
];

const recommendedModels = [
  { provider: 'minimax', name: 'MiniMax', base: 'https://api.minimaxi.com/anthropic', model: 'MiniMax M2.7', desc: '速度快，性价比高', buyLink: 'https://platform.minimaxi.com/', tags: ['推荐', '国内'] },
  { provider: 'kimi', name: 'Kimi (月之暗面)', base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-auto', desc: '智能选模型', buyLink: 'https://platform.moonshot.cn/', tags: ['国内', '快'] },
  { provider: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com/v1', model: 'deepseek-chat', desc: '超低价格', buyLink: 'https://platform.deepseek.com/', tags: ['国内', '便宜'] },
  { provider: 'qwen', name: '通义千问', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo', desc: '阿里云出品', buyLink: 'https://dashscope.console.aliyun.com/', tags: ['国内', '有免费'] },
  { provider: 'doubao', name: '豆包 (字节)', base: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-1.5-pro-32k', desc: '字节跳动', buyLink: 'https://console.volcengine.com/ark', tags: ['国内', '快'] },
  { provider: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o', desc: '需翻墙或中转', buyLink: 'https://platform.openai.com/', tags: ['强'] },
  { provider: 'anthropic', name: 'Claude', base: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514', desc: '需翻墙或中转', buyLink: 'https://console.anthropic.com/', tags: ['强'] },
  { provider: 'groq', name: 'Groq', base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', desc: '超高速推理', buyLink: 'https://console.groq.com/', tags: ['极快', '有免费'] },
  { provider: 'siliconflow', name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct', desc: '多模型聚合，价格低', buyLink: 'https://cloud.siliconflow.cn/', tags: ['国内', '便宜'] },
];

function selectRecommendedModel(model) {
  selectedRecommendModel.value = model;
  recommendUrl.value = model.base || '';
  recommendKey.value = '';
  recommendModelName.value = '';
  recommendApiType.value = model.provider === 'minimax' ? 'anthropic-messages' : 'openai-completions';
}

function closeRecommendForm() {
  selectedRecommendModel.value = null;
  recommendUrl.value = '';
  recommendKey.value = '';
  customModelName.value = '';
  recommendModelName.value = '';
  recommendApiType.value = 'openai-completions';
}

function saveRecommendConfig() {
  if (!recommendUrl.value) {
    showToast('请填写 API URL，不可为空', true);
    return;
  }
  if (!recommendKey.value) {
    showToast('请填写 API Key，不可为空', true);
    return;
  }
  if (!recommendModelName.value) {
    showToast('请填写模型名称，不可为空', true);
    return;
  }

  const modelName = recommendModelName.value;
  const modelValue = `${selectedRecommendModel.value.provider}-${recommendModelName.value}`;
  const label = selectedRecommendModel.value.name + ' / ' + recommendModelName.value;
  const source = 'recommend';

  const exists = modelsStore.selectedModels.some(m => m.value === modelValue);
  if (exists) {
    showToast('不可重复添加模型', true);
    return;
  }

  const modelInfo = {
    label,
    value: modelValue,
    source,
    base: recommendUrl.value,
    key: recommendKey.value,
    model: modelName,
    provider: selectedRecommendModel.value.provider,
    api: recommendApiType.value,
  };

  const updatedModels = [...modelsStore.selectedModels];
  updatedModels.push({ ...modelInfo, isCurrent: updatedModels.length === 0 });
  modelsStore.setSelectedModels(updatedModels);
  showToast('模型添加成功'); 
  closeRecommendForm();
}

function saveCustomModel() {
  if (!customUrl.value) {
    showToast('请填写 API URL，不可为空', true);
    return;
  }
  if (!customKey.value) {
    showToast('请填写 API Key，不可为空', true);
    return;
  }
  if (!customModelName.value) {
    showToast('请填写自定义模型名称', true);
    return;
  }

  const modelValue = `custom-${customModelName.value}`;
  const exists = modelsStore.selectedModels.some(m => m.value === modelValue);
  if (exists) {
    showToast('不可重复添加模型', true);
    return;
  }

  const modelInfo = {
    label: customModelName.value,
    value: modelValue,
    source: 'custom',
    base: customUrl.value,
    key: customKey.value,
    model: customModelName.value,
    provider: 'custom',
    api: customApiType.value,
  };

  const updatedModels = [...modelsStore.selectedModels];
  updatedModels.push({ ...modelInfo, isCurrent: updatedModels.length === 0 });
  modelsStore.setSelectedModels(updatedModels);
  showToast('模型添加成功');
  // showRestartCardNotice();

  customUrl.value = '';
  customKey.value = '';
  customModelName.value = '';
  customApiType.value = 'openai-completions';
}

function getTagClass(tag) {
  const tagMap = {
    '推荐': 'model-hot',
    '国内': 'model-cn',
    '快': 'model-fast',
    '便宜': 'model-cheap',
    '有免费': 'model-free',
    '极快': 'model-fast',
    '强': 'model-hot',
  };
  return tagMap[tag] || '';
}

watch(() => modelsStore.currentModel, (model) => { 
  if (model && !modelValue.value) {
    if(model.source !== 'official'){
      modelValue.value = modelsStore.allModels?.[0]?.value;
      return;
    }
    modelValue.value = model.value;
  }
}, { immediate: true });

watch(() => userStore.userInfo, (newToken) => {
  if (newToken?.token) {
    apiKeyValue.value = newToken.token.key;
  }
}, { immediate: true,deep: true });
 
function toggleOfficialPw() {
  showPw.value = !showPw.value;
  const input = document.getElementById('official-api-key');
  if (input) {
    input.type = showPw.value ? 'text' : 'password';
  }
}

async function saveOfficialConfig() {
  if (!modelValue.value) {
    showToast('请选择模型，不可为空', true);
    return;
  }

  if (!apiKeyValue.value) {
    showToast('请填写 API Key，不可为空', true);
    return;
  }

  const exists = modelsStore.selectedModels.some(m => m.value === modelValue.value);
 
  if (exists) {
    showToast('不可重复添加模型', true);
    return;
  }

  const modelInfo = modelsStore.allModels.find(m => m.value === modelValue.value);
  if (!modelInfo) {
    showToast('未找到该模型信息', true);
    return;
  }

  const updatedModels = [...modelsStore.selectedModels]
  updatedModels.push({ ...modelInfo });
  modelsStore.setSelectedModels(updatedModels);
  showToast('模型添加成功');
  // showRestartCardNotice();
}

async function refreshUsage() {
  await fetchUserInfo();
}

async function handleRefreshModels() {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await fetchAllModels();
    showToast('获取最新模型成功');
  } finally {
    isRefreshing.value = false;
  }
}

function removeModel(model) {
  if (!confirm(`确定要删除模型「${model.label}」吗？`)) {
    return;
  }
  removingId.value = model.value;
  setTimeout(() => {
    const updated = modelsStore.selectedModels.filter(m => m.value !== model.value);
    modelsStore.setSelectedModels(updated);
    removingId.value = null;
  }, 400);
}

function switchModel(model) {
  const isChanging = !modelsStore.selectedModels.find(m => m.isCurrent)?.value ||
                     modelsStore.selectedModels.find(m => m.isCurrent)?.value !== model.value;
  modelsStore.setSelectedModels(
    modelsStore.selectedModels.map(item => ({...item, isCurrent: item.value === model.value}))
  );
  if (isChanging) {
    showRestartCardNotice();
  }
}
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.model-model-view { 
  padding: 16px;

  .model-page-title {
    font-size: 24px;
    font-weight: 400;
    font-family: 'Manrope', sans-serif;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  .model-selected-models {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .model-model-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px; 
    @extend %card-base;
    font-size: 14px;
    color: var(--text-primary);
    cursor: pointer;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                padding 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                margin 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    max-height: 80px;

    &:hover{
      border-color: #f87171;
      box-shadow: 0 8px 20px -5px rgba(239, 68, 68, 0.4);
    }

    .model-drag-handle {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      margin-right: 8px;
      color: var(--text-secondary);
      cursor: grab;
      opacity: 0.5;
      transition: opacity 0.2s; 

      &:active {
        cursor: grabbing;
      }
    }

    .grip-icon {
      display: inline-block;
      width: 4px;
      height: 4px;
      background: currentColor;
      border-radius: 50%;
    }

    &.model-dragging {
      opacity: 0.5;
    }

    &.model-drag-over {
      border-color: var(--accent);
      background: var(--surface-high);
    }

    &.model-removing {
      transform: translateX(110%);
      opacity: 0;
      max-height: 0;
      padding-top: 0;
      padding-bottom: 0;
      margin-bottom: 0;
      border-color: transparent;
    }

    &.model-current {
      border-color: #f87171;
    }

    .model-model-info {
      display: flex;
      align-items: center;
      gap: 0;

      .model-model-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text-secondary);

        .model-badge-icon {
          width: 14px;
          height: 14px;
        }
      }

      .model-model-name {
        font-weight: 400;
      }
    }

    .model-row-label {
      font-weight: 400;
    }

    .model-model-name {
      font-weight: 400;
    }

    .model-row-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      line-height: 1;
      color: #ff3b30;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 0, 0, 0.2);
        color: #ff3b30;
      }
    }
  }

  .model-tab-bar {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--surface);
    border-radius: 8px;
    width: fit-content;
    margin-bottom: 12px;

    .model-model-tab {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 400;
      transition: all 0.2s;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;

      &.model-active {
        background: var(--accent);
        color: white;
      }

      .model-tab-icon {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }
    }
  }

  .model-tab-content {
    margin-top: 16px;
  }

  .model-grid-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;

    .model-config-panel { 
      @extend %card-base;
      padding: 16px;

      .model-panel-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        .model-panel-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;

          img {
            width: 24px;
            height: 24px;
          }
        }

        .model-panel-title {
          font-size: 16px;
          font-weight: 400;
          color: var(--text-primary);
          font-family: 'Manrope', sans-serif;
        }

        .model-panel-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .model-panel-desc {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 12px;
      }

      .model-feature-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;

        .model-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-primary);

          .iconfont {
            color: var(--secondary);
            font-size: 16px;
          }

          .model-check-icon {
            width: 16px;
            height: 16px;
            object-fit: contain;
          }
        }
      }

      .model-form-group {
        margin-bottom: 12px;

        .model-form-label {
          display: block;
          font-size: 12px;
          font-weight: 400;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }

        .model-input-row {
          display: flex;
          gap: 8px;

          &.model-password-row {
            gap: 4px;

            input[type='password']{
              letter-spacing: -5px;
            }
          }

          .model-form-select,
          .model-form-input {
            flex: 1;
            padding: 8px 12px;
            background: var(--surface);
            border: 1px solid var(--outline);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;

            &:focus {
              border-color: var(--accent);
              outline: none;
            }
          }

          .model-btn-icon {
            padding: 8px;
            background: var(--surface-low);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background: var(--surface-high);
            }

            &.model-spinning .icon-clawshuaxin {
              animation: spin 0.8s linear infinite;
            }
          }
        }
      }

      .model-btn-save {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 16px;
        background: linear-gradient(135deg, var(--accent), #ff8f65);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 400;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          opacity: 0.85;
          box-shadow: 0 10px 20px -5px rgba(255, 107, 53, 0.3);
        }
      }
    }

    .model-balance-panel {
      @extend %card-base;
      padding: 16px;
      align-self: start;

      .model-balance-title {
        font-size: 14px;
        font-weight: 400;
        color: var(--text-primary);
        margin-bottom: 12px;
      }

      .model-balance-content {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .model-usage-bar-container {
          display: flex;
          flex-direction: column;
          gap: 6px;

          .model-usage-labels {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: var(--text-secondary);
          }

          .model-usage-bar-bg {
            height: 12px;
            background: var(--surface);
            border-radius: 9999px;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

            .model-usage-bar-fill {
              height: 100%;
              background: linear-gradient(90deg, #ff6b35, #ff8f65, #ffb347);
              border-radius: 9999px;
              transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
              box-shadow: 0 0 12px rgba(255, 107, 53, 0.5);

              &::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
                animation: shimmer 2s infinite;
              }
            }
          }
        }

        .model-balance-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;

          .model-stat-item {
            background: var(--surface);
            border-radius: 8px;
            padding: 10px;

            .model-stat-label {
              font-size: 12px;
              color: var(--text-secondary);
              margin-bottom: 2px;
            }

            .model-stat-value {
              font-size: 24px;
              font-weight: 500;
              color:#4fd183;
              text-align: center;

              .model-balance-symbol {
                font-size: 0.6em;
                margin-right: 3px;
                vertical-align: baseline;
              }
            }
          }
        }

        .model-btn-refresh {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: var(--surface-high);
          }
        }
      }
    }
  }

  .model-model-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .model-model-card {
      @extend %card-base;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s; 

      .model-check {
        color: var(--accent);
        font-weight: bold;
      }

      h4 {
        margin: 8px 0;
        font-size: 14px;
        font-weight: 400;
        color: var(--text-primary);
      }

      p {
        margin: 0 0 8px;
        font-size: 12px;
        color: var(--text-secondary);
      }

      .model-tag {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 400;
        margin-right: 4px;
        background: var(--surface);
        color: var(--text-secondary);

        &.model-hot { background: #fff3e0; color: #ff9800; }
        &.model-cn { background: #e8f5e9; color: #4caf50; }
        &.model-fast { background: #e3f2fd; color: #2196f3; }
        &.model-cheap { background: #f3e5f5; color: #9c27b0; }
        &.model-free { background: #fffde7; color: #ffc107; }
      }

      .model-buy-link {
        font-size: 12px;
        color: var(--accent);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      &.model-selected {
        border-color: var(--accent);
        background: var(--surface-high);
      }
    }
  }

  .model-config-form { 
    padding: 16px;
    margin-top: 16px;
    @extend %card-base;
  
    .model-form-input {
      width: 100%;
    }

    .model-form-group {
      margin-bottom: 12px;

      .model-form-label {
        display: block;
        font-size: 12px;
        font-weight: 400;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .model-form-input {
        flex: 1;
        padding: 8px 12px;
        background: var(--surface);
        border: 1px solid var(--outline);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 14px;

        &:focus {
          border-color: var(--accent);
          outline: none;
        }
      }
    }

    .model-input-row {
      display: flex;
      gap: 8px;

      &.model-password-row {
        gap: 4px;
      }
    }

    .model-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 400;
        color: var(--text-primary);
      }

      .model-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        line-height: 1;

        &:hover {
          color: var(--text-primary);
        }
      }
    }

    .model-btn-save {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: linear-gradient(135deg, var(--accent), #ff8f65);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 400;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        opacity: 0.85;
        box-shadow: 0 10px 20px -5px rgba(255, 107, 53, 0.3);
      }
    }
  }

  .model-custom-intro {
    margin-bottom: 16px;

    h3 {
      font-size: 16px;
      font-weight: 400;
      color: var(--text-primary);
      margin: 0 0 6px;
    }

    p {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0;
    }
  }

  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.model-restart-card {
  background: linear-gradient(135deg, var(--accent), #ff8f65);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .model-restart-content {
    display: flex;
    align-items: center;
    gap: 8px;
    color: white;
    font-weight: 400;
    font-size: 14px;

    .model-restart-icon {
      font-size: 1.16px;
    }
  }

  .model-restart-actions {
    display: flex;
    gap: 8px;
  }

  .model-restart-btn {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    color: var(--accent);
    border: none;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    &.model-restart-btn-dismiss {
      background: rgba(255, 255, 255, 0.25);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.4);

      &:hover {
        background: rgba(255, 255, 255, 0.35);
      }
    }
  }
}
</style>
