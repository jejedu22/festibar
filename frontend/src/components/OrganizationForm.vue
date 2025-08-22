<template>
  <div class="organization-form">
    <h2>Créer une organisation</h2>
    <form @submit.prevent="submitForm">
      <div>
        <label for="name">Nom :</label>
        <input type="text" id="name" v-model="form.name" required />
      </div>

      <div>
        <label for="slug">Slug (URL) :</label>
        <input type="text" id="slug" v-model="form.slug" required />
      </div>

      <div>
        <label for="password">Mot de passe :</label>
        <input type="password" id="password" v-model="form.password" required />
      </div>

      <button type="submit">Créer</button>
    </form>

    <div v-if="message">{{ message }}</div>
  </div>
</template>

<script>
import axios from 'axios';
import { reactive, ref } from 'vue';

export default {
  setup() {
    const form = reactive({
      name: '',
      slug: '',
      password: ''
    });

    const message = ref('');

    const submitForm = async () => {
      try {
        const response = await axios.post('/api/admin/organizations', form);
        message.value = `Organisation créée : ${response.data.name}`;
        form.name = '';
        form.slug = '';
        form.password = '';
      } catch (err) {
        message.value = err.response?.data?.error || 'Erreur serveur';
      }
    };

    return { form, message, submitForm };
  }
};
</script>

<style scoped>
.organization-form {
  max-width: 400px;
  margin: auto;
}
.organization-form div {
  margin-bottom: 10px;
}
</style>
