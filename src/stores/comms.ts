// src/stores/comms.ts
import { defineStore } from 'pinia'

export const useComms = defineStore('comms', {
  state: () => ({
    selectedPartyId: null as number | null,
    selectedUserId: null as number | null,
    partiesVersion: 0, // 👈 new
  }),
  actions: {
    selectParty(id: number) {
      this.selectedPartyId = id
      this.selectedUserId = null
    },
    selectUser(id: number) {
      this.selectedUserId = id
      this.selectedPartyId = null
    },
    clear() {
      this.selectedPartyId = null
      this.selectedUserId = null
    },
    bumpPartiesVersion() {
      this.partiesVersion++
    },
  },
})
