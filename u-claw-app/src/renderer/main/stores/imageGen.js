import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useImageGenStore = defineStore('imageGen', () => {
  const revisedPrompt = ref('');

  function setRevisedPrompt(prompt) {
    revisedPrompt.value = prompt;
  }

  return {
    revisedPrompt,
    setRevisedPrompt,
  };
});
