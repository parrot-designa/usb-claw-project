import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true);

  function toggle() {
    isDark.value = !isDark.value;
    updateHtmlClass();
  }

  function updateHtmlClass() {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }

  function init() {
    updateHtmlClass();
  }

  return { isDark, toggle, init };
});