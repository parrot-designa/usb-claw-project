import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useActivationStore = defineStore('activation', () => {
  const activated = ref(true);
  const username = ref('');
  const userId = ref('');
  const group = ref('');

  function setActivation(data) {
    activated.value = true;
    username.value = data.username || '';
    userId.value = data.user_id || '';
    group.value = data.group || '';
  }

  function clearActivation() {
    activated.value = false;
    username.value = '';
    userId.value = '';
    group.value = '';
  }

  return { activated, username, userId, group, setActivation, clearActivation };
});