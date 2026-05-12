import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGatewayStore = defineStore('gateway', () => {
  const running = ref(false);
  const port = ref(null);
  const envCheckResults = ref(null);
  const logs = ref([]);

  function setRunning(isRunning) {
    running.value = isRunning;
  }

  function setPort(p) {
    port.value = p;
  }

  function setEnvCheckResults(results) {
    envCheckResults.value = results;
  }

  function addLog(log) {
    logs.value.push(log);
  }

  function clearLogs() {
    logs.value = [];
  }

  return { running, port, envCheckResults, logs, setRunning, setPort, setEnvCheckResults, addLog, clearLogs };
});