# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Server
```bash
npm run dev
```
Starts Vite dev server with hot-reload at http://localhost:5173

### Build
```bash
npm run build
```
Runs type-check and production build (outputs to `dist/`)

### Type Checking
```bash
npm run type-check
```
Runs vue-tsc in build mode to check TypeScript types across the project

### Linting & Formatting
```bash
npm run lint        # ESLint with auto-fix
npm run format      # Prettier on src/
```

## Architecture Overview

### Backend Integration
- **Base API URL**: Configured via `VITE_API_BASE_URL` or defaults to `localhost:8000` (dev) / `bookkeeperbe.onrender.com` (prod)
- **Proxy**: `/mc` endpoints proxied to `localhost:8000` in development (see vite.config.ts:16-20)
- **Authentication**: JWT-based with Bearer tokens; global 401 interceptor auto-redirects to `/login` (src/services/api.ts:17-40)

### State Management (Pinia Stores)
Located in `src/stores/`:
- **auth**: JWT token, user profile, role_codes, permissions, auto-logout on expiry (src/stores/auth.ts)
- **positions**: Real-time Minecraft player positions via HTTP polling; includes demo mode (src/stores/positions.ts)
- **comms**: Communication state (selected party/user) for messaging system (src/stores/comms.ts)
- **toast**: Global toast notifications (src/stores/toast.ts)
- **items, locations, movementReasons**: Domain-specific data stores

### Routing & Guards
- Router: `src/router/index.ts`
- **Auth guard**: Routes with `requiresAuth` or `requiresAdmin` meta require valid token (router.beforeEach:74-90)
- **Admin routes**: Nested under `/admin`, require `requiresAdmin: true` meta
- Auth store is rehydrated from localStorage on every guard check (router.beforeEach:77)

### API Services Pattern
All API calls use a centralized `api` instance from `src/services/api.ts`:
- Each domain has its own service file (e.g., `tradesApi.ts`, `inventoryApi.ts`, `messagesApi.ts`)
- Services export typed functions and interfaces
- Token is automatically attached via request interceptor (api.ts:19-23)

### Component Structure
- **Layouts**: `src/layouts/AppShell.vue` - main authenticated layout with sidebar + topbar
- **Pages**: `src/pages/*` - route-level components (e.g., DashboardBK, CreateTrade, CommsPage)
- **Components**:
  - `src/components/` - reusable components (BkSelect, ItemIconCell, PartySelect, etc.)
  - `src/components/comms/` - messaging/party components (InboxView, MessageComposer, PartyEditor)
  - `src/components/ui/` - UI primitives (ToastHost, ConfirmDialog)

### Styling
- **UnoCSS**: Utility-first CSS using Tailwind v3 preset (preset-wind3)
- **CSS Variables**: Theme colors defined in `src/styles/theme.css` (e.g., `--bg-primary`, `--text-primary`)
- Use utility classes in templates; reference CSS vars for custom styles

### Special Features
- **Minecraft Integration**:
  - Real-time player position tracking via HTTP polling (`/mc/positions/snapshot`)
  - Message delivery system with multiple kinds (CHAT, TITLE, ACTIONBAR, BOSSBAR)
  - Player-to-structure mapping via `minecraft_username` field
- **Map Visualization**: Leaflet-based map for player positions (config in .env)
- **Inventory System**: Applied Energistics-style grid component (src/components/InventoryAeGrid.vue)
- **Party/Messaging**: Multi-recipient messaging with delivery status tracking

### Path Aliases
`@` resolves to `src/` (configured in vite.config.ts:26 and tsconfig.json:14)

## Key Patterns

### Authentication Flow
1. Login via `POST /auth/login` or `POST /auth/mc/login` (Minecraft variant)
2. Store token + user data in Pinia auth store
3. Auth store persists to localStorage with key `auth_v1`
4. Auto-rehydrate on app init (main.ts:22) and route guards (router/index.ts:77)
5. Token expiry auto-logout via scheduled timeout (auth.ts:174-187)

### API Error Handling
- 401 responses globally handled by interceptor: clears auth, redirects to `/login?redirect=...`
- Prevent loops: if already on `/login`, just clear state without redirect (api.ts:33)

### Role-Based Access Control
- **Roles**: Stored as `role_codes` array (e.g., `['admin', 'GUILDMASTER']`)
- **Permissions**: Stored as `permissions` object with boolean flags
- **Helpers**: `auth.isAdmin`, `auth.can('perm.key')`, `auth.hasRole('GUILDMASTER')`
- Admin routes check `auth.isAdmin` (users.admin permission or 'admin' role)

### Environment Variables
All prefixed with `VITE_`:
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_MAP_IMAGE_URL`, `VITE_MAP_Z_INCREASES_DOWN`: Map configuration
- `VITE_MOD_POSITIONS_URL`, `VITE_MOD_POLL_MS`: Player position polling
- `VITE_POSITIONS_DEMO`: Enable demo mode (0/1)
- `VITE_RECENT_SECONDS`: Threshold for "online" player status (default: 60)

## Node Version
Requires Node.js `^20.19.0 || >=22.12.0` (see package.json:6-8)
