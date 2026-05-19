import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWechatStore = defineStore('wechat', () => {
  const status = ref('disconnected'); // disconnected | installing | scanning | connected | error
  const qrCodeUrl = ref('');
  const qrCodeAscii = ref('');

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

  return {
    status,
    qrCodeUrl,
    qrCodeAscii,
    setStatus,
    setQrCode,
    clearQrCode,
  };
});