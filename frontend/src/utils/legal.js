// frontend/src/utils/legal.js
// Informations légales (éditeur, hébergeur…) configurées côté serveur (variables LEGAL_*)
import { ref } from 'vue'
import { api } from './api'

const info = ref(null)
let loading = null

export function useLegalInfo() {
  if (!info.value && !loading) {
    loading = api('/api/legal')
      .then(data => (info.value = data))
      .catch(() => (info.value = { editor: {}, host: {} }))
  }
  return info
}

// Valeur ou mention à compléter
export const orTodo = v => v || '[à compléter]'
