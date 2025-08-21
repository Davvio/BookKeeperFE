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
      {
        path: 'minecraft/map',
        component: () => import('@/pages/MinecraftMapDep.vue'),
        meta: { requiresAuth: true },
      },
      { path: 'comms', component: () => import('../pages/CommsPage.vue') },

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
          { path: 'parties', component: () => import('../pages/AdminParties.vue') },
          { path: 'parties/:id', component: () => import('../pages/AdminPartyDetail.vue') },
          { path: 'messages', component: () => import('../pages/AdminMessageOutbox.vue') },
          { path: 'messages/compose', component: () => import('../pages/AdminMessageCompose.vue') },

          // { path: 'rbac-graph', component: () => import('@/pages/AdminRbacGraph.vue'), meta: { requiresAuth: true } },
        ],
      },

      {
        path: 'inventory',
        component: () => import('@/pages/Inventory.vue'),
        meta: { requiresAuth: true },
      },

      {
        path: '/inventory/players',
        component: () => import('@/pages/PlayerInventory.vue'),
        meta: { title: 'Player Inventory' },
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

router.beforeEach((to, from, next) => {
  const auth = useAuth()
  // Rehydrate once per app start (safe in guard)
  if (!auth.token) auth.initFromStorage()

  const needsAuth = to.meta?.requiresAuth || to.meta?.requiresAdmin
  const needsAdmin = to.meta?.requiresAdmin

  if (needsAuth && (!auth.isAuthenticated || auth.isExpired)) {
    const redirect = encodeURIComponent(to.fullPath)
    return next({ path: '/login', query: { redirect } })
  }
  if (needsAdmin && !auth.isAdmin) {
    return next({ path: '/' })
  }
  next()
})

export default router
