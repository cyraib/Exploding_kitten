import { symbolMarkup } from './steam-visuals.js';

// Short card movements. The engine alone owns order and reaction timing.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createSteamScenes({ animate, finalFrame, getEpoch, isCalm, cardFace, backFace, centerRect, getPlayers }) {
  const alive = token => token === undefined || token === getEpoch();
  const playerName = (id, name) => name || (getPlayers?.() || []).find(p => p.id === id)?.name || 'Player';
  const center = () => centerRect?.() || { cx: innerWidth / 2, cy: innerHeight / 2, w: 132, h: 184 };
  const bounds = r => r && ({ ...r, w: r.w || 132, h: r.h || 184, cx: r.cx ?? r.x + (r.w || 132) / 2, cy: r.cy ?? r.y + (r.h || 184) / 2 });
  function node(className, html = '') {
    const el = document.createElement('div');
    el.className = `steam-scene ${className}`;
    el.setAttribute('aria-hidden', 'true'); el.innerHTML = html;
    document.getElementById('fx')?.appendChild(el);
    return el;
  }
  async function step(el, frames, ms, id, token) {
    if (!alive(token)) return false;
    if (await animate(el, frames, ms, id) === false || !alive(token)) return false;
    const last = finalFrame?.(frames, id) || frames.at(-1);
    for (const [key, value] of Object.entries(last)) if (!['offset', 'easing', 'composite'].includes(key)) el.style[key] = value;
    return true;
  }
  function faceNode(card, face) {
    let el;
    if (face) {
      const template = document.createElement('template');
      template.innerHTML = cardFace(card); el = template.content.firstElementChild;
    } else {
      el = document.createElement('div'); el.className = 'card-back'; el.innerHTML = backFace();
    }
    el.classList.add('fly-card', 'steam-flight-card');
    return el;
  }
  function rig(card, r, face) {
    const cardEl = faceNode(card, face), group = node('steam-flight-rig');
    group.style.left = `${r.cx}px`; group.style.top = `${r.cy}px`; group.appendChild(cardEl);
    return { group, cardEl };
  }
  async function cue(kind, title, detail, token, { symbol, ms = 380, id = 'stamp', offsetY = -85 } = {}) {
    if (!alive(token)) return;
    const el = node(`steam-cue steam-cue-${kind}`, `<div class="steam-cue-content">${symbol ? `<span class="steam-cue-symbol">${symbolMarkup(symbol)}</span>` : ''}<span class="steam-bubble"><strong>${escape(title)}</strong>${detail ? `<small>${escape(detail)}</small>` : ''}</span></div>`);
    const r = center();
    el.style.left = `${clamp(r.cx, 80, Math.max(80, innerWidth - 80))}px`;
    el.style.top = `${clamp(r.cy + offsetY, 80, Math.max(80, innerHeight - 80))}px`;
    try {
      await step(el, isCalm() ? [{ opacity: 1 }, { opacity: 1 }] : [{ opacity: 0 }, { offset: .12, opacity: 1 }, { offset: .88, opacity: 1 }, { opacity: 0 }], isCalm() ? 100 : ms, id, token);
    } finally { el.remove(); }
  }
  async function turn({ player = 0, name, attacked = false, remaining = 1 }, token) {
    return cue('turn', player === 0 ? 'YOUR TURN' : `${playerName(player, name)}'S TURN`, attacked ? `${remaining} TURNS TO SURVIVE` : '', token, { ms: 260, id: 'turn-banner' });
  }

  // Expose the destination before removing this sprite. Both endpoints remain
  // opaque, so hand -> flight -> discard has no missing-card frame.
  async function handFlight(card, from, to, { face = true, id = 'flight', token, ms = 320, onArrive } = {}) {
    const start = bounds(from), end = bounds(to);
    if (!alive(token)) return;
    if (!start || !end || isCalm()) { onArrive?.(); return; }
    const { group } = rig(card, start, face);
    const dx = end.cx - start.cx, dy = end.cy - start.cy;
    const first = clamp(start.w / 132, .35, 1.12), last = clamp(end.w / 132, .35, 1.12);
    try {
      if (!await step(group, [
        { transform: `translate(0,0) scale(${first})`, opacity: 1 },
        { offset: .5, transform: `translate(${dx * .5}px,${dy * .5 - Math.min(14, Math.abs(dx) * .025)}px) scale(${(first + last) / 2})`, opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(${last})`, opacity: 1 },
      ], ms, id, token)) return;
      onArrive?.();
    } finally { group.remove(); }
  }
  async function draw(card, from, to, { face = false, token, hazard = false, onArrive } = {}) {
    const start = bounds(from), end = bounds(to);
    if (!alive(token)) return;
    if (!start || !end || isCalm()) { onArrive?.(); return; }
    if (!face) return handFlight(card, start, end, { face: false, token, ms: 280, id: 'draw-reveal', onArrive });
    const { group, cardEl } = rig(card, start, false);
    const mid = center(), mx = mid.cx - start.cx, my = mid.cy - start.cy;
    const dx = end.cx - start.cx, dy = end.cy - start.cy;
    const midTransform = `translate(${mx}px,${my}px) scale(${innerWidth < 700 ? .9 : 1.08})`;
    try {
      if (!await step(group, [{ transform: `translate(0,0) scale(${clamp(start.w / 132, .35, 1.12)})`, opacity: 1 }, { transform: midTransform, opacity: 1 }], 160, 'draw-reveal', token)) return;
      if (!await step(cardEl, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], 60, 'draw-reveal', token)) return;
      const front = faceNode(card, true);
      cardEl.className = front.className; cardEl.innerHTML = front.innerHTML;
      if (front.style.cssText) cardEl.style.cssText += front.style.cssText;
      if (!await step(cardEl, [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], 60, 'draw-reveal', token)) return;
      if (!await step(group, [{ transform: midTransform, opacity: 1 }, { transform: midTransform, opacity: 1 }], hazard ? 180 : 100, 'draw-reveal', token)) return;
      if (!await step(group, [{ transform: midTransform, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${clamp(end.w / 132, .35, 1.12)})`, opacity: 1 }], 180, 'draw-reveal', token)) return;
      onArrive?.();
    } finally { group.remove(); }
  }
  const nope = ({ cancelled = true }, token) => cue('nope', cancelled ? 'NOPE!' : 'YUP!', cancelled ? 'ACTION CANCELLED' : 'ACTION RESTORED', token);
  const danger = (_, token) => cue('danger', 'EXPLODING KITTEN!', 'DEFUSE IT TO SURVIVE.', token, { symbol: 'flame', id: 'danger-flash' });
  const defuse = (_, token) => cue('defuse', 'DEFUSED!', 'RETURN THE KITTEN SECRETLY.', token, { symbol: 'safe', id: 'defuse-cancel' });
  const explode = ({ player = 0, name }, token) => cue('explode', `${playerName(player, name)} EXPLODED!`, 'OUT OF THIS MATCH.', token, { symbol: 'skull', ms: 500 });
  const win = ({ player = 0, name }, token) => cue('win', `${playerName(player, name)} WINS!`, 'LAST CAT STANDING.', token, { symbol: 'crown', ms: 650, id: 'confetti' });

  async function shuffle(deck, token) {
    const r = bounds(deck);
    if (!r || !alive(token) || isCalm()) return;
    const el = node('steam-shuffle');
    el.style.left = `${r.cx}px`; el.style.top = `${r.cy}px`;
    el.style.transform = `scale(${clamp(r.w / 132, .35, 1.12)})`;
    // Two packets split, interleave, then square. All six cards are backs.
    const cards = Array.from({ length: 6 }, (_, i) => {
      const card = faceNode(null, false); card.style.zIndex = String(i + 1); el.appendChild(card); return card;
    });
    try {
      await Promise.all(cards.map((card, i) => {
        const packet = i % 2 ? 1 : -1, layer = Math.floor(i / 2);
        return step(card, [
          { transform: `translate(${layer}px,${-layer}px)`, opacity: 1 },
          { offset: .28, transform: `translate(${packet * 35}px,${-10 - layer * 3}px) rotate(${packet * 4}deg)`, opacity: 1 },
          { offset: .48 + layer * .055, transform: `translate(${packet * (8 - layer * 2)}px,${-4 - i * 2}px) rotate(${packet}deg)`, opacity: 1 },
          { offset: .82, transform: `translate(${i * .7}px,${-i * .7}px)`, opacity: 1 },
          { transform: 'translate(0,0)', opacity: 1 },
        ], 540, 'shuffle-flight', token);
      }));
    } finally { el.remove(); }
  }

  // No card, insertion index or deck contents enter this API. Every secret
  // choice uses the same visual gap and timing, including top and bottom.
  async function reinsert(from, deck, { token } = {}) {
    const r = bounds(deck), start = bounds(from) || center();
    if (!r || !alive(token) || isCalm()) return;
    const el = node('steam-reinsert');
    el.style.left = `${r.cx}px`; el.style.top = `${r.cy}px`;
    const scale = clamp(r.w / 132, .35, 1.12);
    const lower = faceNode(null, false), incoming = faceNode(null, false), upper = faceNode(null, false);
    lower.classList.add('steam-deck-packet', 'steam-deck-lower');
    upper.classList.add('steam-deck-packet', 'steam-deck-upper');
    incoming.classList.add('steam-insert-card');
    lower.style.transform = `scale(${scale})`; upper.style.transform = `scale(${scale})`;
    el.append(lower, incoming, upper);
    const begin = `translate(${start.cx - r.cx}px,${start.cy - r.cy}px) scale(${clamp(start.w / 132, .35, 1.12)})`;
    const waiting = `translate(${r.w * .55 + 25}px,12px) scale(${scale})`;
    const gap = `translate(0,8px) scale(${scale})`;
    const lifted = `translate(0,${-r.h * .22 - 12}px) scale(${scale})`;
    try {
      const opened = await Promise.all([
        step(upper, [{ transform: `scale(${scale})`, opacity: 1 }, { transform: lifted, opacity: 1 }], 180, 'shuffle-flight', token),
        step(incoming, [{ transform: begin, opacity: 1 }, { transform: waiting, opacity: 1 }], 180, 'shuffle-flight', token),
      ]);
      if (opened.some(done => !done) || !alive(token)) return;
      if (!await step(incoming, [{ transform: waiting, opacity: 1 }, { transform: gap, opacity: 1 }], 240, 'shuffle-flight', token)) return;
      if (!await step(upper, [{ transform: lifted, opacity: 1 }, { transform: `scale(${scale})`, opacity: 1 }], 160, 'shuffle-flight', token)) return;
    } finally { el.remove(); }
  }
  return { turn, handFlight, draw, nope, danger, defuse, explode, win, shuffle, reinsert };
}
