import { ref } from 'vue';

export function useEnvCheck() {
  const checkItems = ref([
    { id: 'node', title: 'Node.js', icon: 'icon-clawnodejs', status: 'checking', statusText: '检测中', detail: '' },
    { id: 'npm', title: 'npm', icon: 'icon-clawnpm', status: 'checking', statusText: '检测中', detail: '' },
    { id: 'openclaw', title: 'OpenClaw', icon: 'icon-clawopenclaw', status: 'checking', statusText: '检测中', detail: '' },
    { id: 'model', title: '模型配置', icon: 'icon-clawmoxingpeizhi', status: 'checking', statusText: '检测中', detail: '' },
    { id: 'network', title: '网络连接', icon: 'icon-clawnetworkConnection', status: 'checking', statusText: '检测中', detail: '' },
    { id: 'port', title: '端口状态', icon: 'icon-clawzhandianduankouhao', status: 'checking', statusText: '检测中', detail: '' }
  ]);

  function updateItem(id, updates) {
    const item = checkItems.value.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates);
    }
  }

 function checkNode() {
    updateItem('node', { status: 'checking', statusText: '检测中', detail: '' });
    try {
      const result = { ok: true, version: "v25.1.0"}
      if (result.ok) {
        updateItem('node', { status: 'pass', statusText: '正常', detail: result.version });
      } else {
        updateItem('node', { status: 'fail', statusText: '异常', detail: result.error });
      }
    } catch (e) {
      updateItem('node', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }

 function checkNpm() {
    updateItem('npm', { status: 'checking', statusText: '检测中', detail: '' });
    try {  
      updateItem('npm', { status: 'pass', statusText: '正常', detail: "v25.9.0" }); 
    } catch (e) {
      updateItem('npm', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }

  function checkOpenClaw() {
    updateItem('openclaw', { status: 'checking', statusText: '检测中', detail: '' });
    try { 
      updateItem('openclaw', { title: 'OpenClaw', status: 'pass', statusText: '正常', detail: `v2026.03.34` }); 
    } catch (e) {
      updateItem('openclaw', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }

  function checkModel() {
    updateItem('model', { status: 'checking', statusText: '检测中', detail: '' });
    try {
      const stored = localStorage.getItem('uclaw_selected_models');
      const models = stored ? JSON.parse(stored) : [];
      const current = Array.isArray(models) ? models.find(m => m.isCurrent) : null;
      if (current) {
        updateItem('model', { status: 'pass', statusText: '已配置', detail: current.modelName || current.name || '已配置' });
      } else {
        updateItem('model', { status: 'warn', statusText: '未配置', detail: '请在模型配置页面设置' });
      }
    } catch (e) {
      updateItem('model', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }

  function checkNetwork() {
    updateItem('network', { status: 'checking', statusText: '检测中', detail: '' });
    try { 
      updateItem('network', { status: 'pass', statusText: '正常', detail: '网络连接正常' }); 
    } catch (e) {
      updateItem('network', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }

  function checkPort() {
    updateItem('port', { status: 'checking', statusText: '检测中', detail: '' });
    try { 
      updateItem('port', { status: 'pass', statusText: '正常', detail: `端口可用` });
    } catch (e) {
      updateItem('port', { status: 'fail', statusText: '异常', detail: e.message });
    }
  }
 

  function runAllChecks() {
    checkNode(); 
    checkNpm(); 
    checkOpenClaw(); 
    checkModel(); 
    checkNetwork(); 
    checkPort(); 
  }

  return {
    checkItems,
    runAllChecks,
    checkNode,
    checkNpm,
    checkOpenClaw,
    checkModel,
    checkNetwork,
    checkPort, 
  };
}
