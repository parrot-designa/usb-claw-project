import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSkillsStore = defineStore('skills', () => {
  const allSkills = ref([]);

  function setAllSkills(skills) {
    allSkills.value = skills;
  }

  return { allSkills, setAllSkills };
});

export async function fetchAllSkills() {
  try {
    const result = await window.uclaw.ipcScanLocalSkills();
    console.log("扫描到的skill==>",result);
    if (result.ok) {
      const store = useSkillsStore();
      store.setAllSkills((result.skills || []).map(s => ({ ...s, enabled: s.enabled !== false })));
    }
  } catch (err) {
    console.error('[skills] 加载本地技能失败:', err);
  }
}