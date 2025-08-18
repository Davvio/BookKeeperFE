<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script setup lang="ts">
import BkSelect from '@/components/BkSelect.vue'
import type { Location } from '@/services/locationsApi'
import type { UserLite } from '@/services/usersApi'

type Party = 'location' | 'user'

const props = defineProps<{
  party: Party
  locationId: number | null
  userId: number | null
  locations: Location[]
  users: UserLite[]
  // labels / placeholders (optional)
  sideLabel?: string // "From" | "To"
  locationPlaceholder?: string // default: "Use header"
  userPlaceholder?: string // default: "Select user…"
}>()

const emit = defineEmits<{
  (e: 'update:party', v: Party): void
  (e: 'update:locationId', v: number | null): void
  (e: 'update:userId', v: number | null): void
}>()

function setParty(v: Party) {
  // Clear opposite field on switch to keep XOR clean
  if (v === 'location') emit('update:userId', null)
  else emit('update:locationId', null)
  emit('update:party', v)
}

function getLocValue(loc: Location) {
  return loc.id
}
function getUserValue(u: UserLite) {
  return u.id
}

const partyOptions = [
  { label: 'Location', value: 'location' },
  { label: 'User', value: 'user' },
]
</script>

<template>
  <div class="ps flex gap-2 items-stretch">
    <BkSelect
      :items="partyOptions"
      :modelValue="party"
      @update:modelValue="setParty($event as Party)"
      :getLabel="(x: any) => x.label"
      :getValue="(x: any) => x.value"
      :placeholder="sideLabel ? sideLabel : 'Side…'"
      class="ps-party"
    />
    <BkSelect
      v-if="party === 'location'"
      :items="locations"
      :modelValue="locationId"
      @update:modelValue="emit('update:locationId', $event as number | null)"
      :getLabel="(loc: Location) => loc.name"
      :getValue="getLocValue"
      :placeholder="locationPlaceholder ?? 'Use header'"
      class="ps-picker"
    />
    <BkSelect
      v-else
      :items="users"
      :modelValue="userId"
      @update:modelValue="emit('update:userId', $event as number | null)"
      :getLabel="(u: UserLite) => u.username"
      :getValue="getUserValue"
      :placeholder="userPlaceholder ?? 'Select user…'"
      class="ps-picker"
    />
  </div>
</template>

<style scoped>
.ps :deep(.bkselect) {
  min-width: 140px;
}
.ps-party {
  width: 130px;
}
.ps-picker {
  flex: 1;
}
</style>
