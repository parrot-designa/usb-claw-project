import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWechatStore = defineStore('wechat', () => {
  const connected = ref(false);
  const connecting = ref(false);
  const scanStep = ref('idle'); // 'idle' | 'loading' | 'qr' | 'refreshing' | 'success'
  const qrCodeUrl = ref('');
  const qrCodeAscii = ref('');

  function setConnected(value) {
    connected.value = value;
  }

  function setConnecting(value) {
    connecting.value = value;
  }

  function setScanStep(step) {
    scanStep.value = step;
  }

  function setQrCode(url, ascii) {
    qrCodeUrl.value = url;
    qrCodeAscii.value = ascii;
  }

  function clearQrCode() {
    qrCodeUrl.value = '';
    qrCodeAscii.value = '';
  }

  function setRefreshing(value) {
    if (value) {
      scanStep.value = 'refreshing';
      clearQrCode();
    }
  }

  return {
    connected,
    connecting,
    scanStep,
    qrCodeUrl,
    qrCodeAscii,
    setConnected,
    setConnecting,
    setScanStep,
    setQrCode,
    clearQrCode,
    setRefreshing,
  };
});