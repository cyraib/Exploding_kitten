// A worker keeps short game deadlines independent of a hidden page's timer budget.
// The deadline remains on the main thread so returning from browser sleep catches up.
export function createDecisionClock(worker = null, now = () => Date.now()) {
  let generation = 0, timeout, pending = null;
  function run(id) {
    if (!pending || id !== generation) return;
    if (now() < pending.deadline) {
      clearTimeout(timeout);
      timeout = setTimeout(() => run(id), pending.deadline - now());
      return;
    }
    const callback = pending.callback;
    pending = null;
    clearTimeout(timeout);
    callback();
  }
  function cancel() {
    generation++;
    pending = null;
    clearTimeout(timeout);
    worker?.postMessage({ cancel: true, id: generation });
  }
  if (worker) {
    worker.onmessage = event => run(event.data.id);
    worker.onerror = () => { worker = null; };
  }
  return {
    cancel,
    schedule(callback, ms) {
      cancel();
      pending = { callback, deadline: now() + ms };
      const id = generation;
      timeout = setTimeout(() => run(id), ms);
      worker?.postMessage({ id, ms });
    },
    catchUp() { run(generation); },
  };
}
