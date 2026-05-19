import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWechatStore = defineStore('wechat', () => {
  const status = ref('disconnected'); // disconnected | installing | scanning | connected | error
  const qrCodeUrl = ref('');
  const qrCodeAscii = ref('');
  const logs = ref([]);
  const isInstalled = ref(null); // null=检测中, true/false=安装状态

  function setStatus(value) {
    status.value = value;
  }

  function setQrCode(url, ascii) {
    qrCodeUrl.value = url;
    qrCodeAscii.value = ascii;
  }

  function clearQrCode() {
    qrCodeUrl.value = '';
    qrCodeAscii.value = '';
  }

  function addLog(msg) {
    logs.value.push(msg);
  }

  function clearLogs() {
    logs.value = [];
  }

  async function checkInstalled() {
    try {
      isInstalled.value = await window.uclaw.isWechatPluginInstalled();
    } catch {
      isInstalled.value = false;
    }
  }

  return {
    status,
    qrCodeUrl,
    qrCodeAscii,
    logs,
    isInstalled,
    setStatus,
    setQrCode,
    clearQrCode,
    addLog,
    clearLogs,
    checkInstalled,
  };
});