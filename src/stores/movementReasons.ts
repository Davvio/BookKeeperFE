import { defineStore } from 'pinia'
import {
  listMovementReasons,
  createMovementReason,
  updateMovementReason,
  type MovementReason,
  type MovementReasonIn,
} from '@/services/movementReasonsApi'

export const useMovementReasonsStore = defineStore('movementReasons', {
  state: () => ({
    reasons: [] as MovementReason[],
    loaded: false,
    loading: false,
    activeOnly: true as boolean,
  }),

  actions: {
    async ensureLoaded(force = false, activeOnly?: boolean) {
      const useActiveOnly = activeOnly ?? this.activeOnly
      if (this.loaded && !force) return
      this.loading = true
      try {
        this.reasons = await listMovementReasons(useActiveOnly)
        this.loaded = true
        this.activeOnly = !!useActiveOnly
      } finally {
        this.loading = false
      }
    },

    async addReason(input: { code: string; name: string; is_active?: boolean }) {
      const payload: MovementReasonIn = {
        code: input.code,
        name: input.name,
        is_active: input.is_active ?? true,
      }
      const r = await createMovementReason(payload)
      if (!this.activeOnly || r.is_active) this.reasons.push(r)
      return r
    },

    async patchReason(
      currentCode: string,
      patch: { code?: string; name?: string; is_active?: boolean },
    ) {
      const orig = this.reasons.find((x) => x.code === currentCode)
      const body: MovementReasonIn = {
        code: patch.code ?? orig?.code ?? currentCode,
        name: patch.name ?? orig?.name ?? '',
        is_active: patch.is_active ?? orig?.is_active ?? true,
      }
      const r = await updateMovementReason(currentCode, body)
      const idx = this.reasons.findIndex((x) => x.code === currentCode || x.code === r.code)
      if (idx !== -1) {
        if (!this.activeOnly || r.is_active) this.reasons[idx] = r
        else this.reasons.splice(idx, 1)
      } else if (!this.activeOnly || r.is_active) {
        this.reasons.push(r)
      }
      return r
    },

    async removeReason(code: string) {
      const orig = this.reasons.find((x) => x.code === code)
      const name = orig?.name ?? ''
      const r = await updateMovementReason(code, { code, name, is_active: false })
      const idx = this.reasons.findIndex((x) => x.code === code)
      if (idx !== -1) this.reasons.splice(idx, 1)
      return r
    },
  },
})
