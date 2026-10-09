// Human-hand presentation order only. Never reorder the engine hand: blind
// theft uses its exact indexes, and bots must not learn the human's arrangement.

function handCards(hand) {
  const cards = new Map();
  for (const card of Array.isArray(hand) ? hand : []) {
    if (card && typeof card.uid === 'string' && !cards.has(card.uid)) cards.set(card.uid, card);
  }
  return cards;
}

/**
 * Preserve surviving displayed cards and place each arrival after the last
 * matching type. An empty/unset order starts in the engine's dealt order.
 * Returns UIDs only, so companion UI saves do not duplicate card information.
 */
export function syncHandOrder(order, hand) {
  const cards = handCards(hand);
  if (!Array.isArray(order) || order.length === 0) return [...cards.keys()];
  const seen = new Set();
  const next = order.filter(uid => {
    if (!cards.has(uid) || seen.has(uid)) return false;
    seen.add(uid);
    return true;
  });
  for (const [uid, card] of cards) {
    if (seen.has(uid)) continue;
    let matchingIndex = -1;
    for (let i = 0; i < next.length; i++) {
      if (cards.get(next[i]).type === card.type) matchingIndex = i;
    }
    next.splice(matchingIndex < 0 ? next.length : matchingIndex + 1, 0, uid);
    seen.add(uid);
  }
  return next;
}

/** Move one displayed UID before/after another; missing/self targets are inert. */
export function moveHandCard(order, uid, targetUid, after = false) {
  const next = Array.isArray(order) ? [...order] : [];
  const sourceIndex = next.indexOf(uid);
  if (uid === targetUid || sourceIndex < 0 || !next.includes(targetUid)) return next;
  next.splice(sourceIndex, 1);
  next.splice(next.indexOf(targetUid) + (after ? 1 : 0), 0, uid);
  return next;
}

/** Group exact types in first-displayed-type order, retaining order within each. */
export function groupHandOrder(order, hand) {
  const cards = handCards(hand);
  const groups = new Map();
  for (const uid of syncHandOrder(order, hand)) {
    const type = cards.get(uid).type;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(uid);
  }
  return [...groups.values()].flat();
}
