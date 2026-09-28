<!-- frontend/src/pages/HomePage.vue -->
<template>
  <div class="p-6 max-w-3xl mx-auto">
    <h1 class="text-4xl font-bold mb-4 text-center">🍻 Festibar</h1>
    <p class="text-lg mb-6 text-center">
      La prise de commande simple et rapide pour les buvettes de festivals et d’événements associatifs.
    </p>

    <div class="bg-gray-100 rounded-xl p-6 shadow-sm space-y-3 mb-8">
      <h2 class="text-2xl font-semibold">Fonctionnalités</h2>
      <ul class="list-disc list-inside space-y-1">
        <li>Prise de commande sur téléphone, en quelques appuis</li>
        <li>Calcul du rendu de monnaie, espèces ou carte</li>
        <li>Fonctionne même en cas de coupure réseau</li>
        <li>Accès séparés pour les serveurs et le gestionnaire</li>
        <li>Ventes par soirée, export Excel, historique des annulations</li>
      </ul>
      <p class="text-sm text-gray-700">
        Festibar est un outil d’aide à la prise de commande : il ne constitue pas un logiciel de caisse certifié
        (<router-link to="/cgu" class="underline">voir les conditions</router-link>).
      </p>
    </div>

    <!-- Formulaire de contact -->
    <section class="bg-white rounded-xl shadow-lg p-6" aria-labelledby="contact-title">
      <h2 id="contact-title" class="text-2xl font-semibold mb-4">📩 Demander un accès</h2>

      <p v-if="submitted" class="text-green-700 font-semibold" role="status">
        ✅ Merci pour votre demande, nous vous répondrons rapidement !
      </p>

      <form v-else class="space-y-4" @submit.prevent="submitForm">
        <label class="block">
          <span class="text-sm font-medium">Nom</span>
          <input v-model="form.name" type="text" autocomplete="name" maxlength="100" required class="w-full border rounded-lg p-2 mt-1" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Email</span>
          <input v-model="form.email" type="email" autocomplete="email" maxlength="200" required class="w-full border rounded-lg p-2 mt-1" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Message (organisation, événement, dates…)</span>
          <textarea v-model="form.message" rows="4" maxlength="2000" required class="w-full border rounded-lg p-2 mt-1"></textarea>
        </label>

        <!-- Champ piège anti-robots, invisible pour les humains -->
        <div class="hidden" aria-hidden="true">
          <label>Site web <input v-model="form.website" type="text" tabindex="-1" autocomplete="off" /></label>
        </div>

        <p class="text-xs text-gray-700">
          Ces informations servent uniquement à traiter votre demande d’accès. Elles sont conservées au maximum
          {{ retention }} jours puis supprimées. Vous pouvez exercer vos droits d’accès, de rectification et
          d’effacement : voir la <router-link to="/confidentialite" class="underline">politique de confidentialité</router-link>.
        </p>

        <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" :disabled="sending">
          {{ sending ? 'Envoi…' : 'Envoyer la demande' }}
        </button>
        <p v-if="error" class="text-red-700" role="alert">{{ error }}</p>
      </form>
    </section>

    <LegalFooter />
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { api } from '@/utils/api'
import { useLegalInfo } from '@/utils/legal'
import LegalFooter from '@/components/LegalFooter.vue'

const form = reactive({ name: '', email: '', message: '', website: '' })
const submitted = ref(false)
const sending = ref(false)
const error = ref('')
const legal = useLegalInfo()
const retention = computed(() => legal.value?.contactRetentionDays || 365)

async function submitForm() {
  error.value = ''
  sending.value = true
  try {
    await api('/api/contact', { method: 'POST', body: { ...form } })
    submitted.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    sending.value = false
  }
}
</script>
