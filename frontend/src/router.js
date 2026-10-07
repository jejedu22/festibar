import { createRouter, createWebHistory } from 'vue-router'
import OrganizationLayout from './layouts/OrganizationLayout.vue'
import { isAdminAuthenticated } from './utils/adminAuth'
import { useOrganizationStore } from './stores/organization'

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
    { path: '/', component: HomePage, meta: { title: 'Festibar' } },
    { path: '/mentions-legales', component: LegalNoticePage, meta: { title: 'Mentions légales' } },
    { path: '/confidentialite', component: PrivacyPage, meta: { title: 'Confidentialité' } },
    { path: '/cgu', component: TermsPage, meta: { title: 'Conditions d’utilisation' } },

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

router.afterEach(to => {
  document.title = to.meta.title ? `${to.meta.title} · Festibar` : 'Festibar'
})

export default router
