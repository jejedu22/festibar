<template>
  <div class="p-6 max-w-3xl mx-auto text-center">
    <h1 class="text-4xl font-bold mb-6">🍻 Bienvenue sur Festibar</h1>
    <p class="text-lg mb-4">
      Festibar est une application web simple et efficace conçue pour gérer les commandes
      d’un bar lors d’un festival.
    </p>

    <div class="bg-gray-100 rounded-xl p-6 shadow-md text-left space-y-4 mb-8">
      <h2 class="text-2xl font-semibold">Fonctionnalités principales :</h2>
      <ul class="list-disc list-inside space-y-2">
        <li>✅ Interface utilisateur fluide pour passer des commandes</li>
        <li>✅ Gestion des produits et catégories via un espace administrateur</li>
        <li>✅ Statistiques journalières des ventes</li>
        <li>✅ Application rapide et portable grâce à Docker</li>
      </ul>
    </div>

    <!-- Formulaire de contact -->
    <div class="bg-white rounded-xl shadow-lg p-6 text-left">
      <h2 class="text-2xl font-semibold mb-4">📩 Demander un accès</h2>
      <form @submit.prevent="submitForm" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium">Nom</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="w-full border rounded-lg p-2 mt-1"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="w-full border rounded-lg p-2 mt-1"
          />
        </div>

        <div>
          <label for="message" class="block text-sm font-medium">Message</label>
          <textarea
            id="message"
            v-model="form.message"
            rows="4"
            required
            class="w-full border rounded-lg p-2 mt-1"
          ></textarea>
        </div>

        <button
          type="submit"
          class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Envoyer la demande
        </button>
      </form>

      <p v-if="submitted" class="mt-4 text-green-600 font-semibold">
        ✅ Merci pour votre demande, nous vous répondrons rapidement !
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import axios from "axios";

const form = reactive({
  name: "",
  email: "",
  message: "",
});

const submitted = ref(false);

const submitForm = async () => {
  try {
    await axios.post("/api/contact", { ...form });
    submitted.value = true;
    form.name = "";
    form.email = "";
    form.message = "";
  } catch (err) {
    console.error("Erreur formulaire:", err);
    alert("Erreur lors de l'envoi de votre demande.");
  }
};

</script>
