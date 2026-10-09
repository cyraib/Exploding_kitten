import { CARDS } from './catalog.js';

const value = type => ({ defuse: 100, nope: 45, 'attack-2x': 35, skip: 30, shuffle: 20, 'see-the-future-3x': 18, favor: 12 }[type] || 3);

/** Decisions intentionally accept botView, never the deck or other hands. */
export function chooseBotAction(v, rng = Math.random) {
  const base = { player: v.id };
  const catalog = v.catalog || CARDS;
  const effect = type => catalog[type]?.effect || type;
  const find = type => v.hand.find(c => effect(c.type) === type);
  const play = (card, extra = {}) => ({ ...base, type: 'PLAY', cards: [card.uid], ...extra });
  const rivals = v.players.filter(p => p.alive && p.id !== v.id);
  const next = (() => { for (let n = 1; n < v.players.length; n++) { const p = v.players[(v.id + n) % v.players.length]; if (p.alive) return p.id; } })();
  if (v.phase === 'reaction') {
    const a = v.pending;
    const hurts = (a.effect === 'attack-2x' && nextOf(v.players, a.actor) === v.id) || (['pair', 'triple', 'favor'].includes(a.effect) && a.target === v.id);
    const helps = a.actor === v.id;
    const wantNope = a.cancelled ? helps : hurts;
    return { ...base, type: find('nope') && (a.lastNopeBy ?? a.actor) !== v.id && wantNope && rng() < (v.difficulty === 'clever' ? .88 : .42) ? 'NOPE' : 'PASS' };
  }
  if (v.phase === 'future') return { ...base, type: 'CLOSE_FUTURE' };
  if (v.phase === 'steal') return { ...base, type: 'STEAL', index: Math.floor(rng() * v.players[v.steal.from].count) };
  if (v.phase === 'danger') return { ...base, type: find('defuse') ? 'DEFUSE' : 'EXPLODE' };
  if (v.phase === 'insert') return { ...base, type: 'INSERT', position: v.turnsRemaining > 1 ? v.deckCount : v.difficulty === 'clever' && rng() < .7 ? 0 : Math.floor(rng() * (v.deckCount + 1)) };
  if (v.phase === 'favor') return { ...base, type: 'GIVE', card: [...v.hand].sort((a, b) => value(effect(a.type)) - value(effect(b.type)))[0].uid };
  if (v.phase !== 'turn') throw new Error('No bot action available.');
  if (v.turnActions >= 5) return { ...base, type: 'DRAW' };
  const hazard = effect(v.known[0]) === 'exploding-kitten';
  if (hazard || v.attacked || (!find('defuse') && v.deckCount < 12)) {
    if (find('attack-2x')) return play(find('attack-2x'));
    if (find('skip')) return play(find('skip'));
    if (hazard && find('shuffle')) return play(find('shuffle'));
  }
  if (!v.known.length && find('see-the-future-3x') && (v.difficulty === 'clever' || rng() < .4)) return play(find('see-the-future-3x'));
  const target = [...rivals].sort((a, b) => b.count - a.count)[0];
  if (target?.count) {
    const groups = Object.groupBy(v.hand, c => c.type);
    for (const [type, cards] of Object.entries(groups)) {
      if (catalog[type].family === 'cat-card' && cards.length >= 2) {
        const triple = cards.length >= 3 && v.difficulty === 'clever';
        return { ...base, type: 'PLAY', cards: cards.slice(0, triple ? 3 : 2).map(c => c.uid), target: target.id, ...(triple ? { request: 'defuse' } : {}) };
      }
    }
    if (find('favor') && (v.difficulty === 'clever' || rng() < .5)) return play(find('favor'), { target: target.id });
  }
  if (find('attack-2x') && rng() < .22) return play(find('attack-2x'));
  return { ...base, type: 'DRAW' };
}

function nextOf(players, from) {
  for (let n = 1; n < players.length; n++) { const p = players[(from + n) % players.length]; if (p.alive) return p.id; }
}
