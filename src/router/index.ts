/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/pages/LoginPage.vue') },

  {
    path: '/',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/DashboardBK.vue') },

      // Core
      {
        path: 'trades',
        component: () => import('@/pages/AllTrades.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'create-trade',
        component: () => import('@/pages/CreateTrade.vue'),
        meta: { requiresAuth: true },
      },

      // Catalogs & Admin
      {
        path: '/admin',
        component: () => import('@/pages/AdminArea.vue'), // the layout with sidebar
        meta: { requiresAuth: true },
        children: [
          {
            path: '',
            component: () => import('@/pages/AdminUsersRoles.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'items',
            component: () => import('@/pages/ItemsCatalog.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'valuations',
            component: () => import('@/pages/ItemValuations.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'structure-currency',
            component: () => import('@/pages/StructureValuta.vue'),
            meta: { requiresAuth: true },
          },
          {
            path: 'admin/movement-reasons',
            name: 'AdminMovementReasons',
            meta: {
              requiresAuth: true,
            },
            component: () => import('@/pages/AdminMovementReasons.vue'),
          },
          // { path: 'rbac-graph', component: () => import('@/pages/AdminRbacGraph.vue'), meta: { requiresAuth: true } },
        ],
      },

      {
        path: 'inventory',
        component: () => import('@/pages/Inventory.vue'),
        meta: { requiresAuth: true },
      },

      // Optional page
      {
        path: 'guild',
        component: () => import('@/pages/GuildMaster.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _from, next) => {
  const auth = useAuth()
  if (!auth.token) auth.init()

  if (to.meta && (to.meta as any).requiresAuth && !auth.isLogged) {
    next('/login')
    return
  }

  const needPerm = (to.meta as any)?.needPerm as string | undefined
  if (needPerm && !auth.can(needPerm)) {
    // no permission: send to dashboard
    next('/')
    return
  }

  next()
})

export default router
