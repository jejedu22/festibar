<!-- frontend/src/pages/legal/TermsPage.vue -->
<template>
  <LegalLayout title="Conditions générales d’utilisation">
    <template v-if="info">
      <h2>1. Objet</h2>
      <p>
        Festibar, édité par {{ orTodo(info.editor.name) }}, est un outil d’aide à la prise de commande pour les
        buvettes d’événements (festivals, fêtes associatives…). Les présentes conditions s’appliquent aux
        organisations utilisatrices et à leurs membres (gestionnaires et serveurs bénévoles).
      </p>

      <h2>2. Accès au service</h2>
      <p>
        L’accès est ouvert sur demande. Chaque organisation dispose d’un mot de passe gestionnaire et, si elle le
        souhaite, d’un mot de passe serveurs. L’organisation est responsable de la confidentialité de ces mots de passe
        et des opérations réalisées avec eux.
      </p>

      <h2>3. Ce que Festibar n’est pas</h2>
      <p>
        <strong>Festibar n’est pas un logiciel de caisse certifié</strong> au sens de l’article 286, I-3° bis du
        Code général des impôts (conditions d’inaltérabilité, de sécurisation, de conservation et d’archivage des données).
        Les organisations assujetties à la TVA qui enregistrent des paiements de clients doivent utiliser un logiciel
        ou système de caisse certifié ; Festibar peut alors seulement compléter ce dispositif.
      </p>

      <h2>4. Obligations des organisations</h2>
      <ul>
        <li>
          Respecter la réglementation des débits de boissons temporaires : autorisation d’ouverture de buvette
          délivrée par la mairie, groupes de boissons autorisés, horaires.
        </li>
        <li>
          Afficher sur le stand l’interdiction de vente d’alcool aux mineurs et exiger une pièce d’identité en cas de doute
          (article L3342-1 du Code de la santé publique).
        </li>
        <li>Afficher les prix toutes taxes comprises de façon visible pour la clientèle.</li>
        <li>Tenir leur propre comptabilité : les données de Festibar sont un outil de suivi, à exporter régulièrement.</li>
      </ul>

      <h2>5. Disponibilité et données</h2>
      <p>
        Le service est fourni sans garantie de disponibilité. Un mode hors-ligne limité conserve les commandes sur
        l’appareil en cas de coupure réseau. La base est sauvegardée régulièrement, mais chaque organisation
        reste responsable de l’export de ses données (bouton « Exporter » de la page Ventes).
        Les annulations de commandes et suppressions de lignes sont tracées dans un journal inclus dans l’export.
      </p>
      <p>
        Les données saisies (carte, commandes) restent la propriété de l’organisation, qui peut en demander la suppression
        définitive.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        L’éditeur ne saurait être tenu responsable des pertes financières, erreurs de caisse ou manquements
        réglementaires des organisations utilisatrices.
      </p>

      <h2>7. Modification et droit applicable</h2>
      <p>
        Ces conditions peuvent évoluer ; la version en ligne fait foi. Elles sont soumises au droit français.
        Contact : <a v-if="info.editor.email" :href="`mailto:${info.editor.email}`">{{ info.editor.email }}</a><span v-else>[à compléter]</span>.
      </p>
    </template>
  </LegalLayout>
</template>

<script setup>
import LegalLayout from '@/components/LegalLayout.vue'
import { useLegalInfo, orTodo } from '@/utils/legal'
const info = useLegalInfo()
</script>
