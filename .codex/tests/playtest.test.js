import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, transition, assertState, botView } from '../../app/engine.js';
import { chooseBotAction } from '../../app/bots.js';

test('card-conserving but impossible saves are rejected before resume', () => {
  const invalid = [
    s => { s.attacked = false; s.turnsRemaining = 4; },
    s => { s.players[0].name = null; },
    s => { s.log = null; },
    s => { s.favor = { from: 1, to: 0 }; },
    s => { s.turnActions = -1; },
    s => { const i = s.deck.findIndex(c => c.type === 'exploding-kitten'); s.removed.push(s.deck.splice(i, 1)[0]); },
    s => { s.phase = 'reaction'; s.pending = { actor: 0, responder: 1, effect: 'unknown', label: 'broken', cancelled: false, passed: [] }; },
    s => { s.phase = 'future'; s.future = { player: 0, cards: s.deck.slice(1, 4) }; },
    s => { s.phase = 'favor'; s.favor = { from: 0, to: 0 }; },
  ];
  for (const corrupt of invalid) {
    const s = createGame({ bots: 3, seed: 55 }); corrupt(s);
    assert.throws(() => assertState(JSON.parse(JSON.stringify(s))));
  }
  let s = createGame({ bots: 2, seed: 55 });
  // A supported action in the saved response window, with an impossible pass cycle.
  const skip = [...s.deck, ...s.players[0].hand].find(c => c.type === 'skip');
  if (!s.players[0].hand.includes(skip)) { s.deck.splice(s.deck.indexOf(skip), 1); s.players[0].hand.push(skip); }
  s = transition(s, { type: 'PLAY', player: 0, cards: [skip.uid] });
  s.pending.passed = [s.pending.responder];
  assert.throws(() => assertState(s), /response passes/);
});

test('all reachable phases resume with the same deterministic legal command', () => {
  const phases = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    let s = createGame({ bots: 1 + seed % 4, seed });
    for (let n = 0; n < 2000 && s.phase !== 'gameover'; n++) {
      phases.add(s.phase);
      const actor = s.phase === 'reaction' ? s.pending.responder : s.phase === 'favor' ? s.favor.from : s.current;
      const command = chooseBotAction(botView(s, actor), () => .51);
      const loaded = JSON.parse(JSON.stringify({ ...s, events: [] }));
      assertState(loaded);
      const next = transition(s, command);
      assert.deepEqual(transition(loaded, command), next);
      s = next;
    }
    assert.equal(s.phase, 'gameover'); phases.add('gameover'); assertState(JSON.parse(JSON.stringify(s)));
  }
  assert.deepEqual([...phases].sort(), ['danger', 'favor', 'future', 'gameover', 'insert', 'reaction', 'steal', 'turn']);
});

test('last-card Defuse and repeated Attack draws cannot strand an empty deck', () => {
  let s = createGame({ bots: 1, seed: 88 });
  const kitten = s.deck.find(c => c.type === 'exploding-kitten');
  s.discard.push(...s.deck.filter(c => c !== kitten)); s.deck = [kitten];
  s.attacked = true; s.turnsRemaining = 2;
  s = transition(s, { type: 'DRAW', player: 0 });
  s = transition(s, { type: 'DEFUSE', player: 0 });
  assert.equal(s.deck.length, 0);
  s = transition(s, { type: 'INSERT', player: 0, position: 0 });
  assert.equal(s.current, 0); assert.equal(s.turnsRemaining, 1); assert.equal(s.deck.length, 1);
  s = transition(s, { type: 'DRAW', player: 0 });
  s.discard.push(...s.players[0].hand); s.players[0].hand = [];
  s = transition(s, { type: 'EXPLODE', player: 0 });
  assert.equal(s.phase, 'gameover'); assert.equal(s.deck.length, 0); assertState(s);
});
