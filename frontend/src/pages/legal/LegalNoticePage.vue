<!-- frontend/src/pages/legal/LegalNoticePage.vue -->
<template>
  <LegalLayout title="Mentions légales">
    <template v-if="info">
      <h2>Éditeur du service</h2>
      <p>
        {{ orTodo(info.editor.name) }}<span v-if="info.editor.status"> — {{ info.editor.status }}</span><br />
        Adresse : {{ orTodo(info.editor.address) }}<br />
        <span v-if="info.editor.registration">{{ info.editor.registration }}<br /></span>
        Contact : <a v-if="info.editor.email" :href="`mailto:${info.editor.email}`">{{ info.editor.email }}</a><span v-else>[à compléter]</span>
        <span v-if="info.editor.phone"> — {{ info.editor.phone }}</span>
      </p>
      <p>Directeur ou directrice de la publication : {{ orTodo(info.editor.director) }}</p>

      <h2>Hébergement</h2>
      <p>
        {{ orTodo(info.host.name) }}<br />
        Adresse : {{ orTodo(info.host.address) }}<br />
        Téléphone : {{ orTodo(info.host.phone) }}
      </p>

      <h2>Nature du service</h2>
      <p>
        Festibar est un outil d’aide à la prise de commande pour les buvettes d’événements.
        <strong>Il ne constitue pas un logiciel de caisse certifié</strong> au sens de l’article 286, I-3° bis
        du Code général des impôts. Voir les <router-link to="/cgu">conditions d’utilisation</router-link>.
      </p>

      <h2>Données personnelles</h2>
      <p>Voir la <router-link to="/confidentialite">politique de confidentialité</router-link>.</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les noms, logos et contenus saisis par les organisations utilisatrices restent leur propriété.
      </p>
    </template>
  </LegalLayout>
</template>

<script setup>
import LegalLayout from '@/components/LegalLayout.vue'
import { useLegalInfo, orTodo } from '@/utils/legal'
const info = useLegalInfo()
</script>
