<template>
  <div>
    <h2>Liste des organisations</h2>
    <ul>
      <li v-for="org in organizations" :key="org.id">
        {{ org.name }}
        <button @click="$emit('edit', org)">Gérer</button>
        <button @click="deleteOrg(org.id)">Supprimer</button>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: ['organizations'],
  methods: {
    async deleteOrg(id) {
      if (!confirm('Voulez-vous vraiment supprimer cette organisation ?')) return;
      try {
        await fetch(`/api/admin/organizations/${id}`, { method: 'DELETE' });
        this.$emit('deleted', id);
      } catch (err) {
        alert('Erreur suppression');
      }
    }
  }
}
</script>
