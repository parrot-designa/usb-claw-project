import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSessionStore = defineStore('session', () => {
  const sessionCookie = ref(null);

  function setSessionCookie(cookie) {
    sessionCookie.value = cookie;
  }

  function clearSessionCookie() {
    sessionCookie.value = null;
  }

  return { sessionCookie, setSessionCookie, clearSessionCookie };
});