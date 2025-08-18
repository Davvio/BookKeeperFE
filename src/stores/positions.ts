/* eslint-disable @typescript-eslint/no-explicit-any */
// src/stores/positions.ts
import { defineStore } from 'pinia'
import { startPollingPositions, type PositionEvent } from '@/services/positions'
import { useAuth } from '@/stores/auth'
import { listUsers } from '@/services/usersApi' // full users (includes profile)

export type PlayerState = {
  username: string
  x: number
  y: number
  z: number
  ts: string
  user_id: number | null // internal user (same structure) when mapped via minecraft_username
}

type UsersMap = Record<string, { user_id: number; structure_id: number }>

function safeParseBool(v: string | null, fallback: boolean) {
  if (v === null) return fallback
  if (v === '1' || v.toLowerCase() === 'true') return true
  if (v === '0' || v.toLowerCase() === 'false') return false
  return fallback
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export const usePositions = defineStore('positions', {
  state: () => ({
    playersByName: {} as Record<string, PlayerState>,
    pollingStopper: null as null | (() => void),
    lastUpdateAt: 0 as number,
    status: 'idle' as 'idle' | 'connecting' | 'open' | 'closed',
    // filters
    q: '' as string,
    onlineOnly: true as boolean,
    // user mapping for this structure only
    usersMap: {} as UsersMap,
  }),
  getters: {
    recentThresholdSec(): number {
      const env = import.meta.env.VITE_RECENT_SECONDS
      const n = env ? parseInt(String(env), 10) : 60
      return isNaN(n) ? 60 : n
    },
    isZPositiveDown(): boolean {
      const env = import.meta.env.VITE_MAP_Z_INCREASES_DOWN as string | undefined | null
      return safeParseBool(env ? String(env) : '1', true)
    },
    playersArray(state): PlayerState[] {
      const arr: PlayerState[] = []
      const dict = state.playersByName
      for (const k in dict) arr.push(dict[k])
      return arr
    },
    filteredPlayers(): PlayerState[] {
      const now = Date.now()
      const q = this.q.trim().toLowerCase()
      const only = this.onlineOnly
      const recentMs = this.recentThresholdSec * 1000
      const arr = this.playersArray.filter((p) => {
        if (q.length > 0) {
          if (p.username.toLowerCase().indexOf(q) === -1) return false
        }
        if (only) {
          const age = now - Date.parse(p.ts)
          if (age > recentMs) return false
        }
        return true
      })
      // structure-scope hard filter: only players mapped to current structure (user_id not null)
      const scoped = arr.filter((p) => p.user_id !== null)
      return scoped
    },
    onlineCount(): number {
      return this.filteredPlayers.length
    },
  },
  actions: {
    async loadUserMappingForStructure() {
      // Build {minecraft_username -> user_id} for the current structure only
      const auth = useAuth()
      const users = await listUsers()
      const map: UsersMap = {}
      for (let i = 0; i < users.length; i++) {
        const u = users[i]
        // expect u.structure_id === auth.structure_id
        if (String(u.structure_id) !== String(auth.structure_id)) continue
        if (u.profile && u.profile.minecraft_username && u.profile.minecraft_username.length > 0) {
          const key = String(u.profile.minecraft_username).toLowerCase()
          map[key] = { user_id: u.id, structure_id: u.structure_id }
        }
      }
      this.usersMap = map
    },
    upsertPositions(rows: PositionEvent[]) {
      const next = { ...this.playersByName }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const key = r.username.toLowerCase()
        const existing = next[key]
        const mapped = this.usersMap[key]
        const beUserId = (r as any).user_id
        const userId =
          typeof beUserId === 'number' || beUserId === null
            ? (beUserId as number | null)
            : mapped
              ? mapped.user_id
              : null
        const rec: PlayerState = {
          username: r.username,
          x: r.x,
          y: r.y,
          z: r.z,
          ts: r.ts,
          user_id: userId,
        }
        if (existing) next[key] = rec
        else next[key] = rec
      }
      this.playersByName = next
      this.lastUpdateAt = Date.now()
    },
    start() {
      if (this.pollingStopper) return
      this.status = 'connecting'
      const url = String(import.meta.env.VITE_MOD_POSITIONS_URL || '')
      const intervalMs = parseInt(String(import.meta.env.VITE_MOD_POLL_MS || '4000'), 10)
      const stop = startPollingPositions(
        (rows) => {
          this.upsertPositions(rows)
          this.status = 'open'
        },
        url,
        isNaN(intervalMs) ? 4000 : intervalMs,
      )
      this.pollingStopper = stop
    },
    async init() {
      // Must be called on page mount
      await this.loadUserMappingForStructure()
      this.start()
    },
    // -------- DEMO MODE (FE-only) --------
    startDemo(bounds: { width: number; height: number }) {
      if (this.pollingStopper) return
      const intervalMs = parseInt(String(import.meta.env.VITE_MOD_POLL_MS || '1500'), 10)
      const halfW = Math.floor(bounds.width / 2)
      const halfH = Math.floor(bounds.height / 2)
      const margin = 24

      const auth = useAuth()

      // Coerce ids to numbers (and handle null/strings)
      const uid =
        typeof auth.user_id === 'number' ? auth.user_id : parseInt(String(auth.user_id), 10) || 0

      const sid =
        typeof auth.structure_id === 'number'
          ? auth.structure_id
          : parseInt(String(auth.structure_id), 10) || 0

      // Ensure demo names are considered "in this structure"
      const demoNames = ['Steve', 'Alex', 'Notch']
      const map: UsersMap = { ...this.usersMap }
      for (let i = 0; i < demoNames.length; i++) {
        const k = demoNames[i].toLowerCase()
        if (!map[k]) map[k] = { user_id: uid, structure_id: sid }
      }
      this.usersMap = map

      // random initial positions
      const pos: Record<string, { x: number; z: number; y: number }> = {}
      for (let i = 0; i < demoNames.length; i++) {
        pos[demoNames[i]] = {
          x: Math.floor(Math.random() * (halfW - margin * 2) * 2 - (halfW - margin)),
          z: Math.floor(Math.random() * (halfH - margin * 2) * 2 - (halfH - margin)),
          y: 64,
        }
      }

      const tick = () => {
        const nowIso = new Date().toISOString()
        const rows: PositionEvent[] = []
        for (let i = 0; i < demoNames.length; i++) {
          const name = demoNames[i]
          const p = pos[name]
          // random walk step
          const stepX = Math.floor(Math.random() * 61) - 30 // -30..+30 blocks
          const stepZ = Math.floor(Math.random() * 61) - 30
          p.x = clamp(p.x + stepX, -(halfW - margin), halfW - margin)
          p.z = clamp(p.z + stepZ, -(halfH - margin), halfH - margin)

          rows.push({ username: name, x: p.x, y: p.y, z: p.z, ts: nowIso })
        }
        this.upsertPositions(rows)
        this.status = 'open'
      }

      // run immediately, then interval
      tick()
      const timer = window.setInterval(tick, isNaN(intervalMs) ? 1500 : intervalMs)
      this.pollingStopper = () => window.clearInterval(timer)
    },
    stop() {
      if (this.pollingStopper) {
        this.pollingStopper()
        this.pollingStopper = null
      }
      this.status = 'closed'
    },
    clear() {
      this.playersByName = {}
      this.lastUpdateAt = 0
    },
  },
})
