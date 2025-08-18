import { defineStore } from 'pinia'
import {
  listMovementReasons,
  createMovementReason,
  updateMovementReason,
  deleteMovementReason,
  type MovementReason,
} from '@/services/movementReasonsApi'

export const useMovementReasonsStore = defineStore('movementReasons', {
  state: () => ({
    reasons: [] as MovementReason[],
    loaded: false,
    loading: false,
  }),
  actions: {
    async ensureLoaded(force = false) {
      if (this.loaded && !force) return
      this.loading = true
      try {
        this.reasons = await listMovementReasons(true)
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    async addReason(input: { code: string; name: string; is_active?: boolean }) {
      const r = await createMovementReason(input)
      // if active-only list and r is inactive, we may skip adding; for simplicity, add if active
      if (r.is_active) this.reasons.push(r)
      return r
    },
    async patchReason(code: string, patch: { name?: string; is_active?: boolean }) {
      const r = await updateMovementReason(code, patch)
      const idx = this.reasons.findIndex((x) => x.code === code)
      if (idx !== -1) {
        if (r.is_active) this.reasons[idx] = r
        else this.reasons.splice(idx, 1) // activeOnly view – drop if now inactive
      } else if (r.is_active) {
        this.reasons.push(r)
      }
      return r
    },
    async removeReason(code: string) {
      await deleteMovementReason(code)
      const idx = this.reasons.findIndex((x) => x.code === code)
      if (idx !== -1) this.reasons.splice(idx, 1)
    },
  },
})
