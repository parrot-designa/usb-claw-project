export function useToast() {
  function showToast(message, isError = false) {
    if (window.showToastVue) {
      window.showToastVue(message, isError);
    }
  }

  return { showToast };
}