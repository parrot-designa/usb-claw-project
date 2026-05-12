import { ref, onUnmounted } from 'vue';
import { useGatewayStore } from '../stores/gateway';
import { useToast } from './useToast';


export function useGateway() {
  const store = useGatewayStore();
  const { showToast } = useToast();
  const loading = ref(false);

  let bootPhaseHandler = null;
  let statusHandler = null;

  function setupStatusListener() {
    if (statusHandler) return;
    statusHandler = (data) => {
      store.setRunning(data.running);
      if (data.port) {
        store.setPort(data.port);
      }
    };
    window.uclaw.onGatewayStatus(statusHandler);
  }

  function cleanupStatusListener() {
    if (statusHandler) {
      window.uclaw.offGatewayStatus(statusHandler);
      statusHandler = null;
    }
  }

  function setupBootPhaseListener() {
    if (bootPhaseHandler) return;
    bootPhaseHandler = (data) => {
      const { phase, title, detail, progress } = data;
      window.updateLoadingProgress?.(progress, title, detail);
      if (phase === 'done') {
        window.hideLoadingOverlayVue?.();
      }else if(phase === 'error'){
        setTimeout(()=>{
          window.hideLoadingOverlayVue?.();
        },1000);
      }
    };
    window.uclaw.onGatewayBootPhase(bootPhaseHandler);
  }

  function cleanupBootPhaseListener() {
    if (bootPhaseHandler) {
      window.uclaw.offGatewayBootPhase(bootPhaseHandler);
    }
  }

  onUnmounted(() => {
    cleanupBootPhaseListener();
    cleanupStatusListener();
  });

  // 提前注册监听，确保启动过程中的事件不被错过
  setupBootPhaseListener();
  setupStatusListener();

  async function startGatewayHook() {
    loading.value = true;
    try {  
      if (store.running) {  
        showToast("当前网关处于运行状态...");
        return ; 
      } 
      const result = await window.uclaw.ipcStartGateway();
      if (!result.ok) {
        throw new Error(result.error);
      }
    } catch (e) { 
      window.updateLoadingProgress?.(0, '启动失败', e.message); 
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function stopGatewayHook() { 
    await window.uclaw.ipcStopGateway(); 
  } 

  return { loading, startGatewayHook, stopGatewayHook };
}
