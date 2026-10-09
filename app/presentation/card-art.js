// Small original vector accents over the supplied, unmodified flattened scans.
// These are a reconstruction, not the Steam game's character rigs or timings.
// This module never reads game state, fetches assets, or reveals a hidden card.

const star = (x, y, size = 10, color = '#fff3a8') => `<path class="art-twinkle" fill="${color}" d="M${x} ${y - size}l${size * .3} ${size * .7} ${size * .7} ${size * .3}-${size * .7} ${size * .3}-${size * .3} ${size * .7}-${size * .3}-${size * .7}-${size * .7}-${size * .3} ${size * .7}-${size * .3}z"/>`;

// Coordinates use a 720 x 1008 scan canvas. Clip bounds exclude printed headers,
// bottom labels and rules; individual shapes also avoid interior speech text.
const ART = Object.freeze({
  '/Assets/cards/cat-card/artworks/Rainbow-Ralphing-Cat.jpg': {
    kind: 'rainbow', top: 25, bottom: 32,
    shapes: `<g class="art-rainbow-flow" fill="none" stroke-linecap="round"><path d="M240 425Q412 286 655 336" stroke="#fffdbe" stroke-width="5" opacity=".5"/><path d="M244 435Q429 320 655 370" stroke="#fffbe0" stroke-width="4" opacity=".3"/></g>${star(408, 319, 9)}${star(548, 326, 11)}${star(624, 440, 8)}`,
  },
  '/Assets/cards/cat-card/artworks/Tacocat.jpg': {
    kind: 'taco', top: 38, bottom: 21,
    shapes: `<g class="art-bob-accent" fill="none" stroke="#c28e37" stroke-width="4" stroke-linecap="round" opacity=".6"><path d="M151 749q30 12 58 6"/><path d="M490 742q30 14 55 8"/></g><g class="art-blink" fill="#e5a620" stroke="#242722" stroke-width="3"><ellipse cx="300" cy="438" rx="16" ry="17"/><ellipse cx="389" cy="423" rx="15" ry="17"/></g>`,
  },
  '/Assets/cards/cat-card/artworks/Beard-Cat.jpg': {
    kind: 'beard', top: 19, bottom: 32,
    shapes: `<g class="art-blink" fill="#e4ac68" stroke="#35332a" stroke-width="3"><ellipse cx="335" cy="304" rx="17" ry="18"/><ellipse cx="441" cy="303" rx="17" ry="18"/></g><g class="art-whisker" fill="none" stroke="#6a6653" stroke-width="3" stroke-linecap="round"><path d="M258 556l-16 7"/><path d="M470 546l17 6"/></g>`,
  },
  '/Assets/cards/cat-card/artworks/Hairy-Potato-Cat.jpg': {
    kind: 'potato', top: 24, bottom: 22,
    shapes: `<g class="art-blink" fill="#ac812f" stroke="#272923" stroke-width="3"><ellipse cx="240" cy="321" rx="12" ry="13"/><ellipse cx="307" cy="297" rx="12" ry="13"/></g><g class="art-whisker" fill="none" stroke="#39362a" stroke-width="3" stroke-linecap="round"><path d="M184 418q-13-2-18-12"/><path d="M454 512q14-1 21-12"/></g>`,
  },
  '/Assets/cards/cat-card/artworks/Cattermelon.jpg': {
    kind: 'melon', top: 32, bottom: 28,
    shapes: `<path class="art-seed" d="M424 375q13-12 24-2-7 15-24 2z" fill="#263124"/><g class="art-seed-trail" fill="none" stroke="#848373" stroke-width="3" stroke-linecap="round"><path d="M452 376l24-3"/><path d="M474 369l15-3"/></g>`,
  },
  '/Assets/cards/attack-2x/artworks/Attack-Bear-o-Dactyl.jpg': {
    kind: 'attack', top: 20, bottom: 32,
    shapes: `<g class="art-scratch" fill="none" stroke="#fff0b2" stroke-width="7" stroke-linecap="round"><path d="M123 365l-27 27"/><path d="M143 373l-24 28"/><path d="M578 367l26 25"/></g>`,
  },
  '/Assets/cards/favor/artworks/Favor-Fall-So-Deeply-in-Love.jpg': {
    kind: 'favor', top: 23, bottom: 38,
    shapes: `<g class="art-hearts" fill="#fff4e0"><path d="M365 295c-30-22-6-38 0-22 9-23 33-6 0 22z"/><path d="M414 282c-24-19-5-31 0-18 8-19 27-5 0 18z"/><path d="M463 270c-19-16-4-26 0-15 6-16 23-4 0 15z"/></g>`,
  },
  '/Assets/cards/nope/artworks/Nope-A-Jackanope-Bounds-into-the-Room.jpg': {
    kind: 'nope', top: 24, bottom: 31,
    shapes: `<g class="art-scratch" fill="none" stroke="#b7302d" stroke-width="7" stroke-linecap="round" opacity=".7"><path d="M554 444l29-14"/><path d="M561 464l28-6"/></g><path class="art-bob-accent" d="M397 650q78 16 159-1" fill="none" stroke="#801e1c" stroke-width="5" opacity=".35"/>`,
  },
  '/Assets/cards/see-the-future-3x/artworks/See-the-Future-Ask-the-All-Seeing-Goat-Wizard.jpg': {
    kind: 'future', top: 18, bottom: 33,
    shapes: `<ellipse class="art-halo" cx="355" cy="211" rx="37" ry="17" fill="none" stroke="#fff4cb" stroke-width="4" opacity=".6"/>${star(136, 326, 9, '#ffedd1')}${star(294, 281, 7, '#fff1b9')}`,
  },
  '/Assets/cards/shuffle/artworks/Shuffle-A-Kraken-Emerges-and-Hes-Super-Upset.jpg': {
    kind: 'shuffle', top: 34, bottom: 34,
    shapes: `<g class="art-orbit" fill="#fff6dc"><circle cx="173" cy="487" r="6"/><circle cx="537" cy="516" r="7"/><circle cx="226" cy="591" r="5"/><path d="M154 454q-11 18-8 33M553 538q-1 20-12 35" fill="none" stroke="#fff6dc" stroke-width="4" stroke-linecap="round" opacity=".65"/></g>`,
  },
  '/Assets/cards/skip/artworks/Skip-Commandeer-a-Bunnyraptor.jpg': {
    kind: 'skip', top: 32, bottom: 30,
    shapes: `<g class="art-speed-lines" fill="none" stroke="#f9eed2" stroke-width="5" stroke-linecap="round" opacity=".7"><path d="M144 632h50"/><path d="M123 647h47"/><path d="M176 662h46"/></g>`,
  },
  '/Assets/cards/defuse/artworks/Defuse-Via-3AM-Flatulence.jpg': {
    kind: 'defuse', top: 26, bottom: 32,
    shapes: `<g class="art-puff" fill="none" stroke="#dde67a" stroke-width="5" stroke-linecap="round" opacity=".7"><path d="M433 644q-19-11-10-27"/><path d="M409 649q-20-8-16-23"/><path d="M443 660q-21-1-27-11"/></g>`,
  },
  '/Assets/cards/exploding-kitten/artworks/Exploding-Kitten-Alien.jpg': {
    kind: 'kitten', top: 52, bottom: 27,
    shapes: `<g class="art-embers" fill="#ffbc5d"><circle cx="161" cy="554" r="6"/><circle cx="522" cy="631" r="5"/><circle cx="570" cy="697" r="4"/></g>`,
  },
});

/** Decorative markup for an already-authorized visible card face only.
 * Unknown/replaced artwork and text/icon faces stay untouched. No caller data
 * is interpolated into markup: matching returns only the static entries above.
 */
export function cardArtMarkup(card, catalog) {
  if (!card || card.faceDown === true || card.hidden === true || card.revealed === false) return '';
  const type = typeof card === 'string' ? card : card.type ?? card.id;
  const definition = catalog?.[type] ?? (typeof card === 'object' && card.art ? card : null);
  if (!definition || ['text', 'icon'].includes(definition.uiBehavior)) return '';
  const path = String(definition.art ?? '').replaceAll('\\', '/');
  const entry = ART[path.startsWith('/') ? path : `/${path}`];
  if (!entry) return '';
  return `<span class="steam-card-art steam-card-art--${entry.kind}" data-art-motion="on" data-art-inspection="on" aria-hidden="true" style="--art-clip-top:${entry.top}%;--art-clip-bottom:${entry.bottom}%"><svg viewBox="0 0 720 1008" preserveAspectRatio="none" aria-hidden="true" focusable="false">${entry.shapes}</svg></span>`;
}

/** Update opt-ins without listeners, timers, game actions or image mutations.
 * Call after rerendering a hand/dialog if inspection motion should be disabled.
 * CSS also respects body.calm and the system reduced-motion preference.
 */
export function enhanceCardArt(container, { motion = true, allowInspection = true } = {}) {
  if (!container?.querySelectorAll) return 0;
  const overlays = [...container.querySelectorAll('.steam-card-art')];
  if (container.matches?.('.steam-card-art')) overlays.unshift(container);
  for (const overlay of overlays) {
    overlay.dataset.artMotion = motion ? 'on' : 'off';
    overlay.dataset.artInspection = allowInspection ? 'on' : 'off';
  }
  return overlays.length;
}
