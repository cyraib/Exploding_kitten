import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionClock } from '../../app/decision-clock.js';

test('background delivery and foreground catch-up run a decision once', () => {
  let now = 100, decisions = 0;
  const messages = [], worker = { postMessage: message => messages.push(message) };
  const clock = createDecisionClock(worker, () => now);
  clock.schedule(() => decisions++, 3000);
  const id = messages.at(-1).id;
  now = 3099; worker.onmessage({ data: { id } });
  assert.equal(decisions, 0, 'never shorten a Nope window');
  now = 3100; worker.onmessage({ data: { id } });
  clock.catchUp(); worker.onmessage({ data: { id } });
  assert.equal(decisions, 1);
  clock.cancel();
});

test('pause/restart/replacement ignore stale worker deliveries', () => {
  let now = 0, old = 0, current = 0;
  const messages = [], worker = { postMessage: message => messages.push(message) };
  const clock = createDecisionClock(worker, () => now);
  clock.schedule(() => old++, 500);
  const stale = messages.at(-1).id;
  clock.cancel(); now = 1000;
  worker.onmessage({ data: { id: stale } }); clock.catchUp();
  assert.equal(old, 0);
  clock.schedule(() => current++, 500);
  const id = messages.at(-1).id;
  now = 1500; worker.onmessage({ data: { id: stale } });
  assert.equal(current, 0);
  clock.catchUp(); worker.onmessage({ data: { id } });
  assert.equal(current, 1); clock.cancel();
});

test('ordinary timers work when worker creation is unavailable', async () => {
  const clock = createDecisionClock();
  await new Promise(resolve => clock.schedule(resolve, 5));
  clock.cancel();
});
