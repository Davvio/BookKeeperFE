<!-- src/components/comms/PartyEditor.vue -->
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import Modal from '@/components/BaseModal.vue'
import { createParty, updateParty } from '@/services/partiesApi'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  // 👇 allow a minimal party object: { id, name, description? }
  party?: { id: number; name?: string; description?: string | null } | null
}>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const name = ref('')
const description = ref('')

watchEffect(() => {
  if (props.mode === 'edit' && props.party) {
    name.value = props.party.name || ''
    description.value = props.party.description || ''
  } else {
    name.value = ''
    description.value = ''
  }
})

async function save() {
  if (!name.value.trim()) return
  if (props.mode === 'create') {
    await createParty({ name: name.value.trim(), description: description.value.trim() || null })
  } else if (props.party) {
    await updateParty(props.party.id, {
      name: name.value.trim(),
      description: description.value.trim() || null,
    })
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <Modal :open="open" @close="emit('close')">
    <h3 class="text-lg mb-3">{{ mode === 'create' ? 'New Party' : 'Edit Party' }}</h3>
    <div class="space-y-2">
      <label class="block text-sm">Name</label>
      <input
        v-model="name"
        class="w-full max-w-full min-w-0 block py-2 rounded bg-[var(--bg-tertiary)] outline-none"
      />
      <label class="block text-sm mt-2">Description</label>
      <textarea
        v-model="description"
        class="w-full max-w-full min-w-0 block py-2 rounded bg-[var(--bg-tertiary)] outline-none min-h-[90px]"
      />
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <button class="px-0 py-2 rounded bg-[var(--bg-tertiary)]" @click="$emit('close')">
        Cancel
      </button>
      <button class="px-0 py-2 rounded bg-[var(--accent)] text-[var(--bg-primary)]" @click="save">
        Save
      </button>
    </div>
  </Modal>
</template>
