<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  items: any[]
  modelValue: string | number | null
  getLabel?: (x: any) => string
  getValue?: (x: any) => string | number
  placeholder?: string
  getIconUrl?: (x: any) => string | null | undefined // <— NEW (optional)
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const q = ref('')
const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const label = (x: any) => (props.getLabel ? props.getLabel(x) : String(x?.label ?? x?.name ?? x))
const value = (x: any) => (props.getValue ? props.getValue(x) : (x?.value ?? x?.id ?? x))

const filtered = computed(() =>
  (props.items || []).filter((i) => label(i).toLowerCase().includes(q.value.toLowerCase())),
)

function select(i: any) {
  emit('update:modelValue', value(i))
  open.value = false
}

function currentLabel() {
  const v = props.modelValue
  const hit = (props.items || []).find((i) => value(i) === v)
  return hit ? label(hit) : ''
}

function toggle() {
  open.value = !open.value
  if (open.value) q.value = ''
}

function onDocClick(e: MouseEvent) {
  const t = e.target as Node
  if (rootEl.value && !rootEl.value.contains(t)) open.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

watch(
  () => props.items,
  () => {
    if (!props.items || props.items.length === 0) open.value = false
  },
)

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="bk-select" ref="rootEl">
    <!-- Trigger -->
    <button
      type="button"
      class="bk-trigger"
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggle"
    >
      <span v-if="!currentLabel()" class="placeholder">{{ placeholder || 'Select…' }}</span>
      <span v-else>{{ currentLabel() }}</span>
      <img
        v-if="props.getIconUrl && props.getIconUrl(props.items[0])"
        :src="props.getIconUrl(props.items[0])!"
        class="bk-icon"
        alt=""
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span class="chev" aria-hidden="true"></span>
    </button>

    <!-- Menu -->
    <div v-if="open" class="bk-menu" role="listbox">
      <div class="bk-search">
        <input v-model="q" placeholder="Search…" />
      </div>

      <div class="bk-options">
        <div
          v-for="i in filtered"
          :key="String(value(i))"
          class="bk-option"
          role="option"
          :aria-selected="value(i) === modelValue ? 'true' : 'false'"
          @click="select(i)"
        >
          <img
            v-if="props.getIconUrl && props.getIconUrl(i)"
            :src="props.getIconUrl(i)!"
            class="bk-icon"
            alt=""
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
          {{ label(i) }}
        </div>

        <div v-if="filtered.length === 0" class="bk-empty">No results</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Root container */
.bk-select {
  position: relative;
  width: 100%;
}

.bk-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: cover;
  margin-right: 6px;
}

/* Trigger button */
.bk-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 10px;
  padding: 10px 36px 10px 12px;

  cursor: pointer;
  text-align: left;
  outline: none;
}
.bk-trigger:hover {
  border-color: rgba(255, 255, 255, 0.2);
}
.bk-trigger:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.35);
}
.bk-trigger .placeholder {
  color: var(--text-muted);
}

/* Chevron */
.chev {
  position: absolute;
  right: 10px;
  width: 14px;
  height: 14px;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffffff' d='M7 10l5 5 5-5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.9;
}

/* Dropdown menu */
.bk-menu {
  position: absolute;
  z-index: 1000;
  margin-top: 6px;
  width: 100%;

  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 12px;
  box-shadow: var(--panel-shadow, 0 12px 24px rgba(0, 0, 0, 0.35));
  overflow: hidden;
}

/* Search box */
.bk-search {
  padding: 8px;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
}
.bk-search input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  background: var(--bg-tertiary);
  color: var(--text-primary);
  outline: none;
}
.bk-search input::placeholder {
  color: var(--text-muted);
}
.bk-search input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(92, 106, 196, 0.25);
}

/* Options list */
.bk-options {
  max-height: 280px;
  overflow: auto;
}
.bk-option {
  padding: 8px 10px;
  cursor: pointer;
}
.bk-option:hover {
  background: var(--accent-tint, rgba(92, 106, 196, 0.18));
}
.bk-option[aria-selected='true'] {
  background: rgba(92, 106, 196, 0.28);
}
.bk-empty {
  padding: 10px;
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
}
</style>
