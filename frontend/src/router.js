// frontend/src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import OrderPage from './pages/OrderPage.vue';
import AdminPage from './pages/AdminPage.vue';
import CategoriesPage from './pages/CategoriesPage.vue';
import LoginPage from './pages/LoginPage.vue';
import OrderSummary from './pages/OrderSummary.vue';
import SalesSummaryPage from './pages/SalesSummaryPage.vue';
import DailySalesSummaryPage from './pages/DailySalesSummaryPage.vue';
import AdminOrganizations from './views/AdminOrganizations.vue';

const requireAuth = (to, from, next) => {
  const isAuthenticated = localStorage.getItem('auth') === 'true';
  if (!isAuthenticated) {
    next('/login');
  } else {
    next();
  }
};

export default createRouter({
  history: createWebHistory(),
  routes: [
    // Route publique
    { path: '/login', component: LoginPage },

    // Routes par organisation
    {
      path: '/:orgSlug', // ← slug dynamique
      // component: OrderPage, // ou un layout parent si tu en as un
      children: [
        { path: '', component: OrderPage }, // page principale de commande
        { path: 'categories', component: CategoriesPage },
        { path: 'summary', component: OrderSummary },
        { path: 'summary/today', component: SalesSummaryPage },
        { path: 'summary/daily', component: DailySalesSummaryPage },
        { path: 'admin', component: AdminPage },
      ]
    },

    // Routes admin globales
    { path: '/admin/organizations', component: AdminOrganizations },
    // { path: '/admin/organizations', component: AdminOrganizations, beforeEnter: requireAuth },
  ]
});

