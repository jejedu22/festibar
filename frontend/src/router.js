import { createRouter, createWebHistory } from 'vue-router'
import OrganizationLayout from './layouts/OrganizationLayout.vue'
import { isAdminAuthenticated } from './utils/adminAuth'
import { useOrganizationStore } from './stores/organization'
import { applyHead } from './utils/head'

// Pages organisation
import OrderPage from './pages/OrderPage.vue'
import CategoriesPage from './pages/CategoriesPage.vue'
import OrderSummary from './pages/OrderSummary.vue'
import DailySalesSummaryPage from './pages/DailySalesSummaryPage.vue'
import AdminPage from './pages/AdminPage.vue'
import LoginPage from './pages/LoginPage.vue'
import AdminOrdersPage from './pages/AdminOrdersPage.vue'
import EndOfEventPage from './pages/EndOfEventPage.vue'

// Pages admin global
import AdminOrganizations from './views/AdminOrganizations.vue'
import AdminLoginPage from './pages/AdminLoginPage.vue'

// Autres pages
import HomePage from './pages/HomePage.vue'
import NotFound from './pages/NotFound.vue'
import LegalNoticePage from './pages/legal/LegalNoticePage.vue'
import PrivacyPage from './pages/legal/PrivacyPage.vue'
import TermsPage from './pages/legal/TermsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    // Pages publiques indexables : titres et descriptions à garder alignés avec backend/utils/seo.js
    {
      path: '/',
      component: HomePage,
      meta: {
        title: 'Festibar',
        documentTitle: 'Festibar : prise de commande pour buvettes de festivals',
        description: 'Prise de commande pour buvettes de festivals et événements associatifs : sur téléphone, même sans réseau, avec rendu de monnaie et export des ventes.',
        index: true,
      },
    },
    {
      path: '/mentions-legales',
      component: LegalNoticePage,
      meta: {
        title: 'Mentions légales',
        description: 'Mentions légales de Festibar : éditeur, hébergeur et nature du service, un outil d’aide à la prise de commande qui n’est pas un logiciel de caisse certifié.',
        index: true,
      },
    },
    {
      path: '/confidentialite',
      component: PrivacyPage,
      meta: {
        title: 'Confidentialité',
        description: 'Politique de confidentialité de Festibar : données traitées, durée de conservation, stockage dans le navigateur et exercice de vos droits (RGPD).',
        index: true,
      },
    },
    {
      path: '/cgu',
      component: TermsPage,
      meta: {
        title: 'Conditions d’utilisation',
        description: 'Conditions générales d’utilisation de Festibar : accès au service, obligations des organisations, disponibilité des données et responsabilité.',
        index: true,
      },
    },

    { path: '/admin/auth/login', component: AdminLoginPage, meta: { title: 'Connexion admin' } },
    {
      path: '/admin/organizations',
      component: AdminOrganizations,
      meta: { title: 'Organisations' },
      beforeEnter: () => (isAdminAuthenticated() ? true : '/admin/auth/login'),
    },

    {
      path: '/:orgSlug',
      component: OrganizationLayout,
      children: [
        // role : 'staff' (serveurs et gestionnaire) ou 'manager' (gestionnaire uniquement)
        { path: '', component: OrderPage, meta: { role: 'staff', title: 'Commande' } },
        { path: 'summary', component: OrderSummary, meta: { role: 'staff', title: 'Récapitulatif' } },
        { path: 'login', component: LoginPage, meta: { title: 'Connexion' } },
        { path: 'admin', component: AdminPage, meta: { role: 'manager', title: 'Carte' } },
        { path: 'categories', component: CategoriesPage, meta: { role: 'manager', title: 'Catégories' } },
        { path: 'summary/daily', component: DailySalesSummaryPage, meta: { role: 'manager', title: 'Ventes' } },
        { path: 'admin/orders', component: AdminOrdersPage, meta: { role: 'manager', title: 'Commandes' } },
        { path: 'fin-evenement', component: EndOfEventPage, meta: { role: 'manager', title: 'Fin d’événement' } },
      ],
    },

    { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound, meta: { title: 'Page introuvable' } },
  ],
})

// Protection des pages d'organisation selon le rôle
router.beforeEach(to => {
  const role = to.meta.role
  if (!role) return true
  const org = useOrganizationStore()
  if (org.isAuthenticatedFor(to.params.orgSlug, role)) return true
  return { path: `/${to.params.orgSlug}/login`, query: { redirect: to.fullPath } }
})

router.afterEach(to => applyHead(to.meta, to.path))

export default router
