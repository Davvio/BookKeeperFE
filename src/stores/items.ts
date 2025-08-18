import { defineStore } from 'pinia'
import { listItems, type Item } from '@/services/itemsApi'

type ItemsState = {
  items: Item[]
  loading: boolean
  iconBust: Record<number, number>
}

export const useItemsStore = defineStore('items', {
  state: (): ItemsState => ({
    items: [] as {
      id: number
      name: string
      code: string
      category: string
      stack_size: number
      is_active: boolean
    }[],
    loading: false,
    iconBust: {}, // << new
  }),
  getters: {
    byId: (s): Record<number, Item> => {
      const map: Record<number, Item> = {}
      for (let i = 0; i < s.items.length; i++) {
        const it = s.items[i]
        map[it.id] = it
      }
      return map
    },
  },
  actions: {
    async ensureLoaded(force = false) {
      if (!force && this.items.length) return
      this.loading = true
      try {
        this.items = await listItems()
      } finally {
        this.loading = false
      }
    },

    async fetchAll(force = false) {
      return this.ensureLoaded(force)
    },

    async refresh() {
      this.loading = true
      try {
        // Fetch only active items
        this.items = await listItems({ active: true })
      } finally {
        this.loading = false
      }
    },

    // << new: call this after a successful icon upload
    bumpIcon(id: number) {
      this.iconBust[id] = Date.now()
    },
  },
})
