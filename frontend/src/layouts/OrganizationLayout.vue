<template>
  <div v-if="organizationExists">
    <router-view />
  </div>
  <NotFound v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import NotFound from '../pages/NotFound.vue'

const route = useRoute()
const orgSlug = route.params.orgSlug
const organizationExists = ref(true)

onMounted(async () => {
  try {
    await axios.get(`/api/organizations/${orgSlug}`)
    organizationExists.value = true
  } catch (err) {
    console.error("Organisation non trouvée :", err)
    organizationExists.value = false
  }
})
</script>
