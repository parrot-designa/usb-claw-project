<template>
  <div class="recharge-recharge-view"> 

    <!-- Balance Card -->
    <div class="recharge-balance-panel">
      <h4 class="recharge-balance-title">官方模型账户积分</h4>
      <div class="recharge-balance-content">
        <div class="recharge-usage-bar-container">
          <div class="recharge-usage-labels">
            <span>已用积分</span>
            <span>{{ userStore.userInfo?.used_percent ? Math.round(userStore.userInfo.used_percent * 100) + '%' : '0%' }}</span>
          </div>
          <div class="recharge-usage-bar-bg">
            <div class="recharge-usage-bar-fill" :style="{ width: (userStore.userInfo?.used_percent ? userStore.userInfo.used_percent * 100 : 0) + '%' }"></div>
          </div>
        </div>
        <div class="recharge-balance-stats">
          <div class="recharge-stat-item">
            <div class="recharge-stat-label">已用积分</div>
            <div class="recharge-stat-value"><span class="recharge-balance-symbol"></span>{{ formatBalance(userStore.userInfo?.used_balance) }}</div>
          </div>
          <div class="recharge-stat-item">
            <div class="recharge-stat-label">剩余积分</div>
            <div class="recharge-stat-value"><span class="recharge-balance-symbol"></span>{{ formatBalance(userStore.userInfo?.remain_balance) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tip Card -->
    <div class="recharge-tip-card">
      <div class="recharge-tip-icon iconfont icon-clawtishi"></div>
      <div class="recharge-tip-content">
        此充值仅用于官方代理的AI模型调用费用(按实际 token用量计费)。OpenClaw软件本身完全免费，您也可以在「模型配置」填入自己的 API Key来使用自有积分。
      </div>
    </div>

    <!-- Quick Recharge Card -->
    <div class="recharge-recharge-panel">
      <h4 class="recharge-recharge-title">快速充值</h4>

      <!-- Amount Options -->
      <div class="recharge-amount-section">
        <label class="recharge-section-label">选择充值积分</label>
        <div class="recharge-amount-options">
          <button
            v-for="amount in amountOptions"
            :key="amount"
            class="recharge-amount-btn"
            :class="{ 'recharge-active': selectedAmount === amount && !customAmount }"
            @click="selectAmount(amount)"
          >
           {{ amount }}
           <span v-if="discountConfig[amount] && discountConfig[amount] < 1" class="recharge-discount-tag">
             {{ discountConfig[amount] * 10 }}折
           </span>
          </button>
        </div>
      </div>

      <!-- Custom Amount -->
      <div class="recharge-custom-amount-section">
        <label class="recharge-section-label">自定义积分</label>
        <div class="recharge-input-row">
          <input
            type="number"
            class="recharge-form-input"
            v-model="customAmount"
            placeholder="输入积分"
            min="1"
            @input="onCustomAmountInput"
          />
          <span class="recharge-input-suffix">积分</span>
        </div>
      </div>

      <!-- Payment Method Tabs -->
      <div class="recharge-payment-section">
        <label class="recharge-section-label">支付方式</label>
        <div class="recharge-payment-tabs">
          <button
            class="recharge-payment-tab"
            :class="{ 'recharge-active': paymentMethod === 'alipay' }"
            @click="paymentMethod = 'alipay'"
          >
            <img src="@assets/zhifubao.png" class="recharge-payment-icon" />
            <span>支付宝支付</span>
          </button>
          <button
            class="recharge-payment-tab"
            :class="{ 'recharge-active': paymentMethod === 'wechat' }"
            @click="onWechatClick"
          >
            <img src="@assets/wechat.png" class="recharge-payment-icon wechat" />
            <span>微信支付</span>
          </button>
        </div>
      </div>

      <!-- Recharge Details -->
      <div class="recharge-details" v-if="displayAmount > 0">
        <div class="recharge-detail-row">
          <span class="recharge-detail-label">充值 Token 数量</span>
          <span class="recharge-detail-value">{{ displayTokens.toLocaleString() }} Tokens</span>
        </div>
        <div class="recharge-detail-row" v-if="hasDiscount">
          <span class="recharge-detail-label">原价</span>
          <span class="recharge-detail-value recharge-original-price">{{ displayAmount.toFixed(2) }}</span>
        </div>
        <div class="recharge-detail-row">
          <span class="recharge-detail-label">{{ hasDiscount ? '折扣价' : '对应积分' }}</span>
          <span class="recharge-detail-value" :class="{ 'recharge-discounted': hasDiscount }">
            {{ (displayAmount * currentDiscount).toFixed(2) }}
            <span v-if="hasDiscount" class="recharge-detail-discount">{{ currentDiscount * 10 }}折</span>
          </span>
        </div>
        <div class="recharge-detail-row conversion">
          <span class="recharge-detail-label">换算比例</span>
          <span class="recharge-detail-value">1 积分 ≈ 500,000 Tokens</span>
        </div>
      </div>

      <!-- Submit Button -->
      <button
        class="recharge-btn-save"
        :disabled="displayAmount <= 0 || isCreatingOrder"
        @click="handleRecharge"
      >
        <span v-if="isCreatingOrder" class="recharge-loading-spinner"></span>
        <span v-else>立即充值</span>
      </button>

      <!-- QR Code Display -->
      <div v-if="showQRCode" class="recharge-qrcode-section">
        <div class="recharge-qrcode-container">
          <canvas id="qrcode-canvas"></canvas>
        </div>
        <p class="recharge-qrcode-hint">请使用{{ paymentMethod === 'alipay' ? '支付宝' : '微信' }}扫码支付</p>
        <button class="recharge-btn-secondary" @click="showUrlDialog = true">复制支付链接</button>
        <button class="recharge-btn-cancel" @click="cancelRecharge">取消充值</button>
      </div>
    </div>

    <!-- Recharge Records Section -->
    <div class="recharge-records-panel">
      <div class="recharge-records-header">
        <h4 class="recharge-records-title">充值记录</h4>
        <button class="recharge-btn-refresh" @click="fetchRechargeRecords" :disabled="loadingRecords">
          <span v-if="loadingRecords" class="recharge-loading-spinner-small"></span>
          <span v-else>刷新</span>
        </button>
      </div>

      <div v-if="rechargeRecords.length > 0" class="recharge-records-table-container">
        <table class="recharge-records-table">
          <thead>
            <tr>
              <th>支付积分</th>
              <th>支付方式</th>
              <th>创建时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in rechargeRecords" :key="record.id">
              <td>{{ record.money.toFixed(2) }}</td>
              <td>{{ getPaymentMethodName(record.payment_method) }}</td>
              <td>{{ formatTime(record.create_time) }}</td>
              <td>
                <span class="recharge-status" :class="'recharge-status-' + record.status">
                  {{ record.status === 'success' ? '成功' : '待支付' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="recharge-pagination" v-if="totalRecords > pageSize">
          <button
            class="recharge-pagination-btn"
            :disabled="currentPage <= 1"
            @click="changePage(currentPage - 1)"
          >
            上一页
          </button>
          <span class="recharge-pagination-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="recharge-pagination-btn"
            :disabled="currentPage >= totalPages"
            @click="changePage(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-else-if="!loadingRecords" class="recharge-records-empty">
        暂无充值记录
      </div>

      <div v-else class="recharge-records-loading">
        加载中...
      </div>
    </div>

    <!-- URL Dialog -->
    <div v-if="showUrlDialog" class="recharge-dialog-overlay" @click.self="closeUrlDialog">
      <div class="recharge-dialog recharge-dialog-iframe">
        <div class="recharge-dialog-header">
          <span>支付页面</span>
          <button class="recharge-dialog-close" @click="closeUrlDialog">×</button>
        </div>
        <div class="recharge-dialog-body-iframe">
          <iframe :src="payUrl" class="recharge-payment-iframe" frameborder="0"></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { apiRequest } from '@renderer/js/api.js';
import { useToast } from '../composables/useToast';
import QRCode from 'qrcode';

const userStore = useUserStore();
const { showToast } = useToast();

// Amount options from API
const amountOptions = ref([10, 50, 100, 200, 500]);
const selectedAmount = ref(null);
const customAmount = ref('');
const discountConfig = ref({}); // 折扣配置 { amount: discountRate }
const paymentMethod = ref('alipay');
const isCreatingOrder = ref(false);
const showQRCode = ref(false);
const qrCodeUrl = ref('');
const showUrlDialog = ref(false);
const payUrl = ref('');
const urlCopied = ref(false);

// Format balance to 2 decimal places
function formatBalance(value) {
  if (value == null) return '0.00';
  const truncated = Math.trunc(value * 100) / 100;
  return truncated.toFixed(2);
}

// Recharge records
const rechargeRecords = ref([]);
const loadingRecords = ref(false);
const loadingTopupInfo = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const totalRecords = ref(0);

// Display amount based on selection
const displayAmount = computed(() => {
  if (customAmount.value && parseFloat(customAmount.value) > 0) {
    return parseFloat(customAmount.value);
  }
  return selectedAmount.value || 0;
});

// Display token amount (for UI display only)
const displayTokens = computed(() => {
  return Math.floor(displayAmount.value * 500000);
});

// Get discount for current selected amount
const currentDiscount = computed(() => {
  const amount = customAmount.value ? parseFloat(customAmount.value) : selectedAmount.value;
  if (amount && discountConfig.value && discountConfig.value[amount]) {
    return discountConfig.value[amount];
  }
  return 1.0;
});

// Check if current amount has discount
const hasDiscount = computed(() => {
  return currentDiscount.value < 1.0;
});

// Select predefined amount
function selectAmount(amount) {
  selectedAmount.value = amount;
  customAmount.value = '';
}

// Handle custom amount input
function onCustomAmountInput() {
  selectedAmount.value = null;
}

// Handle WeChat payment tab click
function onWechatClick() {
  showToast('暂未开通', true);
}

// Handle recharge
async function handleRecharge() {
  if (displayAmount.value <= 0) {
    showToast('请选择或输入充值积分', true);
    return;
  }

  isCreatingOrder.value = true;

  try {
    const res = await apiRequest('/api/user/pay/post', {
      method:'POST',
      body:{
        amount: displayAmount.value,
        payment_method: paymentMethod.value,
      }
    });

    if (res.message!=="success") {
      showToast(res.data || '创建充值订单失败', true);
      return;
    }

    if (res.url) {
      payUrl.value = res.url;
      showUrlDialog.value = true;
    } else {
      showToast('获取支付链接失败', true);
    }
  } catch (e) {
    console.error('[Recharge] handleRecharge error:', e);
    showToast('充值请求失败', true);
  } finally {
    isCreatingOrder.value = false;
  }
}

// Generate QR code
async function generateQRCode(url) {
  const canvas = document.getElementById('qrcode-canvas');
  if (!canvas) return;

  try {
    await QRCode.toCanvas(canvas, url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (e) {
    console.error('[Recharge] QR code generation error:', e);
    showToast('二维码生成失败', true);
  }
}

// Copy pay URL
async function copyPayUrl() {
  try {
    await navigator.clipboard.writeText(qrCodeUrl.value);
    urlCopied.value = true;
    setTimeout(() => {
      urlCopied.value = false;
    }, 2000);
  } catch (e) {
    showToast('复制失败', true);
  }
}

// Close URL dialog
function closeUrlDialog() {
  showUrlDialog.value = false;
  payUrl.value = '';
}

// Cancel recharge
function cancelRecharge() {
  showQRCode.value = false;
  qrCodeUrl.value = '';
  showUrlDialog.value = false;
  payUrl.value = '';
}

// Fetch topup info
async function fetchTopupInfo() {
  loadingTopupInfo.value = true;
  try {
    const res = await apiRequest('/api/user/topup/info/post',{method:'POST'});
    if (res.success && res.data) {
      const { amount_options, min_topup, discount } = res.data;
      if (amount_options && amount_options.length > 0) {
        amountOptions.value = amount_options;
        selectedAmount.value = amount_options[0];
      }
      if (discount) {
        discountConfig.value = discount;
      }
    }
  } catch (e) {
    console.error('[Recharge] fetchTopupInfo error:', e);
  } finally {
    loadingTopupInfo.value = false;
  }
}

// Calculate amount from tokens
async function fetchAmountInfo() {
  // Not needed for now as we use local conversion
}

// Fetch recharge records
async function fetchRechargeRecords() {
  loadingRecords.value = true;
  try {
    const res = await apiRequest('/api/user/topup/self/post', {
      method: 'POST',
      body: {
        p: currentPage.value,
        page_size: pageSize.value
      }
    });
    if (res.success) {
      rechargeRecords.value = res.data?.items || [];
      totalRecords.value = res.data?.total || 0;
    } else {
      showToast('获取充值记录失败', true);
    }
  } catch (e) {
    console.error('[Recharge] fetchRechargeRecords error:', e);
    showToast('获取充值记录失败', true);
  } finally {
    loadingRecords.value = false;
  }
}

// Change page
function changePage(page) {
  currentPage.value = page;
  fetchRechargeRecords();
}

// Get total pages
const totalPages = computed(() => {
  return Math.ceil(totalRecords.value / pageSize.value) || 1;
});

// Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get payment method display name
function getPaymentMethodName(method) {
  const methodMap = {
    'alipay': '支付宝',
    'wechat': '微信支付',
    'stripe': 'Stripe',
    'waffo': 'Waffo',
    'creem': 'Creem'
  };
  return methodMap[method] || method || '-';
}

onMounted(async () => {
  // userInfo 已在 App.vue 初始化，不需要重复获取
  // 并行加载充值信息和充值记录
  await Promise.all([
    fetchTopupInfo(),
    fetchRechargeRecords()
  ]);
});
</script>

<style scoped lang="scss">
@use '@renderer/public/assets/styles/mixins';

.recharge-recharge-view {
  padding: 16px;
}

.page-title {
  font-size: 24px;
  font-weight: 400;
  font-family: 'Manrope', sans-serif;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.recharge-balance-panel {
  @extend %card-base;
  padding: 16px;
  margin-bottom: 16px;
}

.recharge-balance-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.recharge-balance-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recharge-usage-bar-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recharge-usage-labels {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--text-secondary);
}

.recharge-usage-bar-bg {
  height: 12px;
  background: var(--surface);
  border-radius: 9999px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.recharge-usage-bar-fill {
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

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.recharge-balance-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.recharge-stat-item {
  background: var(--surface);
  border-radius: 8px;
  padding: 10px;
}

.recharge-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.recharge-stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #4fd183;
  text-align: center;

  .recharge-balance-symbol {
    font-size: 0.6em;
    margin-right: 3px;
    vertical-align: baseline;
  }
}

.recharge-balance-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 8px;
  font-size: 14px;
  color: #ff9800;
}

.recharge-warning-icon {
  font-size: 16px;
}

.recharge-tip-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
}

.recharge-tip-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.recharge-tip-content {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.recharge-recharge-panel {
  @extend %card-base;
  padding: 16px;
}

.recharge-recharge-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.recharge-section-label {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.recharge-amount-section {
  margin-bottom: 16px;
}

.recharge-amount-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.recharge-amount-btn {
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    border-color: var(--accent);
  }

  &.recharge-active {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
  }
}

.recharge-discount-tag {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ff6b35;
  color: white;
  font-size: 10px;
  font-weight: 400;
  padding: 2px 6px;
  border-radius: 9999px;
}

.recharge-custom-amount-section {
  margin-bottom: 16px;
}

.recharge-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recharge-form-input {
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

.recharge-input-suffix {
  color: var(--text-secondary);
  font-size: 14px;
}

.recharge-payment-section {
  margin-bottom: 16px;
}

.recharge-payment-tabs {
  display: flex;
  gap: 8px;
}

.recharge-payment-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--accent);
  }

  &.recharge-active {
    border-color: var(--accent);
    background: rgba(255, 107, 53, 0.1);
  }
}

.recharge-payment-icon {
  width:18px;
  height: 18px;

  &.wechat{
     width: 22px;
    height: 22px;
  }
}

.recharge-details {
  background: var(--surface);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.recharge-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--border);
  }

  &.conversion .recharge-detail-value {
    font-weight: 400;
    color: var(--text-secondary);
  }
}

.recharge-original-price {
  text-decoration: line-through;
  color: var(--text-secondary);
  font-weight: 400;
}

.recharge-discounted {
  color: #ff6b35;
  font-weight: 400;
}

.recharge-detail-discount {
  font-size: 12px;
  background: rgba(255, 107, 53, 0.1);
  color: #ff6b35;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 400;
}

.recharge-detail-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.recharge-detail-value {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
}

.recharge-btn-save {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--accent), #ff8f65);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 400;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
    box-shadow: 0 10px 20px -5px rgba(255, 107, 53, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.recharge-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.recharge-qrcode-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.recharge-qrcode-container {
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.recharge-qrcode-hint {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.recharge-btn-cancel {
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--surface-high);
    color: var(--text-primary);
  }
}

.recharge-btn-secondary {
  padding: 8px 16px;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.recharge-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.recharge-dialog {
  background: var(--surface);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.recharge-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 400;
  color: var(--text-primary);
}

.recharge-dialog-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background: var(--surface-high);
    color: var(--text-primary);
  }
}

.recharge-dialog-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recharge-url-display {
  padding: 12px;
  background: var(--surface-high);
  border-radius: 8px;
  font-size: 12px;
  word-break: break-all;
  color: var(--text-secondary);
  font-family: monospace;
}

.recharge-btn-copy {
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--accent), #ff8f65);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.recharge-dialog-iframe {
  max-width: 800px;
  width: 95%;
  height: 80vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.recharge-dialog-body-iframe {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.recharge-payment-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

// Recharge Records
.recharge-records-panel {
  @extend %card-base;
  padding: 16px;
  margin-top: 16px;
}

.recharge-records-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.recharge-records-title {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-primary);
}

.recharge-btn-refresh {
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.recharge-loading-spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.recharge-records-table-container {
  overflow-x: auto;
}

.recharge-records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 12px;
    background: var(--surface);
  }

  td {
    color: var(--text-primary);
  }

  tbody tr:hover {
    background: var(--surface);
  }
}

.recharge-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 400;

  &.recharge-status-success {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
  }

  &.recharge-status-pending {
    background: rgba(255, 152, 0, 0.1);
    color: #ff9800;
  }
}

.recharge-records-empty,
.recharge-records-loading {
  text-align: center;
  padding: 32px;
  color: var(--text-secondary);
  font-size: 14px;
}

.recharge-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.recharge-pagination-btn {
  padding: 6px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.recharge-pagination-info {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
