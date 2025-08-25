import { createRouter, createWebHistory } from 'vue-router'
import OrganizationLayout from './layouts/OrganizationLayout.vue'

// Pages organisation
import OrderPage from './pages/OrderPage.vue'
import CategoriesPage from './pages/CategoriesPage.vue'
import OrderSummary from './pages/OrderSummary.vue'
import DailySalesSummaryPage from './pages/DailySalesSummaryPage.vue'
import AdminPage from './pages/AdminPage.vue'
import LoginPage from './pages/LoginPage.vue'
import AdminOrdersPage from './pages/AdminOrdersPage.vue'

// Pages admin global
import AdminOrganizations from './views/AdminOrganizations.vue'
import AdminLoginPage from './pages/AdminLoginPage.vue'

// Autres pages
import HomePage from './pages/HomePage.vue'
import NotFound from './pages/NotFound.vue'

// Guards
const requireAuth = (to, from, next) => {
  const isAuthenticated = localStorage.getItem('auth') === 'true'
  if (!isAuthenticated) next('/login')
  else next()
}

const requireAdminAuth = (to, from, next) => {
  const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true'
  if (!isAdmin) next('/admin/auth/login')
  else next()
}

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/login', component: LoginPage },

    {
      path: '/:orgSlug',
      component: OrganizationLayout,
      children: [
        { path: '', component: OrderPage },
        { path: 'categories', component: CategoriesPage },
        { path: 'summary', component: OrderSummary },
        { path: 'summary/daily', component: DailySalesSummaryPage },
        { path: 'admin', component: AdminPage },
        { path: 'login', component: LoginPage },
        { path: 'admin/orders', component: AdminOrdersPage }
      ]
    },

    { path: '/admin/auth/login', component: AdminLoginPage },
    { path: '/admin/organizations', component: AdminOrganizations, beforeEnter: requireAdminAuth },

    { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
  ]
})
