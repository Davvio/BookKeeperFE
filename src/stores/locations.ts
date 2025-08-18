import { defineStore } from 'pinia'
import { listLocations, type Location } from '@/services/locationsApi'

type LocState = {
  locations: Location[]
  loading: boolean
}

export const useLocationsStore = defineStore('locations', {
  state: (): LocState => ({
    locations: [],
    loading: false,
  }),
  getters: {
    byId: (s) => {
      const map: Record<number, Location> = {}
      for (let i = 0; i < s.locations.length; i++) {
        const loc = s.locations[i]
        map[loc.id] = loc
      }
      return map
    },
  },
  actions: {
    async refresh(onlyActive = true) {
      this.loading = true
      try {
        this.locations = await listLocations(onlyActive)
      } finally {
        this.loading = false
      }
    },

    async ensureLoaded(force = false) {
      if (!force && this.locations.length) return
      this.loading = true
      try {
        this.locations = await listLocations()
      } finally {
        this.loading = false
      }
    },

    async fetchAll(force = false) {
      return this.ensureLoaded(force)
    },
  },
})
