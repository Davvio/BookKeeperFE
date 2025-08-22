import { defineStore } from 'pinia'

export type ToastItem = {
  id: number
  text: string
  kind?: 'success' | 'error' | 'info'
  ms?: number
}
let _id = 1

export const useToast = defineStore('toast', {
  state: () => ({ items: [] as ToastItem[] }),
  actions: {
    push(text: string, kind: ToastItem['kind'] = 'info', ms = 2500) {
      const id = _id++
      this.items.push({ id, text, kind, ms })
      setTimeout(() => this.remove(id), ms)
    },
    remove(id: number) {
      this.items = this.items.filter((t) => t.id !== id)
    },
  },
})
