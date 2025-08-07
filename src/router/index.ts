import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

const routes = [
  { path: '/login', component: () => import('../pages/LoginPage.vue') },
  {
    path: '/',
    component: () => import('../layouts/AppShell.vue'),
    children: [
      { path: '', component: () => import('../pages/DashboardBK.vue') },
      { path: 'trades', component: () => import('../pages/AllTrades.vue') },
      { path: 'create-trade', component: () => import('@/pages/CreateTrade.vue') },
    ],
    meta: { requiresAuth: true },
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _, next) => {
  const auth = useAuth()
  if (to.meta.requiresAuth && !auth.isLogged) next('/login')
  else next()
})

export default router
