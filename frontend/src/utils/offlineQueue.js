// frontend/src/utils/offlineQueue.js
// File d'attente des commandes saisies sans réseau, renvoyées dès que possible.
// Chaque commande porte un clientId : le serveur ignore les doublons.
import { ref } from 'vue'
import { api } from './api'
import { readJSON, writeJSON } from './storage'

const key = slug => `pendingOrders:${slug}`

// Nombre de commandes en attente / en échec (réactif, pour l'affichage)
export const pendingCount = ref(0)
export const failedCount = ref(0)

function refreshCounts(slug) {
  const list = getPending(slug)
  pendingCount.value = list.filter(o => !o.error).length
  failedCount.value = list.filter(o => o.error).length
}

export function getPending(slug) {
  return readJSON(key(slug), [])
}

function save(slug, list) {
  writeJSON(key(slug), list)
  refreshCounts(slug)
}

export function enqueue(slug, order) {
  save(slug, [...getPending(slug), order])
}

export function removePending(slug, clientId) {
  save(slug, getPending(slug).filter(o => o.clientId !== clientId))
}

let flushing = false

// Renvoie les commandes en attente ; s'arrête à la première erreur réseau
export async function flush(slug, token) {
  refreshCounts(slug)
  if (flushing || !token) return
  flushing = true
  try {
    for (const order of getPending(slug).filter(o => !o.error)) {
      try {
        await api(`/api/${slug}/orders`, {
          method: 'POST',
          token,
          body: { items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })), paymentMethod: order.paymentMethod, clientId: order.clientId, offline: true },
        })
        removePending(slug, order.clientId)
      } catch (err) {
        if (err.network || err.status === 401 || err.status >= 500) break
        // Refus définitif (ex. produit supprimé) : conservée pour traitement manuel
        save(slug, getPending(slug).map(o => (o.clientId === order.clientId ? { ...o, error: err.message } : o)))
      }
    }
  } finally {
    flushing = false
  }
}
