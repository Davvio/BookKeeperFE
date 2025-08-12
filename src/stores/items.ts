import { defineStore } from 'pinia'
import { listItems, type Item } from '@/services/itemsApi'

type ItemsState = {
  items: Item[]
  loading: boolean
}

export const useItemsStore = defineStore('items', {
  state: (): ItemsState => ({
    items: [],
    loading: false,
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
    async refresh() {
      this.loading = true
      try {
        // Fetch only active items
        this.items = await listItems({ active: true })
      } finally {
        this.loading = false
      }
    },
  },
})
