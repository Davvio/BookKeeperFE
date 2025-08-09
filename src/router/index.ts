// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

const routes = [
  { path: '/login', component: () => import('@/pages/LoginPage.vue') },
  {
    path: '/',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/DashboardBK.vue') },

      { path: 'trades', component: () => import('@/pages/AllTrades.vue') },

      { path: 'create-trade', component: () => import('@/pages/CreateTrade.vue') },

      {
        path: 'admin',
        component: () => import('@/pages/AdminArea.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/items',
        component: () => import('../pages/ItemsCatalog.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/currency',
        component: () => import('@/pages/StructureValuta.vue'),
        meta: { roles: ['ADMIN'] },
      },
      {
        path: 'admin/valuations',
        component: () => import('@/pages/ItemValuations.vue'),
        meta: { roles: ['ADMIN'] },
      },

      {
        path: 'guild',
        component: () => import('../pages/GuildMaster.vue'),
        meta: { roles: ['GUILDMASTER'] },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _from, next) => {
  const auth = useAuth()
  if (!auth.token) auth.init()

  if (to.meta.requiresAuth && !auth.isLogged) return next('/login')

  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && !allowedRoles.includes(auth.role)) return next('/')

  next()
})

export default router
