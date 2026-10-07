const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLimiter } = require('../utils/http');
const { serviceDay, toLocalString } = require('../utils/time');

test('limiteur : bloque après max échecs puis se réinitialise', () => {
  const l = createLimiter({ max: 2, windowMs: 60000 });
  l.hit('ip'); assert.equal(l.isBlocked('ip'), false);
  l.hit('ip'); assert.equal(l.isBlocked('ip'), true);
  l.reset('ip'); assert.equal(l.isBlocked('ip'), false);
});

test('journée de service : 1h du matin compte pour la veille (Paris, début 6h)', () => {
  // 23:30 UTC le 14 juillet = 01:30 le 15 à Paris → journée du 14
  assert.equal(serviceDay('2025-07-14 23:30:00'), '2025-07-14');
  assert.equal(serviceDay('2025-07-15 10:00:00'), '2025-07-15');
  assert.equal(toLocalString('2025-07-14 23:30:00'), '2025-07-15 01:30:00');
});
