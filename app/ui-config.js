// Presentation timing is separate from the three-second gameplay response window.
import { project } from './config/runtime.js';
export const MOTION = Object.freeze({ ui: 200, card: 420, reveal: 850, deal: 200 });

// Add supported decks/modes here when their engines are ready.
export const DECK_OPTIONS = Object.freeze(project?.decks?.filter(d=>d.enabled).map(d=>({...d,available:true})) || [
  { id: 'original', name: 'Original Edition', description: '56 cards · 2–5 players', available: true },
]);
export const MODE_OPTIONS = Object.freeze([
  { id: 'bots', name: 'Play with bots', description: 'One human with 1–4 bot opponents', available: true },
]);

export function selectionHint(cards, catalog, remaining = 1, attacked = false) {
  if (!cards.length) return 'Pick a card to play, or draw to finish your turn.';
  if (cards.length === 2) return 'PAIR — Choose a player, then steal one unknown card.';
  if (cards.length === 3) return 'TRIPLE — Request a card by name from a player.';
  const type = catalog[cards[0].type].effect || cards[0].type;
  if (type === 'attack-2x') return `ATTACK — Next living player takes ${attacked ? remaining + 2 : 2} turns.`;
  if (type === 'skip') return `SKIP — Finish one turn without drawing${remaining > 1 ? `; ${remaining - 1} left` : ''}.`;
  if (type === 'nope') return 'NOPE — Use the red response button when an opponent acts.';
  if (type === 'defuse') return 'DEFUSE — Save it for an Exploding Kitten, or use a matching combo.';
  return `${catalog[cards[0].type].name.toUpperCase()} — ${catalog[cards[0].type].description}`;
}
