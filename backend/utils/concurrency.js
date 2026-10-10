// backend/utils/concurrency.js

// File d'attente à concurrence limitée : au plus `concurrency` tâches en même temps, les autres
// attendent leur tour (ordre d'arrivée). Au-delà de `maxQueue` tâches en attente, run() est refusé
// avec une erreur de code GATE_FULL plutôt que d'accumuler du travail sans limite.
function createGate({ concurrency, maxQueue = Infinity }) {
  let active = 0;
  const queue = [];

  const pump = () => {
    while (active < concurrency && queue.length) {
      const task = queue.shift();
      active++;
      task().finally(() => {
        active--;
        pump();
      });
    }
  };

  return {
    run(fn) {
      if (queue.length >= maxQueue) {
        return Promise.reject(Object.assign(new Error('Trop de tâches en attente'), { code: 'GATE_FULL' }));
      }
      return new Promise((resolve, reject) => {
        // La tâche ne rejette jamais : l'erreur est transmise à l'appelant de run()
        queue.push(() => Promise.resolve().then(fn).then(resolve, reject));
        pump();
      });
    },
    get active() { return active; },
    get waiting() { return queue.length; },
  };
}

module.exports = { createGate };
