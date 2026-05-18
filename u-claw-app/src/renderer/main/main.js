import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';

// 修复 iconfont 图标在按钮内点击无效的问题
// iconfont 的 ::before 伪元素在 Electron 中会拦截点击事件，导致按钮的 @click 不触发
// 通过捕获阶段全局代理，将图标点击转发到父级按钮
let clickForwarding = false;
document.addEventListener('click', (e) => {
  if (clickForwarding) return;
  const icon = e.target.closest('.iconfont');
  if (!icon) return;
  // 跳过自身需要点击的独立 iconfont（remove-btn / session-edit / session-delete）
  if (icon.classList.contains('remove-btn') ||
      icon.classList.contains('session-edit') ||
      icon.classList.contains('session-delete')) {
    return;
  }
  const btn = icon.closest('button');
  if (!btn || btn.disabled) return;
  e.stopPropagation();
  e.preventDefault();
  clickForwarding = true;
  btn.click();
  clickForwarding = false;
}, true);

const app = createApp(App);
app.use(createPinia());
app.use(router);

app.mount('#app');
window.uclaw?.ipcSend('window-ready');