// frontend/src/utils/format.js
const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// 3.5 → "3,50 €"
export function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}

// "2026-07-14" → "mardi 14 juillet 2026"
export function formatDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// "2026-07-14 22:05:00" (heure locale de l'événement) → "22:05"
export function formatTime(localTimestamp) {
  return String(localTimestamp).slice(11, 16);
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces', icon: '💶' },
  { value: 'card', label: 'Carte', icon: '💳' },
  { value: 'other', label: 'Autre', icon: '🎟️' },
];

export function paymentLabel(value) {
  return PAYMENT_METHODS.find(p => p.value === value)?.label || value;
}
