import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import AIAssistant from '../views/AIAssistant.vue'

const routes = [
  {
    path: '/',
    name: 'AI Assistant',
    component: AIAssistant,
    meta: { title: 'AI Assistant' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Dashboard' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router