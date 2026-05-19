import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useWechatStore = defineStore('wechat', () => {
  const connected = ref(false);
  const connecting = ref(false);
  const qrCodeUrl = ref('');
  const qrCodeAscii = ref('');

  function setConnected(value) {
    connected.value = value;
  }

  function setConnecting(value) {
    connecting.value = value;
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
    connected,
    connecting,
    qrCodeUrl,
    qrCodeAscii,
    setConnected,
    setConnecting,
    setQrCode,
    clearQrCode,
  };
});