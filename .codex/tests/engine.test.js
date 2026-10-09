import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CARDS } from '../../app/catalog.js';
import { createGame, transition, assertState, botView, canNope } from '../../app/engine.js';
import { chooseBotAction } from '../../app/bots.js';

const game = (bots = 2, seed = 21) => createGame({ bots, seed });
function take(s, type, except = []) {
  const lists = [s.deck, s.removed, s.discard, ...s.players.map(p => p.hand)];
  for (const list of lists) {
    const i = list.findIndex(c => c.type === type && !except.includes(c.uid));
    if (i >= 0) return list.splice(i, 1)[0];
  }
  throw new Error(`No available ${type}`);
}
function ensure(s, player, type, n = 1) {
  const p = s.players[player];
  while (p.hand.filter(c => c.type === type).length < n) p.hand.push(take(s, type, p.hand.map(c => c.uid)));
  return p.hand.filter(c => c.type === type).slice(0, n).map(c => c.uid);
}
function top(s, type) { const card = take(s, type); s.deck.unshift(card); return card; }
function empty(s, id) { s.deck.push(...s.players[id].hand); s.players[id].hand = []; }
function resolve(s) {
  while (s.phase === 'reaction') s = transition(s, { type: 'PASS', player: s.pending.responder });
  if (s.phase === 'steal') s = transition(s, { type: 'STEAL', player: s.steal.to, index: 0 });
  return s;
}

test('human pair waits for a hidden-card choice after responses and preserves the chosen identity', () => {
  let s = game(); const pair = ensure(s, 0, 'tacocat', 2);
  s = transition(s, { type: 'PLAY', player: 0, cards: pair, target: 1 });
  while (s.phase === 'reaction') s = transition(s, { type: 'PASS', player: s.pending.responder });
  assert.equal(s.phase, 'steal');
  const before = structuredClone(s), chosen = s.players[1].hand[2];
  assert.throws(() => transition(s, { type: 'STEAL', player: 0, index: -1 }), /face-down/);
  assert.deepEqual(s, before);
  s = transition(s, { type: 'STEAL', player: 0, index: 2 });
  assert.equal(s.phase, 'turn'); assert.equal(s.current, 0);
  assert.ok(s.players[0].hand.some(c => c.uid === chosen.uid));
  assert.ok(!s.players[1].hand.some(c => c.uid === chosen.uid)); assertState(s);
});

test('a human can Nope during another responder slot; cancellation prevents hidden-card choice', () => {
  let s = game(); const pair = ensure(s, 1, 'beard-cat', 2); ensure(s, 0, 'nope');
  s.current = 1;
  s = transition(s, { type: 'PLAY', player: 1, cards: pair, target: 0 });
  assert.equal(s.pending.responder, 2);
  s = transition(s, { type: 'NOPE', player: 0 });
  assert.equal(s.pending.cancelled, true); assert.equal(s.pending.responder, 1);
  s = resolve(s); assert.equal(s.phase, 'turn'); assert.equal(s.current, 1); assertState(s);
});

test('Attack target selection accepts only the next living clockwise seat', () => {
  let s = game(); const cards = ensure(s, 0, 'attack-2x');
  assert.throws(() => transition(s, { type: 'PLAY', player: 0, cards, target: 2 }), /clockwise/);
  s = resolve(transition(s, { type: 'PLAY', player: 0, cards, target: 1 }));
  assert.equal(s.current, 1); assert.equal(s.turnsRemaining, 2);
});
function play(s, player, type, n = 1, extra = {}) {
  const cards = ensure(s, player, type, n);
  return resolve(transition(s, { type: 'PLAY', player, cards, ...extra }));
}
function toTurn(s, id) { s.current = id; s.turnsRemaining = 1; s.attacked = false; s.phase = 'turn'; return s; }

test('self-Nope is rejected atomically but an opponent Nope can be countered with the chosen card', () => {
  let s = game(); const skip = ensure(s, 0, 'skip'); const nopes = ensure(s, 0, 'nope', 2); ensure(s, 1, 'nope');
  s = transition(s, { type: 'PLAY', player: 0, cards: skip });
  const before = structuredClone(s);
  assert.equal(canNope(s, 0), false);
  assert.throws(() => transition(s, { type: 'NOPE', player: 0 }), /own action/); assert.deepEqual(s, before);
  s = transition(s, { type: 'NOPE', player: 1 });
  assert.equal(canNope(s, 0), true);
  s = transition(s, { type: 'NOPE', player: 0, card: nopes[1] });
  assert.equal(s.pending.cancelled, false); assert.equal(s.pending.nopeCount, 2);
  assert.equal(s.pending.lastNopeBy, 0); assert.equal(canNope(s, 0), false);
  assert.ok(s.players[0].hand.some(c => c.uid === nopes[0]));
  assert.ok(s.discard.some(c => c.uid === nopes[1]));
  assert.throws(() => transition(s, { type: 'NOPE', player: 0 }), /own Nope/);
  const saved = JSON.parse(JSON.stringify(s)); assertState(saved); assert.equal(canNope(saved, 0), false);
  s = resolve(saved); assert.equal(s.current, 1); assertState(s);
});

test('bot will not counter its own Nope when protecting its cancelled action', () => {
  let s = game(); const skip = ensure(s, 1, 'skip'); ensure(s, 1, 'nope', 2); ensure(s, 0, 'nope');
  s.current = 1;
  s = transition(s, { type: 'PLAY', player: 1, cards: skip });
  s = transition(s, { type: 'NOPE', player: 0 });
  s = transition(s, { type: 'NOPE', player: 1 });
  const v = botView(s, 1); v.pending.cancelled = true;
  assert.equal(chooseBotAction(v, () => 0).type, 'PASS');
});

test('turn banner counter advances on completed turns and accepts legacy saves', () => {
  let s = game(); assert.equal(s.turnNumber, 1);
  s = play(s, 0, 'see-the-future-3x'); assert.equal(s.turnNumber, 1);
  s = transition(s, { type: 'CLOSE_FUTURE', player: 0 });
  s = play(s, 0, 'attack-2x'); assert.equal(s.turnNumber, 2);
  s = play(s, 1, 'skip'); assert.equal(s.turnNumber, 3); assert.equal(s.turnsRemaining, 1);
  delete s.turnNumber; assertState(s); top(s, 'favor');
  s = transition(s, { type: 'DRAW', player: 1 }); assert.equal(s.turnNumber, 2); assertState(s);
});

test('runtime catalog matches the supplied Original Edition inventory exactly', async () => {
  const deck = JSON.parse(await readFile(new URL('../../Assets/decks/exploding-kittens-original-edition/deck.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(CARDS).length, 13);
  assert.equal(deck.total_cards, 56);
  for (const c of deck.cards) assert.equal(CARDS[c.id].count, c.count);
});

for (let bots = 1; bots <= 4; bots++) test(`${bots + 1}-player setup gives safe eight-card hands and correct extra Defuses`, () => {
  const s = game(bots);
  assertState(s);
  for (const p of s.players) { assert.equal(p.hand.length, 8); assert.ok(p.hand.some(c => c.type === 'defuse')); assert.ok(!p.hand.some(c => c.type === 'exploding-kitten')); }
  assert.equal(s.deck.filter(c => c.type === 'exploding-kitten').length, bots);
  const activeDefuses = [...s.deck, ...s.players.flatMap(p => p.hand)].filter(c => c.type === 'defuse').length;
  assert.equal(activeDefuses, bots + 1 <= 3 ? bots + 3 : 6);
});

test('seeded setup is repeatable; invalid setup is rejected', () => {
  assert.deepEqual(game(3, 92), game(3, 92));
  assert.throws(() => game(0)); assert.throws(() => game(5));
});

test('ordinary draw ends one turn and keeps the identity out of public log', () => {
  let s = game(); const card = top(s, 'favor');
  s = transition(s, { type: 'DRAW', player: 0 });
  assert.equal(s.current, 1); assert.ok(s.players[0].hand.some(c => c.uid === card.uid));
  assert.equal(s.log.at(-1), 'You drew a card.');
});

test('Attack immediately assigns two turns, chains to four, and Skip only finishes one', () => {
  let s = play(game(), 0, 'attack-2x');
  assert.equal(s.current, 1); assert.equal(s.turnsRemaining, 2);
  s = play(s, 1, 'attack-2x');
  assert.equal(s.current, 2); assert.equal(s.turnsRemaining, 4);
  s = play(s, 2, 'skip'); assert.equal(s.current, 2); assert.equal(s.turnsRemaining, 3);
});

test('Attack after finishing one attacked turn passes three turns', () => {
  let s = play(game(), 0, 'attack-2x'); top(s, 'favor');
  s = transition(s, { type: 'DRAW', player: 1 });
  assert.equal(s.turnsRemaining, 1); assert.equal(s.current, 1);
  s = play(s, 1, 'attack-2x'); assert.equal(s.turnsRemaining, 3); assert.equal(s.current, 2);
});

test('Nope before an action cancels it; another Nope restores it; all cards stay discarded', () => {
  let s = game(); const attack = ensure(s, 0, 'attack-2x'); ensure(s, 1, 'nope'); ensure(s, 2, 'nope');
  s = transition(s, { type: 'PLAY', player: 0, cards: attack });
  s = transition(s, { type: 'NOPE', player: 1 }); assert.equal(s.pending.cancelled, true);
  s = transition(s, { type: 'NOPE', player: 2 }); assert.equal(s.pending.cancelled, false);
  s = resolve(s); assert.equal(s.current, 1); assert.equal(s.turnsRemaining, 2);
  assert.equal(s.discard.filter(c => c.type === 'nope').length, 2);
});

test('a single Nope cancels without consuming the actor turn', () => {
  let s = game(); const skip = ensure(s, 0, 'skip'); ensure(s, 1, 'nope');
  s = transition(s, { type: 'PLAY', player: 0, cards: skip });
  s = transition(s, { type: 'NOPE', player: 1 }); s = resolve(s);
  assert.equal(s.current, 0); assert.equal(s.phase, 'turn'); assert.equal(s.turnsRemaining, 1);
});

test('future reveals at most top three privately, preserves order and does not end the turn', () => {
  let s = game(); const future = ensure(s, 0, 'see-the-future-3x'); const before = [...s.deck];
  s = resolve(transition(s, { type: 'PLAY', player: 0, cards: future }));
  assert.equal(s.phase, 'future'); assert.deepEqual(s.future.cards, before.slice(0, 3)); assert.deepEqual(s.deck, before);
  s = transition(s, { type: 'CLOSE_FUTURE', player: 0 }); assert.equal(s.current, 0); assert.equal(s.phase, 'turn');
});

test('Shuffle forgets remembered future and preserves all cards', () => {
  let s = game(); s.players.forEach(p => { p.known = ['skip']; });
  s = play(s, 0, 'shuffle'); assert.ok(s.players.every(p => p.known.length === 0)); assert.equal(s.current, 0); assertState(s);
});

test('Favor target chooses the given card; actor continues their turn', () => {
  let s = game(); const favor = ensure(s, 0, 'favor'); const chosen = ensure(s, 1, 'defuse')[0];
  s = resolve(transition(s, { type: 'PLAY', player: 0, cards: favor, target: 1 })); assert.equal(s.phase, 'favor');
  s = transition(s, { type: 'GIVE', player: 1, card: chosen });
  assert.ok(s.players[0].hand.some(c => c.uid === chosen)); assert.ok(!s.players[1].hand.some(c => c.uid === chosen)); assert.equal(s.current, 0);
});

test('matching action pair steals one card without applying its own effect', () => {
  let s = game(); const before = s.players[1].hand.length;
  s = play(s, 0, 'attack-2x', 2, { target: 1 }); assert.equal(s.players[1].hand.length, before - 1); assert.equal(s.current, 0); assert.equal(s.attacked, false);
});

test('matching triple requests a named card; a missing request does nothing', () => {
  let s = game(); ensure(s, 1, 'defuse');
  const before = s.players[0].hand.filter(c => c.type === 'defuse').length;
  s = play(s, 0, 'tacocat', 3, { target: 1, request: 'defuse' }); assert.equal(s.players[0].hand.filter(c => c.type === 'defuse').length, before + 1);
  s = play(s, 0, 'beard-cat', 3, { target: 1, request: 'exploding-kitten' }); assert.equal(s.phase, 'turn'); assert.match(s.log.at(-1), /has no Exploding Kitten/);
});

test('single cats can be discarded with no effect; different cats cannot form a pair', () => {
  let s = game(); const first = ensure(s, 0, 'tacocat')[0], second = ensure(s, 0, 'beard-cat')[0];
  assert.throws(() => transition(s, { type: 'PLAY', player: 0, cards: [first, second], target: 1 }), /share a title/);
  s = transition(s, { type: 'PLAY', player: 0, cards: [first] }); assert.equal(s.phase, 'turn'); assert.equal(s.current, 0);
});

test('Nope can cancel combos and does not reverse spent-card discards', () => {
  let s = game(); const pair = ensure(s, 0, 'tacocat', 2); ensure(s, 1, 'nope'); const targetSize = s.players[1].hand.length;
  s = transition(s, { type: 'PLAY', player: 0, cards: pair, target: 1 }); s = transition(s, { type: 'NOPE', player: 1 }); s = resolve(s);
  assert.equal(s.players[1].hand.length, targetSize - 1); assert.ok(pair.every(uid => s.discard.some(c => c.uid === uid)));
});

test('Defuse supports top, middle and bottom insertion without public position leaks', () => {
  for (const where of ['top', 'middle', 'bottom']) {
    let s = game(); ensure(s, 0, 'defuse'); const kitten = top(s, 'exploding-kitten');
    s = transition(s, { type: 'DRAW', player: 0 }); assert.equal(s.phase, 'danger');
    s = transition(s, { type: 'DEFUSE', player: 0 }); assert.equal(s.phase, 'insert');
    const position = where === 'top' ? 0 : where === 'bottom' ? s.deck.length : 3;
    s = transition(s, { type: 'INSERT', player: 0, position }); assert.equal(s.deck[position].uid, kitten.uid); assert.equal(s.current, 1);
    assert.ok(!('position' in s.events.find(e => e.kind === 'insert'))); assert.match(s.log.at(-1), /secretly returned/);
  }
});

test('a successful Defuse completes only one attacked turn', () => {
  let s = play(game(), 0, 'attack-2x'); ensure(s, 1, 'defuse'); top(s, 'exploding-kitten');
  s = transition(s, { type: 'DRAW', player: 1 }); s = transition(s, { type: 'DEFUSE', player: 1 });
  s = transition(s, { type: 'INSERT', player: 1, position: s.deck.length });
  assert.equal(s.current, 1); assert.equal(s.turnsRemaining, 1); assert.equal(s.attacked, true);
});

test('explosion discards the whole hand and skips dead seats', () => {
  let s = game(3); empty(s, 1); const kitten = top(s, 'exploding-kitten'); const ids = s.players[1].hand.map(c => c.uid);
  toTurn(s, 1); s = transition(s, { type: 'DRAW', player: 1 }); s = transition(s, { type: 'EXPLODE', player: 1 });
  assert.equal(s.players[1].alive, false); assert.equal(s.current, 2); assert.ok(s.discard.some(c => c.uid === kitten.uid)); assert.ok(ids.every(id => s.discard.some(c => c.uid === id)));
});

test('last surviving player wins immediately', () => {
  let s = game(1); top(s, 'exploding-kitten'); s = transition(s, { type: 'DRAW', player: 0 }); const hand = s.players[0].hand.map(c => c.uid);
  s = transition(s, { type: 'EXPLODE', player: 0 }); assert.equal(s.phase, 'gameover'); assert.equal(s.winner, 1); assert.equal(s.players[0].hand.length, 0);
  assert.ok(hand.every(id => s.discard.some(c => c.uid === id))); assert.throws(() => transition(s, { type: 'DRAW', player: 1 }), /ended/);
});

test('empty hands are legal; Favor/pair against an empty hand continue safely', () => {
  let s = game(); empty(s, 1); s = play(s, 0, 'favor', 1, { target: 1 }); assert.equal(s.phase, 'turn');
  s = play(s, 0, 'tacocat', 2, { target: 1 }); assert.equal(s.phase, 'turn'); assert.equal(s.players[1].alive, true);
});

test('invalid actions are atomic: wrong actor, duplicate cards, rescue/Nope timing, self targeting', () => {
  const s = game(), snapshot = structuredClone(s); const defuse = ensure(s, 0, 'defuse')[0];
  const before = structuredClone(s);
  for (const command of [{ type: 'DRAW', player: 1 }, { type: 'PLAY', player: 0, cards: [defuse] }, { type: 'PLAY', player: 0, cards: [defuse, defuse], target: 1 }, { type: 'NOPE', player: 0 }, { type: 'DEFUSE', player: 0 }, { type: 'INSERT', player: 0, position: 0 }]) {
    assert.throws(() => transition(s, command)); assert.deepEqual(s, before);
  }
  assert.deepEqual(s, snapshot);
});

test('invalid reinsertion is rejected atomically; no drawn Kitten can be Noped', () => {
  let s = game(); top(s, 'exploding-kitten'); s = transition(s, { type: 'DRAW', player: 0 }); assert.throws(() => transition(s, { type: 'NOPE', player: 0 }));
  s = transition(s, { type: 'DEFUSE', player: 0 }); const before = structuredClone(s);
  assert.throws(() => transition(s, { type: 'INSERT', player: 0, position: s.deck.length + 1 })); assert.deepEqual(s, before);
});

test('save JSON round-trips pending phases and corrupt inventory is rejected', () => {
  let s = game(); const ids = ensure(s, 0, 'attack-2x'); s = transition(s, { type: 'PLAY', player: 0, cards: ids });
  const loaded = JSON.parse(JSON.stringify(s)); assertState(loaded); assert.deepEqual(resolve(loaded), resolve(s));
  loaded.deck.pop(); assert.throws(() => assertState(loaded), /conservation/);
});

test('bot inputs cannot expose opponents hands, private future views, or deck order', () => {
  const s = game(); s.players[1].known = ['skip', 'exploding-kitten']; const v = botView(s, 1);
  assert.ok(!('deck' in v)); assert.ok(!('future' in v)); assert.ok(v.players.every(p => !('hand' in p)));
  assert.deepEqual(v.known, ['skip', 'exploding-kitten']);
  v.hand.pop(); assert.notEqual(v.hand.length, s.players[1].hand.length);
});

test('clever bots use known hazards, but give their own least valuable card for Favor', () => {
  let s = game(); toTurn(s, 1); ensure(s, 1, 'skip'); s.players[1].known = ['exploding-kitten'];
  const a = chooseBotAction(botView(s, 1), () => .9); assert.equal(a.type, 'PLAY'); assert.ok(['skip', 'attack-2x'].includes(s.players[1].hand.find(c => c.uid === a.cards[0]).type));
  const v = botView(s, 1); v.phase = 'favor'; v.hand = [{ uid: 'a', type: 'defuse' }, { uid: 'b', type: 'tacocat' }];
  assert.equal(chooseBotAction(v).card, 'b');
});

test('100 complete games across all seat counts and both bot difficulties conserve cards and finish', () => {
  let totalCommands = 0;
  for (let seed = 1; seed <= 100; seed++) {
    let s = createGame({ bots: 1 + (seed % 4), seed, difficulty: Math.floor(seed / 4) % 2 ? 'casual' : 'clever' });
    let rngSeed = seed;
    const rng = () => { rngSeed = (Math.imul(rngSeed, 1103515245) + 12345) >>> 0; return rngSeed / 4294967296; };
    for (let step = 0; step < 3000 && s.phase !== 'gameover'; step++) {
      const actor = s.phase === 'reaction' ? s.pending.responder : s.phase === 'favor' ? s.favor.from : s.phase === 'future' ? s.future.player : s.current;
      const a = chooseBotAction(botView(s, actor), rng);
      s = transition(s, a); totalCommands++;
    }
    assert.equal(s.phase, 'gameover', `Seed ${seed} did not finish`); assertState(s);
  }
  assert.ok(totalCommands > 1000);
});
