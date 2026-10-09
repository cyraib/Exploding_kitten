import test from 'node:test';
import assert from 'node:assert/strict';
import { syncHandOrder, moveHandCard, groupHandOrder } from '../../app/hand-order.js';

const card = (uid, type) => ({ uid, type });

test('initial hand follows the dealt queue without regrouping', () => {
  const hand = [card('d1', 'defuse'), card('a1', 'attack'), card('s1', 'skip'), card('a2', 'attack')];
  assert.deepEqual(syncHandOrder([], hand), ['d1', 'a1', 's1', 'a2']);
  assert.deepEqual(syncHandOrder(undefined, hand), ['d1', 'a1', 's1', 'a2']);
});

test('acquisitions join the last matching type while existing arrangement survives pruning', () => {
  const order = ['a2', 's1', 'a1', 'd1', 'gone'];
  const hand = [card('d1', 'defuse'), card('a1', 'attack'), card('s1', 'skip'), card('a2', 'attack'),
    card('a3', 'attack'), card('n1', 'nope'), card('a4', 'attack'), card('n2', 'nope')];
  assert.deepEqual(syncHandOrder(order, hand), ['a2', 's1', 'a1', 'a3', 'a4', 'd1', 'n1', 'n2']);
  // Engine removal of an arranged card must not reorder surviving cards.
  const afterPlay = hand.filter(c => c.uid !== 'a1');
  assert.deepEqual(syncHandOrder(syncHandOrder(order, hand), afterPlay), ['a2', 's1', 'a3', 'a4', 'd1', 'n1', 'n2']);
});

test('sync rejects stale/duplicate stored UIDs and groups by exact type rather than family', () => {
  const hand = [{ uid: 'cat1', type: 'beard-cat', family: 'cat-card' },
    { uid: 'cat2', type: 'tacocat', family: 'cat-card' }, card('cat3', 'beard-cat')];
  assert.deepEqual(syncHandOrder(['unknown', 'cat1', 'cat1', 'cat2'], hand), ['cat1', 'cat3', 'cat2']);
  assert.deepEqual(syncHandOrder(['unknown'], []), []);
});

test('moves handle both directions and remain inert for missing or self targets', () => {
  const order = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveHandCard(order, 'd', 'b'), ['a', 'd', 'b', 'c']);
  assert.deepEqual(moveHandCard(order, 'a', 'c', true), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveHandCard(order, 'c', 'b', true), order);
  for (const [uid, target] of [['a', 'a'], ['missing', 'b'], ['a', 'missing']]) {
    const next = moveHandCard(order, uid, target);
    assert.deepEqual(next, order);
    assert.notEqual(next, order);
  }
  assert.deepEqual(order, ['a', 'b', 'c', 'd']);
});

test('group retains current type priority and the manually chosen order of matching cards', () => {
  const hand = [card('a1', 'attack'), card('s1', 'skip'), card('a2', 'attack'),
    card('d1', 'defuse'), card('s2', 'skip')];
  const order = ['s2', 'a2', 'd1', 's1', 'a1'];
  const grouped = groupHandOrder(order, hand);
  assert.deepEqual(grouped, ['s2', 's1', 'a2', 'a1', 'd1']);
  assert.deepEqual(groupHandOrder(grouped, hand), grouped);
});

test('UI helpers return only UIDs and preserve engine indexes used by blind theft', () => {
  const hand = [card('u1', 'skip'), card('u2', 'attack'), card('u3', 'skip')];
  const original = structuredClone(hand);
  const order = Object.freeze(['u2', 'u1', 'u3']);
  Object.freeze(hand);
  hand.forEach(Object.freeze);
  const synced = syncHandOrder(order, hand);
  const moved = moveHandCard(synced, 'u3', 'u2');
  const grouped = groupHandOrder(moved, hand);
  assert.deepEqual(hand, original);
  assert.equal(hand[0].uid, 'u1');
  assert.deepEqual(order, ['u2', 'u1', 'u3']);
  for (const result of [synced, moved, grouped]) {
    assert.ok(result.every(uid => typeof uid === 'string'));
    assert.equal(new Set(result).size, hand.length);
    assert.deepEqual([...result].sort(), ['u1', 'u2', 'u3']);
    assert.doesNotMatch(JSON.stringify(result), /skip|attack|type|family/);
  }
});
