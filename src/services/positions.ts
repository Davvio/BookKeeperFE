/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/positions.ts
import { api } from '@/services/api' // used only for auth header reuse
import { useAuth } from '@/stores/auth'

export type PositionEvent = {
  username: string
  x: number
  y: number
  z: number
  ts: string // ISO
  world?: string
  dimension?: string
}

export type SnapshotResponse = PositionEvent[]

// Poll the external mod API (no CORS cookies, just GET JSON). We still inject Authorization if your BE proxies in future.
export function startPollingPositions(
  onData: (rows: SnapshotResponse) => void,
  url: string,
  intervalMs: number,
) {
  let timer: number | null = null
  let isStopped = false

  const fetchOnce = async () => {
    if (isStopped) return
    try {
      const auth = useAuth()
      const headers: Record<string, string> = {}
      // Reuse current JWT if present (useful if you point url to your BE later)
      if (auth.token && auth.token.length > 0) headers['Authorization'] = 'Bearer ' + auth.token

      // NOTE: using fetch to avoid axios baseURL & interceptors; URL is absolute (external mod)
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Positions fetch failed: ' + res.status)
      const data = (await res.json()) as SnapshotResponse
      if (data && data.length >= 0) onData(data)
    } catch (err) {
      // Swallow errors in demo; UI shows connection state separately
      // console.warn(err)
    }
  }

  // kick immediately, then at interval
  fetchOnce()
  timer = window.setInterval(fetchOnce, intervalMs)

  return () => {
    isStopped = true
    if (timer !== null) {
      window.clearInterval(timer)
    }
  }
}
