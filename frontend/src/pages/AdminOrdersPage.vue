<!-- frontend/src/pages/AdminOrdersPage.vue -->
<template>
  <div class="max-w-2xl mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">{{ orgStore.organizationName }}</h1>
    <h2 class="text-xl font-semibold mb-4">📅 Commandes par jour</h2>

    <div v-if="loading">Chargement...</div>
    <div v-else>
      <div v-for="(orders, day) in ordersByDay" :key="day" class="mb-6">
        <h2 class="text-lg font-bold mb-2">{{ day }}</h2>

        <div v-for="order in Object.values(orders)" :key="order.orderId" class="border rounded p-2 mb-2">
          <div class="flex justify-between items-center mb-2">
            <span>Commande #{{ order.orderId }} ({{ order.timestamp }})</span>
            <span class="font-bold">Total : €{{ order.total.toFixed(2) }}</span>
          </div>

          <!-- Tableau des items -->
          <table class="min-w-full border-collapse">
            <thead>
              <tr class="border-b font-semibold text-left">
                <th class="px-2 py-1">Produit</th>
                <th class="px-2 py-1 text-right">Quantité</th>
                <th class="px-2 py-1 text-right">Prix (€)</th>
                <th class="px-2 py-1 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in order.items" :key="item.productId" class="border-b last:border-b-0">
                <td class="px-2 py-1">{{ item.productName }}</td>
                <td class="px-2 py-1 text-right">{{ item.quantity }}</td>
                <td class="px-2 py-1 text-right">{{ (item.price * item.quantity).toFixed(2) }}</td>
                <td class="px-2 py-1 text-center">
                  <button
                    @click="removeItem(order.orderId, item.productId)"
                    class="text-red-500 hover:underline"
                  >
                    ❌
                  </button>
                </td>
              </tr>
            </tbody>
          </table>


          <button
            @click="removeOrder(order.orderId)"
            class="mt-2 w-full bg-red-500 text-white py-1 rounded hover:bg-red-600 transition"
          >
            Supprimer commande
          </button>
        </div>
      </div>
    </div>

    <router-link :to="`/${orgSlug}/admin`" class="block text-center mt-6 text-sm text-gray-500">
      ⬅ Retour
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'

const route = useRoute()
const router = useRouter()
const orgSlug = route.params.orgSlug
const orgStore = useOrganizationStore()

// Sécurité : redirige si pas loggé en admin
if (!orgStore.isAuthenticated || orgStore.organization?.slug !== orgSlug) {
  router.push(`/${orgSlug}/login`)
}

const ordersByDay = ref({})
const loading = ref(true)

function getAuthHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  return {
    'Content-Type': 'application/json',
    'x-auth': JSON.stringify(auth)
  }
}

async function loadOrders() {
  loading.value = true
  const res = await fetch(`/api/${orgSlug}/orders/all`, {
    headers: getAuthHeaders()
  })
  ordersByDay.value = await res.json()
  loading.value = false
}

async function removeItem(orderId, productId) {
  if (!confirm('Supprimer cette ligne ?')) return
  await fetch(`/api/${orgSlug}/orders/${orderId}/items/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  loadOrders()
}

async function removeOrder(orderId) {
  if (!confirm('Supprimer cette commande entière ?')) return
  await fetch(`/api/${orgSlug}/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  loadOrders()
}

onMounted(loadOrders)
</script>
