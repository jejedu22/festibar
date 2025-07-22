<!-- frontend/src/views/Client.vue -->
<template>
  <div class="app">
    <h1>Commande</h1>
    <ul>
      <li v-for="product in products" :key="product.id">
        {{ product.name }} (€{{ product.price.toFixed(2) }})
        <input
          type="number"
          min="0"
          :value="cart[product.id] || ''"
          @input="updateQuantity(product.id, $event.target.value)"
        />
      </li>
    </ul>
    <h2>Total: €{{ total.toFixed(2) }}</h2>
    <button @click="submitOrder">Valider la commande</button>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';

export default {
  setup() {
    const products = ref([]);
    const cart = reactive({});

    const total = computed(() => {
      return products.value.reduce((sum, product) => {
        const quantity = cart[product.id] || 0;
        return sum + quantity * product.price;
      }, 0);
    });

    const updateQuantity = (id, value) => {
      cart[id] = parseInt(value) || 0;
    };

    const submitOrder = async () => {
      const items = Object.entries(cart)
        .filter(([_, q]) => q > 0)
        .map(([productId, quantity]) => ({
          productId: parseInt(productId),
          quantity
        }));

      const res = await fetch('http://localhost:3001/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      alert(`Commande validée ! Total: €${data.total.toFixed(2)}`);
      for (const key in cart) delete cart[key];
    };

    onMounted(async () => {
      const res = await fetch('http://localhost:3001/products');
      products.value = await res.json();
    });

    return {
      products,
      cart,
      total,
      updateQuantity,
      submitOrder
    };
  }
};
</script>
