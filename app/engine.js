import { CARDS, BASE_CARDS } from './catalog.js';

export const SAVE_VERSION = 1;
export function canNope(s, player) {
  return s?.phase === 'reaction' && Boolean(s.players[player]?.alive)
    && s.players[player].hand.some(c => c.type === 'nope')
    && (s.pending.lastNopeBy ?? s.pending.actor) !== player;
}
const require = (condition, message) => { if (!condition) throw new Error(message); };
const definitions = s => s.catalog || BASE_CARDS;
const cardName = (s, card) => definitions(s)[card.type].name;
function random(s) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function shuffle(s, cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function event(s, kind, details = {}) { s.events.push({ kind, ...details }); }
function log(s, text) { s.log.push(text); s.log = s.log.slice(-80); }
export function nextLiving(s, from) {
  for (let i = 1; i <= s.players.length; i++) {
    const id = (from + i) % s.players.length;
    if (s.players[id].alive) return id;
  }
  throw new Error('No living player');
}
function forget(s) { s.players.forEach(p => { p.known = []; }); }
function endTurn(s) {
  s.turnNumber = (s.turnNumber ?? 1) + 1;
  s.turnActions = 0;
  s.turnsRemaining--;
  if (s.turnsRemaining <= 0) {
    s.current = nextLiving(s, s.current);
    s.turnsRemaining = 1;
    s.attacked = false;
  }
  s.phase = 'turn';
  event(s, 'turn', { player: s.current, remaining: s.turnsRemaining });
}
function removeCard(s, player, uid) {
  const hand = s.players[player].hand;
  const index = hand.findIndex(c => c.uid === uid);
  require(index >= 0, 'That card is not in this hand.');
  return hand.splice(index, 1)[0];
}
function giveCard(s, from, to, card, isPublic = false) {
  s.players[to].hand.push(card);
  event(s, 'steal', { from, to, card, isPublic });
  log(s, `${s.players[from].name} gave a card to ${s.players[to].name}.`);
}
function resolve(s) {
  const action = s.pending;
  s.pending = null;
  s.phase = 'turn';
  if (action.cancelled) {
    log(s, `${s.players[action.actor].name}'s ${action.label} was cancelled.`);
    event(s, 'cancelled');
    return;
  }
  const actor = action.actor;
  if (action.effect === 'pair' || action.effect === 'triple') {
    const target = s.players[action.target];
    if (action.effect === 'pair' && actor === 0 && target.hand.length) {
      // Mix the hidden hand before presenting indistinguishable backs.
      shuffle(s, target.hand);
      s.phase = 'steal';
      s.steal = { from: target.id, to: actor };
      return;
    }
    const index = action.effect === 'pair' ? Math.floor(random(s) * target.hand.length) : target.hand.findIndex(c => c.type === action.request);
    if (index >= 0 && target.hand.length) giveCard(s, target.id, actor, target.hand.splice(index, 1)[0], action.effect === 'triple');
    else log(s, `${target.name} has no ${action.effect === 'triple' ? definitions(s)[action.request].name : 'cards'} to give.`);
  } else if (action.effect === 'attack-2x') {
    const turns = s.attacked ? s.turnsRemaining + 2 : 2;
    s.current = nextLiving(s, actor);
    s.turnNumber = (s.turnNumber ?? 1) + 1;
    s.turnsRemaining = turns;
    s.attacked = true;
    s.turnActions = 0;
    log(s, `${s.players[s.current].name} must take ${turns} turns.`);
    event(s, 'attack', { from: actor, to: s.current, remaining: turns });
  } else if (action.effect === 'skip') {
    endTurn(s);
  } else if (action.effect === 'shuffle') {
    shuffle(s, s.deck);
    forget(s);
    event(s, 'shuffle');
  } else if (action.effect === 'see-the-future-3x') {
    s.players[actor].known = s.deck.slice(0, 3).map(c => c.type);
    s.phase = 'future';
    s.future = { player: actor, cards: s.deck.slice(0, 3) };
    event(s, 'future', { player: actor });
  } else if (action.effect === 'favor') {
    if (s.players[action.target].hand.length) {
      s.phase = 'favor';
      s.favor = { from: action.target, to: actor };
    } else log(s, `${s.players[action.target].name} has no cards to give.`);
  }
}

export function createGame({ bots = 3, name = 'You', difficulty = 'clever', seed = Date.now(), catalog, inventory, deckId, botNames: customNames } = {}) {
  require(Number.isInteger(bots) && bots >= 1 && bots <= 4, 'Choose one to four bots.');
  require(['casual', 'clever'].includes(difficulty), 'Unknown bot difficulty.');
  const botNames = customNames || ['Peachy', 'Prootzel', 'Jazzy', 'Dolores'];
  const players = Array.from({ length: bots + 1 }, (_, id) => ({ id, name: id ? botNames[id - 1] : String(name).trim().slice(0, 18) || 'You', bot: id !== 0, alive: true, hand: [], known: [] }));
  const s = { version: SAVE_VERSION, seed: Number(seed) >>> 0, difficulty, players, deck: [], discard: [], removed: [], current: 0,
    turnsRemaining: 1, turnNumber: 1, attacked: false, turnActions: 0, phase: 'turn', pending: null, future: null, favor: null, danger: null, winner: null, events: [], log: [], steps: 0 };
  if (catalog || inventory) {
    require(catalog && inventory, 'Provide both catalog and inventory.');
    s.catalog = structuredClone(catalog); s.inventory = structuredClone(inventory); s.deckId = deckId || 'custom';
    require(Object.entries(inventory).every(([id,count]) => catalog[id] && Number.isInteger(count) && count >= 0 && count <= 200), 'Invalid custom inventory.');
    require(inventory.defuse >= players.length && inventory['exploding-kitten'] >= players.length - 1, 'Insufficient rescue/hazard cards.');
  }
  const counts = s.inventory || Object.fromEntries(Object.entries(BASE_CARDS).map(([id,c])=>[id,c.count]));
  const all = Object.entries(counts).flatMap(([type, count]) => Array.from({ length: count }, (_, i) => ({ uid: `${type}:${i}`, type })));
  const defuses = all.filter(c => c.type === 'defuse');
  const kittens = all.filter(c => c.type === 'exploding-kitten');
  s.deck = all.filter(c => !['defuse', 'exploding-kitten'].includes(c.type));
  players.forEach(p => p.hand.push(defuses.pop()));
  const extra = players.length <= 3 ? 2 : defuses.length;
  s.deck.push(...defuses.splice(0, extra));
  s.removed.push(...defuses);
  shuffle(s, s.deck);
  require(s.deck.length >= 7 * players.length, 'Insufficient cards for initial hands.');
  for (let i = 0; i < 7; i++) players.forEach(p => p.hand.push(s.deck.shift()));
  s.deck.push(...kittens.splice(0, players.length - 1));
  s.removed.push(...kittens);
  shuffle(s, s.deck);
  log(s, `${players.length} players. Eight-card hands. Draw at the end of your turn.`);
  assertState(s);
  return s;
}

/** Pure command transition. Rejected commands never partially mutate a game. */
export function transition(state, command) {
  const s = structuredClone(state);
  s.turnNumber ??= 1;
  const actor = command.player;
  require(Number.isInteger(actor) && s.players[actor]?.alive, 'Choose a living player.');
  require(s.phase !== 'gameover', 'This game has ended.');
  s.events = [];
  if (command.type === 'PLAY') {
    require(s.phase === 'turn' && actor === s.current, 'Wait for your turn.');
    const ids = command.cards;
    require(Array.isArray(ids) && ids.length >= 1 && ids.length <= 3 && new Set(ids).size === ids.length, 'Select one card or two/three matching cards.');
    const cards = ids.map(uid => s.players[actor].hand.find(c => c.uid === uid));
    require(cards.every(Boolean), 'A selected card is no longer in your hand.');
    const type = cards[0].type;
    require(cards.every(c => c.type === type), 'Combo cards must share a title.');
    require(type !== 'exploding-kitten', 'An Exploding Kitten is not an action card.');
    require(ids.length > 1 || !['nope', 'defuse'].includes(type), type === 'nope' ? 'Use Nope during a response.' : 'Save Defuse for an Exploding Kitten, or use it in a matching combo.');
    const definition = definitions(s)[type];
    const effect = ids.length === 2 ? 'pair' : ids.length === 3 ? 'triple' : (definition.effect || type);
    if (['pair', 'triple', 'favor'].includes(effect)) require(Number.isInteger(command.target) && s.players[command.target]?.alive && command.target !== actor, 'Choose another living player.');
    if (effect === 'attack-2x' && command.target !== undefined) require(command.target === nextLiving(s, actor), 'Attack targets the next living player clockwise.');
    if (effect === 'triple') require(Boolean(definitions(s)[command.request]), 'Name the card you want to request.');
    cards.forEach(c => { removeCard(s, actor, c.uid); s.discard.push(c); event(s, 'play', { player: actor, card: c }); });
    s.turnActions++;
    const label = ids.length > 1 ? `${ids.length}-card ${cardName(s,cards[0])} combo` : cardName(s,cards[0]);
    log(s, `${s.players[actor].name} played ${label}${command.target !== undefined ? ` on ${s.players[command.target].name}` : ''}${effect === 'triple' ? `, requesting ${definitions(s)[command.request].name}` : ''}.`);
    if (ids.length === 1 && definition.family === 'cat-card') {
      log(s, 'A single cat has no effect. Save a matching pair or triple for a combo.');
    } else {
      s.pending = { actor, effect, target: command.target ?? null, request: command.request ?? null, label, cardType: type, cancelled: false, lastNopeBy: null, nopeCount: 0, responder: nextLiving(s, actor), passed: [] };
      s.phase = 'reaction';
    }
  } else if (command.type === 'PASS' || command.type === 'NOPE') {
    require(s.phase === 'reaction' && (command.type === 'NOPE' || actor === s.pending.responder), 'It is not your response window.');
    if (command.type === 'NOPE') {
      const card = s.players[actor].hand.find(c => c.type === 'nope' && (!command.card || c.uid === command.card));
      require(Boolean(card), 'You do not have a Nope.');
      require(canNope(s, actor), 'You cannot Nope your own action or your own Nope.');
      removeCard(s, actor, card.uid);
      s.discard.push(card);
      s.pending.cancelled = !s.pending.cancelled;
      s.pending.lastNopeBy = actor;
      s.pending.nopeCount = (s.pending.nopeCount ?? 0) + 1;
      s.pending.passed = [];
      log(s, `${s.players[actor].name} played Nope. The action is ${s.pending.cancelled ? 'cancelled' : 'restored'} unless countered.`);
      event(s, 'play', { player: actor, card });
      event(s, 'nope', { cancelled: s.pending.cancelled });
    } else s.pending.passed.push(actor);
    s.pending.responder = nextLiving(s, actor);
    if (s.pending.passed.length >= s.players.filter(p => p.alive).length) resolve(s);
  } else if (command.type === 'DRAW') {
    require(s.phase === 'turn' && actor === s.current, 'You can only draw on your turn, between actions.');
    require(s.deck.length > 0, 'The draw pile is empty.');
    const card = s.deck.shift();
    s.players.forEach(p => { p.known.shift(); });
    event(s, 'draw', { player: actor, card });
    if (card.type === 'exploding-kitten') {
      s.danger = { player: actor, card };
      s.phase = 'danger';
      log(s, `${s.players[actor].name} drew an Exploding Kitten!`);
      event(s, 'danger', { player: actor });
    } else {
      s.players[actor].hand.push(card);
      log(s, `${s.players[actor].name} drew a card.`);
      endTurn(s);
    }
  } else if (command.type === 'DEFUSE') {
    require(s.phase === 'danger' && actor === s.danger.player, 'There is no Kitten for you to defuse.');
    const card = s.players[actor].hand.find(c => c.type === 'defuse');
    require(Boolean(card), 'No Defuse remains in your hand.');
    removeCard(s, actor, card.uid);
    s.discard.push(card);
    s.phase = 'insert';
    log(s, `${s.players[actor].name} defused the Kitten.`);
    event(s, 'play', { player: actor, card });
    event(s, 'defuse', { player: actor });
  } else if (command.type === 'INSERT') {
    require(s.phase === 'insert' && actor === s.danger.player, 'You cannot reinsert a Kitten now.');
    require(Number.isInteger(command.position) && command.position >= 0 && command.position <= s.deck.length, 'Choose a valid insertion position.');
    s.deck.splice(command.position, 0, s.danger.card);
    // Only the inserter knows the chosen position; opponents never receive it.
    event(s, 'insert', { player: actor, card: s.danger.card });
    s.danger = null;
    forget(s);
    if (command.position === 0) s.players[actor].known = ['exploding-kitten'];
    log(s, `${s.players[actor].name} secretly returned the Kitten to the draw pile.`);
    endTurn(s);
  } else if (command.type === 'EXPLODE') {
    require(s.phase === 'danger' && actor === s.danger.player, 'You are not resolving an explosion.');
    const p = s.players[actor];
    s.turnNumber++;
    s.discard.push(...p.hand, s.danger.card);
    p.hand = [];
    p.known = [];
    p.alive = false;
    s.danger = null;
    log(s, `${p.name} exploded and is out of the game.`);
    event(s, 'explode', { player: actor });
    const living = s.players.filter(p => p.alive);
    if (living.length === 1) {
      s.winner = living[0].id;
      s.phase = 'gameover';
      s.turnsRemaining = 1;
      s.attacked = false;
      s.turnActions = 0;
      log(s, `${living[0].name} is the last survivor!`);
      event(s, 'win', { player: s.winner });
    } else {
      s.current = nextLiving(s, actor);
      s.turnsRemaining = 1;
      s.attacked = false;
      s.turnActions = 0;
      s.phase = 'turn';
    }
  } else if (command.type === 'STEAL') {
    require(s.phase === 'steal' && actor === s.steal.to, 'You are not choosing a stolen card.');
    const hand = s.players[s.steal.from].hand;
    require(Number.isInteger(command.index) && command.index >= 0 && command.index < hand.length, 'Choose a face-down card.');
    giveCard(s, s.steal.from, actor, hand.splice(command.index, 1)[0]);
    s.steal = null;
    s.phase = 'turn';
  } else if (command.type === 'GIVE') {
    require(s.phase === 'favor' && actor === s.favor.from, 'You are not choosing a Favor card.');
    const card = removeCard(s, actor, command.card);
    giveCard(s, actor, s.favor.to, card);
    s.favor = null;
    s.phase = 'turn';
  } else if (command.type === 'CLOSE_FUTURE') {
    require(s.phase === 'future' && actor === s.future.player, 'You are not viewing the future.');
    s.future = null;
    s.phase = 'turn';
  } else throw new Error('Unknown game command.');
  s.steps++;
  assertState(s);
  return s;
}

/** A bot receives its own hand/remembered peek and only public opponent data. */
export function botView(s, id) {
  const p = s.players[id];
  return { id, hand: structuredClone(p.hand), known: [...p.known], catalog: definitions(s), difficulty: s.difficulty, phase: s.phase, current: s.current,
    turnsRemaining: s.turnsRemaining, attacked: s.attacked, turnActions: s.turnActions, deckCount: s.deck.length,
    players: s.players.map(q => ({ id: q.id, name: q.name, alive: q.alive, count: q.hand.length })),
    pending: s.pending ? structuredClone(s.pending) : null,
    favor: s.favor ? { ...s.favor } : null,
    steal: s.steal ? { ...s.steal } : null,
    dangerPlayer: s.danger?.player ?? null,
  };
}

export function assertState(s) {
  require(s?.version === SAVE_VERSION && Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 5, 'Invalid saved game.');
  require(['turn', 'reaction', 'steal', 'future', 'favor', 'danger', 'insert', 'gameover'].includes(s.phase), 'Invalid game phase.');
  require(['casual', 'clever'].includes(s.difficulty) && Number.isInteger(s.seed) && s.seed >= 0 && s.seed <= 0xffffffff, 'Invalid game settings.');
  require(Number.isInteger(s.turnActions) && s.turnActions >= 0 && Number.isInteger(s.steps) && s.steps >= 0 && typeof s.attacked === 'boolean', 'Invalid turn state.');
  require(Array.isArray(s.log) && s.log.every(t => typeof t === 'string') && Array.isArray(s.events), 'Invalid game history.');
  const cards = [...s.deck, ...s.discard, ...s.removed, ...s.players.flatMap(p => p.hand), ...(s.danger ? [s.danger.card] : [])];
  const catalog = definitions(s), inventory = s.inventory || Object.fromEntries(Object.entries(BASE_CARDS).map(([id,c])=>[id,c.count]));
  if (s.inventory) {
    require(s.catalog && typeof s.catalog === 'object' && Object.entries(inventory).every(([id,count]) => catalog[id] && Number.isInteger(count) && count >= 0 && count <= 200), 'Invalid saved inventory.');
    require(Object.values(catalog).every(c => ['attack-2x','skip','favor','shuffle','see-the-future-3x','nope','defuse','exploding-kitten','cat-card'].includes(c.effect || c.family)), 'Unsupported saved card effect.');
  }
  const total = Object.values(inventory).reduce((n,c)=>n+c,0);
  require(total >= 1 && total <= 500 && cards.length === total && new Set(cards.map(c => c.uid)).size === total, 'Card conservation failed.');
  for (const [type, count] of Object.entries(inventory)) {
    require(cards.filter(c => c.type === type).length === count, `Incorrect ${type} inventory.`);
    for (let i = 0; i < count; i++) require(cards.some(c => c.uid === `${type}:${i}` && c.type === type), 'Invalid card identity.');
  }
  require(s.players.every((p, id) => p.id === id && p.bot === (id !== 0) && typeof p.name === 'string' && p.name.length > 0 && typeof p.alive === 'boolean' && Array.isArray(p.known) && p.known.every(t => catalog[t])), 'Invalid players.');
  require(s.players.every(p => p.hand.every(c => c.type !== 'exploding-kitten') && (p.alive || p.hand.length === 0)), 'Invalid hand.');
  require(Number.isInteger(s.current) && s.players[s.current] && (s.phase === 'gameover' || s.players[s.current].alive), 'Invalid current seat.');
  require(Number.isInteger(s.turnsRemaining) && s.turnsRemaining >= 1, 'Invalid remaining turns.');
  require(s.turnNumber === undefined || (Number.isInteger(s.turnNumber) && s.turnNumber >= 1), 'Invalid turn number.');
  const living = s.players.filter(p => p.alive).length;
  require(s.phase === 'gameover' ? living === 1 : living >= 2, 'Invalid survivor count.');
  require(s.attacked || s.turnsRemaining === 1, 'Invalid Attack debt.');
  require(s.deck.filter(c => c.type === 'exploding-kitten').length + (s.danger ? 1 : 0) === living - 1, 'Invalid live Kitten count.');
  require(Boolean(s.pending) === (s.phase === 'reaction') && Boolean(s.future) === (s.phase === 'future') && Boolean(s.favor) === (s.phase === 'favor') && Boolean(s.steal) === (s.phase === 'steal') && Boolean(s.danger) === ['danger', 'insert'].includes(s.phase), 'Stale special interaction.');
  if (s.phase === 'reaction') {
    const a = s.pending;
    require(a.actor === s.current && s.players[a.responder]?.alive && ['pair', 'triple', 'attack-2x', 'skip', 'shuffle', 'see-the-future-3x', 'favor'].includes(a.effect) && typeof a.label === 'string' && typeof a.cancelled === 'boolean', 'Invalid response window.');
    require(Array.isArray(a.passed) && new Set(a.passed).size === a.passed.length && !a.passed.includes(a.responder) && a.passed.length < living && a.passed.every(id => Number.isInteger(id) && s.players[id]?.alive), 'Invalid response passes.');
    require(a.lastNopeBy == null || (Number.isInteger(a.lastNopeBy) && s.players[a.lastNopeBy]?.alive), 'Invalid Nope actor.');
    require(a.cardType === undefined || Boolean(catalog[a.cardType]), 'Invalid response card.');
    if (['pair', 'triple', 'favor'].includes(a.effect)) require(Number.isInteger(a.target) && s.players[a.target]?.alive && a.target !== a.actor, 'Invalid response target.');
    if (a.effect === 'triple') require(Boolean(catalog[a.request]), 'Invalid requested card.');
  }
  if (s.phase === 'future') require(s.future?.player === s.current && Array.isArray(s.future.cards) && s.future.cards.length === Math.min(3, s.deck.length) && s.future.cards.every((c, i) => c.uid === s.deck[i].uid && c.type === s.deck[i].type), 'Invalid future view.');
  if (s.phase === 'favor') require(s.favor && s.favor.to === s.current && s.players[s.favor.from]?.alive && s.favor.from !== s.favor.to && s.players[s.favor.from].hand.length > 0, 'Invalid Favor.');
  if (s.phase === 'steal') require(s.steal?.to === s.current && s.players[s.steal.from]?.alive && s.steal.from !== s.steal.to && s.players[s.steal.from].hand.length > 0, 'Invalid theft choice.');
  if (['danger', 'insert'].includes(s.phase)) require(s.danger?.player === s.current && s.danger.card.type === 'exploding-kitten', 'Invalid explosion.');
  if (s.phase === 'gameover') require(s.players.filter(p => p.alive).length === 1 && s.players[s.winner]?.alive, 'Invalid winner.');
  return true;
}
