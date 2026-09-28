<!-- frontend/src/pages/legal/PrivacyPage.vue -->
<template>
  <LegalLayout title="Politique de confidentialité">
    <template v-if="info">
      <h2>Responsable du traitement</h2>
      <p>
        {{ orTodo(info.editor.name) }}, {{ orTodo(info.editor.address) }}.
        Contact pour toute question sur vos données :
        <a v-if="info.dpoEmail" :href="`mailto:${info.dpoEmail}`">{{ info.dpoEmail }}</a><span v-else>[à compléter]</span>.
      </p>

      <h2>Données traitées</h2>
      <ul>
        <li>
          <strong>Formulaire « Demander un accès »</strong> : nom, adresse email et message.
          Finalité : répondre à votre demande et créer, le cas échéant, l’accès de votre organisation.
          Base légale : mesures précontractuelles prises à votre demande (art. 6.1.b du RGPD).
          Conservation : {{ info.contactRetentionDays }} jours, puis suppression automatique.
          Destinataire : l’administrateur de Festibar, par email via un prestataire d’envoi.
        </li>
        <li>
          <strong>Comptes des organisations</strong> : nom de l’organisation et mots de passe, stockés uniquement
          sous forme d’empreinte chiffrée irréversible.
        </li>
        <li>
          <strong>Commandes</strong> : produits, quantités, montants, heure et moyen de paiement.
          Aucune donnée permettant d’identifier les clients de la buvette n’est collectée.
        </li>
        <li>
          <strong>Sécurité</strong> : l’adresse IP est utilisée temporairement, en mémoire, pour limiter les tentatives
          de connexion et les envois abusifs du formulaire. Elle n’est pas conservée en base.
        </li>
      </ul>

      <h2>Stockage dans le navigateur</h2>
      <p>
        Festibar n’utilise ni cookie publicitaire ni outil de mesure d’audience. Le stockage local du navigateur
        sert uniquement au fonctionnement du service (session de connexion, panier en cours, commandes en attente
        d’envoi hors-ligne, carte des produits). Ces traceurs strictement nécessaires ne requièrent pas de consentement.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition
        sur vos données. Pour les exercer, écrivez à l’adresse ci-dessus. Vous pouvez également introduire une
        réclamation auprès de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>).
      </p>

      <h2>Hébergement et sécurité</h2>
      <p>
        Les données sont hébergées par {{ orTodo(info.host.name) }}. Les accès sont protégés par mot de passe,
        les échanges doivent être chiffrés (HTTPS) et la base est sauvegardée régulièrement.
      </p>
    </template>
  </LegalLayout>
</template>

<script setup>
import LegalLayout from '@/components/LegalLayout.vue'
import { useLegalInfo, orTodo } from '@/utils/legal'
const info = useLegalInfo()
</script>
