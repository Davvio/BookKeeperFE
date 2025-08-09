<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!-- src/components/BkSelect.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
const props = defineProps<{
  items: any[]
  modelValue: string | number | null
  getLabel?: (x: any) => string
  getValue?: (x: any) => string | number
  placeholder?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()
const q = ref('')
const open = ref(false)
const label = (x: any) => (props.getLabel ? props.getLabel(x) : String(x?.label ?? x?.name ?? x))
const value = (x: any) => (props.getValue ? props.getValue(x) : (x?.value ?? x?.id ?? x))
const filtered = computed(() =>
  props.items.filter((i) => label(i).toLowerCase().includes(q.value.toLowerCase())),
)
function select(i: any) {
  emit('update:modelValue', value(i))
  open.value = false
}
function currentLabel() {
  const v = props.modelValue
  const hit = props.items.find((i) => value(i) === v)
  return hit ? label(hit) : ''
}
watch(
  () => props.items,
  () => {
    if (!props.items?.length) open.value = false
  },
)
</script>

<template>
  <div class="relative">
    <div class="border rounded px-3 py-2 cursor-pointer bg-white" @click="open = !open">
      <span class="opacity-70" v-if="!currentLabel()">{{ placeholder || 'Select…' }}</span>
      <span v-else>{{ currentLabel() }}</span>
    </div>
    <div v-if="open" class="absolute z-10 mt-1 w-full border rounded bg-white p-2 shadow">
      <input v-model="q" placeholder="Search…" class="w-full border rounded px-2 py-1 mb-2" />
      <div class="max-h-56 overflow-auto">
        <div
          v-for="i in filtered"
          :key="value(i)"
          class="px-2 py-1 hover:bg-gray-100 cursor-pointer"
          @click="select(i)"
        >
          {{ label(i) }}
        </div>
        <div v-if="filtered.length === 0" class="px-2 py-2 text-sm opacity-70">No results</div>
      </div>
    </div>
  </div>
</template>
