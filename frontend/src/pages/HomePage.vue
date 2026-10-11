<!-- frontend/src/pages/HomePage.vue -->
<template>
  <main class="p-6 max-w-3xl mx-auto">
    <!-- Un seul h1, avec le nom et ce que fait le service -->
    <h1 class="text-center mb-6">
      <span class="block text-4xl font-bold mb-2"><span aria-hidden="true">🍻</span> Festibar</span>
      <span class="block text-lg font-normal">
        Prise de commande pour buvettes de festivals et d’événements associatifs
      </span>
    </h1>
    <p class="text-lg mb-6 text-center">
      Les bénévoles prennent les commandes sur leur téléphone en quelques appuis, même quand le réseau sature.
      Le gestionnaire prépare la carte, suit les ventes de la soirée et exporte tout dans un fichier Excel.
    </p>

    <!-- Contenu à garder identique à PUBLIC_PAGES['/'] de backend/utils/seo.js (repli pour les robots sans JavaScript) -->
    <section class="bg-gray-100 rounded-xl p-6 shadow-sm space-y-3 mb-8" aria-labelledby="features-title">
      <h2 id="features-title" class="text-2xl font-semibold">Fonctionnalités</h2>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="point in points" :key="point">{{ point }}</li>
      </ul>
      <p class="text-sm text-gray-700">
        Festibar est un outil d’aide à la prise de commande : il ne constitue pas un logiciel de caisse certifié
        (<router-link to="/cgu" class="underline">voir les conditions</router-link>).
      </p>
    </section>

    <section class="mb-8" aria-labelledby="for-who-title">
      <h2 id="for-who-title" class="text-2xl font-semibold mb-2">Pour qui ?</h2>
      <ul class="list-disc list-inside space-y-1">
        <li v-for="item in forWho" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="mb-8" aria-labelledby="how-title">
      <h2 id="how-title" class="text-2xl font-semibold mb-2">Comment ça marche ?</h2>
      <ol class="list-decimal list-inside space-y-1">
        <li v-for="step in steps" :key="step">{{ step }}</li>
      </ol>
    </section>

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
  </main>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { api } from '@/utils/api'
import { useLegalInfo } from '@/utils/legal'
import LegalFooter from '@/components/LegalFooter.vue'

const points = [
  'Prise de commande sur téléphone, en quelques appuis',
  'Calcul du rendu de monnaie, paiement en espèces ou par carte',
  'Fonctionne même en cas de coupure réseau',
  'Accès séparés pour les serveurs et pour le gestionnaire',
  'Ventes par soirée, export Excel et historique des annulations',
]
const forWho = [
  'Associations et comités des fêtes qui tiennent une buvette',
  'Festivals, fêtes de village, tournois et autres événements',
]
const steps = [
  'Demandez un accès pour votre structure avec le formulaire de contact.',
  'Le gestionnaire prépare la carte : catégories, produits et prix.',
  'Les bénévoles prennent les commandes sur leur téléphone ; le gestionnaire suit les ventes et exporte les données en Excel.',
]

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
