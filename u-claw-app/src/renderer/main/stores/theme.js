import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true);
  const scifiTheme = ref('space'); // 'none' | 'cyberpunk' | 'lcars' | 'space'

  function toggle() {
    isDark.value = !isDark.value;
    updateHtmlClass();
  }

  function setScifiTheme(theme) {
    scifiTheme.value = theme;
    updateHtmlClass();
  }

  function updateHtmlClass() {
    // 清除所有 sci-fi 主题类
    document.documentElement.classList.remove('cyberpunk', 'lcars', 'space', 'minimal');

    // 设置深/浅色
    if (isDark.value) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }

    // 设置科幻主题
    if (scifiTheme.value !== 'none') {
      document.documentElement.classList.add(scifiTheme.value);
    }
  }

  function init() {
    updateHtmlClass();
  }

  return { isDark, scifiTheme, toggle, setScifiTheme, init };
});