// frontend/src/stores/ui.js
// Notifications (toasts) et boîtes de confirmation, en remplacement de alert()/confirm()
import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextId = 1

export const useUiStore = defineStore('ui', () => {
  const toasts = ref([])
  const dialog = ref(null)

  function toast(message, type = 'info', duration = 3500) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => dismiss(id), duration)
  }
  const success = msg => toast(msg, 'success')
  const error = msg => toast(msg, 'error', 6000)

  function dismiss(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  // confirm({ title, message, confirmLabel, danger, requireText }) → Promise<boolean>
  // requireText : texte à recopier pour valider (actions irréversibles)
  function confirm(options) {
    return new Promise(resolve => {
      dialog.value = { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', ...options, resolve }
    })
  }

  function closeDialog(result) {
    dialog.value?.resolve(result)
    dialog.value = null
  }

  return { toasts, dialog, toast, success, error, dismiss, confirm, closeDialog }
})
