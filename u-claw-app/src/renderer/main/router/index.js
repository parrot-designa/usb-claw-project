import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Model from '../views/Model.vue';
import Skill from '../views/Skill.vue';
import Chat from '../views/Chat.vue';
import Contact from '../views/Contact.vue';
import Settings from '../views/Settings.vue';
import EnvCheck from '../views/EnvCheck.vue';
import Recharge from '../views/Recharge.vue';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/home', name: 'home', component: Home },
  { path: '/model', name: 'model', component: Model },
  { path: '/skill', name: 'skill', component: Skill },
  { path: '/chat', name: 'chat', component: Chat },
  { path: '/contact', name: 'contact', component: Contact },
  { path: '/settings', name: 'settings', component: Settings },
  { path: '/recharge', name: 'recharge', component: Recharge },
  { path: '/env-check', name: 'env-check', component: EnvCheck },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;