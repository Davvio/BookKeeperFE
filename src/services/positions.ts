/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/positions.ts
import { useAuth } from '@/stores/auth'

export type PositionEvent = {
  username: string
  x: number
  y: number
  z: number
  ts: string
  uuid?: string
  user_id?: number | null
}

/**
 * Polls the backend snapshot endpoint on an interval, including the admin JWT.
 * Calls onData with a normalized array, even if the response is empty.
 */
export function startPollingPositions(
  onData: (rows: PositionEvent[]) => void,
  url: string,
  intervalMs = 4000,
) {
  let stopped = false
  let timer: number | undefined

  const tick = async () => {
    if (stopped) return
    try {
      const auth = useAuth()
      const headers: Record<string, string> = {}
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`

      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()

      const rows: PositionEvent[] = Array.isArray(payload)
        ? payload.map((r: any) => ({
            username: String(r.username ?? r.name ?? ''),
            x: Number(r.x ?? 0),
            y: Number(r.y ?? 0),
            z: Number(r.z ?? 0),
            ts: String(r.ts ?? r.last_seen_at ?? new Date().toISOString()),
            uuid: r.uuid ?? undefined,
            user_id:
              typeof r.user_id === 'number' ? r.user_id : r.user_id === null ? null : undefined,
          }))
        : []

      onData(rows) // <- triggers status 'open' in the store
    } catch (err) {
      console.error('[positions] poll error', err)
      // still notify so UI can recover on next tick
      onData([])
    } finally {
      timer = window.setTimeout(tick, intervalMs) as unknown as number
    }
  }

  tick()
  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
  }
}
