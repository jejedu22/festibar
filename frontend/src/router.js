// frontend/src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import OrderPage from './pages/OrderPage.vue';
import AdminPage from './pages/AdminPage.vue';
import CategoriesPage from './pages/CategoriesPage.vue';
import LoginPage from './pages/LoginPage.vue';
import OrderSummary from './pages/OrderSummary.vue';
import SalesSummaryPage from './pages/SalesSummaryPage.vue';
import DailySalesSummaryPage from './pages/DailySalesSummaryPage.vue';

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
    { path: '/', component: OrderPage },
    { path: '/login', component: LoginPage },
    { path: '/admin', component: AdminPage, beforeEnter: requireAuth },
    { path: '/categories', component: CategoriesPage, beforeEnter: requireAuth },
    { path: '/summary', component: OrderSummary },
    { path: '/summary/today', component: SalesSummaryPage },
    { path: '/summary/daily', component: DailySalesSummaryPage }

  ]
});
