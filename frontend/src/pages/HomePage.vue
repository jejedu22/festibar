<!-- frontend/src/pages/HomePage.vue -->
<template>
  <main>
    <!-- Bandeau d'accueil : un seul h1, avec le nom et ce que fait le service -->
    <header class="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
      <div class="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 class="mb-5">
          <span class="block text-5xl font-bold mb-3"><span aria-hidden="true">🍻</span> Festibar</span>
          <span class="block text-xl font-normal">
            Prise de commande pour buvettes de festivals et d’événements associatifs
          </span>
        </h1>
        <p class="text-lg mb-8 text-blue-50">
          Fini les additions à la main : vos bénévoles saisissent les commandes sur leur téléphone, même quand le réseau
          sature, et le gestionnaire suit les ventes de la soirée avant d’exporter tout dans un fichier Excel.
        </p>
        <a href="#contact" class="inline-block px-6 py-3 bg-white text-blue-800 font-semibold rounded-lg shadow hover:bg-blue-50">
          Demander un accès
        </a>
        <p class="mt-3 text-sm text-blue-100">Sans installation : ça s’ouvre dans le navigateur du téléphone</p>
      </div>
    </header>

    <div class="p-6 max-w-3xl mx-auto">
      <!-- Contenu à garder identique à PUBLIC_PAGES['/'] de backend/utils/seo.js (repli pour les robots sans JavaScript) -->
      <section class="mb-10" aria-labelledby="features-title">
        <h2 id="features-title" class="text-2xl font-semibold mb-4 text-center">Fonctionnalités</h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li
            v-for="(point, i) in points"
            :key="point"
            class="flex items-start gap-3 bg-gray-100 rounded-xl p-4 shadow-sm"
          >
            <span class="text-2xl" aria-hidden="true">{{ icons[i] }}</span>
            <span>{{ point }}</span>
          </li>
        </ul>
        <p class="text-sm text-gray-700 mt-3">
          Festibar est un outil d’aide à la prise de commande : il ne constitue pas un logiciel de caisse certifié
          (<router-link to="/cgu" class="underline">voir les conditions</router-link>).
        </p>
      </section>

      <section class="mb-10" aria-labelledby="how-title">
        <h2 id="how-title" class="text-2xl font-semibold mb-4 text-center">Comment ça marche ?</h2>
        <ol class="space-y-3">
          <li v-for="(step, i) in steps" :key="step" class="flex items-start gap-4 bg-white rounded-xl shadow p-4">
            <span class="flex-none w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center" aria-hidden="true">{{ i + 1 }}</span>
            <span>{{ step }}</span>
          </li>
        </ol>
      </section>

      <section class="mb-10" aria-labelledby="for-who-title">
        <h2 id="for-who-title" class="text-2xl font-semibold mb-4 text-center">Pour qui ?</h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          <li v-for="item in forWho" :key="item" class="bg-gray-100 rounded-xl p-4 text-center">{{ item }}</li>
        </ul>
      </section>

    <!-- Formulaire de contact -->
    <section id="contact" class="bg-white rounded-xl shadow-lg p-6 scroll-mt-4" aria-labelledby="contact-title">
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
  </main>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { api } from '@/utils/api'
import { useLegalInfo } from '@/utils/legal'
import LegalFooter from '@/components/LegalFooter.vue'

const icons = ['📱', '💶', '📶', '🔑', '📊']
const points = [
  'Une commande prise en quelques appuis, même quand la file s’allonge',
  'Rendu de monnaie calculé pour vous, paiement en espèces ou par carte',
  'Continue de fonctionner sans réseau : les commandes partent dès que la connexion revient',
  'Un accès pour les serveurs, un autre pour le gestionnaire',
  'Ventes de chaque soirée, export Excel et historique des annulations',
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
