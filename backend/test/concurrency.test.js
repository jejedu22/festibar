const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGate } = require('../utils/concurrency');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test('file : jamais plus de `concurrency` tâches en même temps, ordre d’arrivée respecté', async () => {
  const gate = createGate({ concurrency: 2 });
  let running = 0, peak = 0;
  const order = [];
  const task = id => gate.run(async () => {
    running++; peak = Math.max(peak, running);
    order.push(id);
    await sleep(15);
    running--;
    return id;
  });
  const results = await Promise.all([1, 2, 3, 4, 5, 6].map(task));
  assert.deepEqual(results, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(order, [1, 2, 3, 4, 5, 6]);
  assert.equal(peak, 2);
  assert.equal(gate.active, 0);
  assert.equal(gate.waiting, 0);
});

test('file : une tâche en erreur libère sa place et transmet son erreur', async () => {
  const gate = createGate({ concurrency: 1 });
  const failing = gate.run(async () => { throw new Error('boum'); });
  const after = gate.run(async () => 'ok');
  await assert.rejects(failing, /boum/);
  assert.equal(await after, 'ok');
  // une exception synchrone est traitée de la même façon
  await assert.rejects(gate.run(() => { throw new Error('sync'); }), /sync/);
  assert.equal(await gate.run(async () => 'encore'), 'encore');
});

test('file : au-delà de maxQueue, la demande est refusée (GATE_FULL) sans perturber les autres', async () => {
  const gate = createGate({ concurrency: 1, maxQueue: 2 });
  const release = [];
  const blocked = () => gate.run(() => new Promise(r => release.push(r)));
  const first = blocked();   // en cours
  const second = blocked();  // attente 1
  const third = blocked();   // attente 2
  await assert.rejects(blocked(), err => err.code === 'GATE_FULL');
  assert.equal(gate.waiting, 2);
  while (gate.active || gate.waiting) { release.forEach(r => r()); await sleep(5); }
  await Promise.all([first, second, third]);
  // la file est de nouveau disponible
  assert.equal(await gate.run(async () => 'libre'), 'libre');
});
