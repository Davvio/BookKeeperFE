<script setup lang="ts">
import { ref } from 'vue'
import { uploadItemIcon, getItemIconUrl } from '@/services/itemsApi'
import { useItemsStore } from '@/stores/items'

type Item = { id: number; name: string }

const props = defineProps<{ item: Item }>()
const itemsStore = useItemsStore()

const inputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const imgError = ref(false)

function openPicker() {
  inputRef.value?.click()
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  try {
    uploading.value = true
    await uploadItemIcon(props.item.id, f)
    itemsStore.bumpIcon(props.item.id) // cache-bust preview
    imgError.value = false
  } catch {
    // no-op; optionally toast
  } finally {
    uploading.value = false
    if (inputRef.value) inputRef.value.value = ''
  }
}
</script>

<template>
  <div class="icon-cell">
    <img
      :src="getItemIconUrl(item.id, itemsStore.iconBust[item.id])"
      alt=""
      class="icon"
      @error="imgError = true"
      v-show="!imgError"
    />
    <div v-if="imgError" class="placeholder">{{ item.name[0]?.toUpperCase() }}</div>

    <button class="btn btn--sm" :disabled="uploading" @click="openPicker">
      {{ uploading ? 'Uploading…' : 'Upload' }}
    </button>
    <input ref="inputRef" type="file" accept="image/*" class="hidden" @change="onFile" />
  </div>
</template>

<style scoped>
.icon-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--bg-tertiary);
}
.placeholder {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 600;
  border: 1px solid var(--bg-tertiary);
}
.btn.btn--sm {
  padding: 4px 8px;
  font-size: 0.85rem;
}
.hidden {
  display: none;
}
</style>
