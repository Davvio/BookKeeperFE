import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/magic-login/:token', component: () => import('@/pages/MagicLogin.vue') },
  { path: '/join-structure', component: () => import('@/pages/JoinStructure.vue') },

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
      { path: 'comms', component: () => import('../pages/CommsPage.vue') },
      {
        path: 'nations',
        component: () => import('@/pages/Nations.vue'),
        meta: { requiresAuth: true },
      },

      {
        path: 'locations',
        component: () => import('@/pages/LocationsPage.vue'),
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
        path: 'inventory',
        component: () => import('@/pages/InventoryWorkspace.vue'),
        meta: { requiresAuth: true },
      },

      // Catalogs & Admin
      {
        path: 'admin',
        component: () => import('@/pages/AdminArea.vue'),
        meta: { requiresAuth: true },
        children: [
          { path: '', redirect: '/admin/users-roles' },
          { path: 'users-roles', component: () => import('@/pages/AdminUsersRoles.vue') },
          { path: 'structure', component: () => import('@/pages/StructureValuta.vue') },
          {
            path: 'structure-codes',
            component: () => import('@/pages/admin/StructureManagement.vue'),
          },
          {
            path: 'player-management',
            component: () => import('@/pages/admin/PlayerManagement.vue'),
          },
          {
            path: 'unassigned-players',
            component: () => import('@/pages/admin/UnassignedPlayers.vue'),
          },
          {
            path: 'guest-requests',
            component: () => import('@/pages/admin/GuestManagement.vue'),
          },
          {
            path: 'movement-reasons',
            component: () => import('@/pages/AdminMovementReasons.vue'),
          },
          // {
          //   path: 'policies',
          //   component: () => import('@/pages/AdminPoliciesPlaceholder.vue'),
          // },
        ],
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuth()
  // Rehydrate once per app start (safe in guard)
  if (!auth.token) auth.initFromStorage()

  const needsAuth = to.meta?.requiresAuth

  // Check authentication only
  if (needsAuth && (!auth.isAuthenticated || auth.isExpired)) {
    const redirect = encodeURIComponent(to.fullPath)
    return next({ path: '/login', query: { redirect } })
  }

  next()
})

export default router
