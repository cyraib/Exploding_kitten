export const EFFECTS = ['attack-2x','skip','favor','shuffle','see-the-future-3x','nope','defuse','exploding-kitten','cat-card'];
export const STYLE_KEYS = ['color','background','background-color','background-image','font-family','font-size','font-weight','width','height','min-width','max-width','min-height','max-height','padding','margin','gap','position','left','top','right','bottom','opacity','border','border-radius','box-shadow','text-shadow','transform','filter','z-index','display','visibility','overflow','object-fit','letter-spacing','line-height','cursor','outline','outline-offset','transition','animation'];
const check = (value, message) => { if (!value) throw new Error(message); };
const idOK = id => typeof id === 'string' && /^[a-zA-Z][\w-]{0,79}$/.test(id) && !['__proto__','constructor','prototype'].includes(id);
export const assetOK = value => !value || typeof value === 'string' && /^\/(Assets|app\/config\/uploads)\/[\w /().%+,-]+$/i.test(value) && !value.includes('..');
function text(value, label, max = 3000) { check(typeof value === 'string' && value.length <= max, `Invalid ${label}.`); }
function styles(value = {}) {
  check(value && typeof value === 'object' && !Array.isArray(value), 'Styles must be an object.');
  for (const [key,val] of Object.entries(value)) {
    check(STYLE_KEYS.includes(key) || key==='stroke-dashoffset' || /^--[\w-]+$/.test(key), `Unsupported CSS property: ${key}`);
    check(typeof val === 'string' && val.length < 500 && !/[;{}<>]/.test(val) && !/url\((?!["']?\/(?:Assets|app\/config\/uploads)\/)/i.test(val), `Invalid CSS value for ${key}.`);
  }
}
export function validateProject(p) {
  check(p?.version === 1, 'Expected project schema version 1.');
  for (const group of ['cards','decks','ui','animations','sounds','entities','features']) {
    check(Array.isArray(p[group]) && p[group].length <= 1000, `Invalid ${group} collection.`);
    const ids = new Set();
    for (const item of p[group]) {
      check(idOK(item.id) && !ids.has(item.id), `Invalid or duplicate ${group} ID: ${item.id}`); ids.add(item.id); text(item.name, 'name', 200);
      check(item.source && (item.source.file==='index.html' || /^app\/[\w/-]+\.(js|css)$/.test(item.source.file || '')) && !item.source.file.includes('..') && typeof item.source.symbol==='string' && item.source.symbol.length>0, `Missing or invalid source mapping for ${item.id}.`);
    }
  }
  styles(p.theme);
  for (const c of p.cards) {
    text(c.description, 'card description'); text(c.rule, 'card rule');
    check(EFFECTS.includes(c.effect), `Unsupported effect: ${c.effect}`);
    check(!['defuse','nope','exploding-kitten'].includes(c.effect) || c.id === c.effect, 'Rescue, Nope and Kitten IDs must stay canonical.');
    check(Number.isInteger(c.count) && c.count >= 0 && c.count <= 200, 'Card quantity must be 0–200.');
    check(assetOK(c.art) && assetOK(c.icon), 'Use a local asset path.');
    check(/^#[a-f0-9]{6}$/i.test(c.color), 'Card color must use #rrggbb.');
    check(c.family === (c.effect === 'cat-card' ? 'cat-card' : c.effect), 'Card family must match its supported effect.');
    check(!c.animation || p.animations.some(a => a.id === c.animation), 'Unknown card animation.');
    check(!c.sound || p.sounds.some(a => a.id === c.sound), 'Unknown card sound.');
    check(c.playCondition === (['defuse','exploding-kitten'].includes(c.effect) ? 'danger' : c.effect === 'nope' ? 'reaction' : 'turn'), 'Play condition must match the engine effect.');
    check(c.targetRequirement === (c.effect === 'favor' ? 'other-player' : c.effect === 'attack-2x' ? 'clockwise' : 'none'), 'Target requirement must match the engine effect.');
    check(['card-face','icon','text'].includes(c.uiBehavior), 'Invalid card UI behavior.');
  }
  for (const required of ['defuse','nope','exploding-kitten']) check(p.cards.some(c => c.id === required), `Required engine card: ${required}`);
  for (const d of p.decks) {
    check(d.cards && typeof d.cards === 'object', 'Deck cards must map IDs to quantities.');
    for (const [id, qty] of Object.entries(d.cards)) check(p.cards.some(c => c.id === id) && Number.isInteger(qty) && qty >= 0 && qty <= 200, `Invalid deck entry ${id}.`);
    if (d.enabled) {
      const available = id => p.cards.find(c => c.id === id)?.enabled && d.cards[id] || 0;
      check(available('defuse') >= 6 && available('exploding-kitten') >= 4, 'Playable decks need at least 6 Defuses and 4 Kittens for 2–5 seats.');
      check(Object.entries(d.cards).filter(([id]) => !['defuse','exploding-kitten'].includes(id) && p.cards.find(c => c.id === id)?.enabled).reduce((sum,[,qty]) => sum + qty, 0) >= 35, 'Playable decks need at least 35 ordinary cards for five starting hands.');
      check(Object.values(d.cards).reduce((sum,q) => sum + q,0) <= 500, 'Deck maximum is 500 cards.');
    }
  }
  check(p.decks.some(d => d.enabled), 'Keep at least one enabled playable deck.');
  for (const u of p.ui) {
    check(typeof u.selector === 'string' && u.selector.length < 300 && /^[\w\s.#:[\]="'*+~>(),-]+$/.test(u.selector), 'Invalid UI selector.');
    for (const key of ['styles','hover','active','disabled','mobile','tablet','desktop']) styles(u[key]);
    check(assetOK(u.asset), 'Invalid UI asset.'); if (u.text) text(u.text, 'UI text');
  }
  for (const a of p.animations) {
    for (const [key,min,max] of [['duration',1,10000],['delay',0,5000],['speed',.1,5],['distance',0,5],['scale',.1,3],['rotation',-360,360],['opacity',0,1],['intensity',0,5]]) check(Number.isFinite(a[key]) && a[key] >= min && a[key] <= max, `Animation ${key} is out of range.`);
    check(/^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\([\d., -]+\)|steps\([\d, a-z-]+\))$/.test(a.easing), 'Unsupported easing.');
    if (a.selector) check(p.ui.some(u => u.selector === a.selector) || /^[\w\s.#:[\]="'*+~>(),-]+$/.test(a.selector), 'Invalid animation selector.');
    if (a.keyframes) { check(Array.isArray(a.keyframes) && a.keyframes.length >= 2 && a.keyframes.length <= 20, 'Use 2–20 keyframes.'); for (const f of a.keyframes) { const { offset, easing, ...s } = f; styles(s); if (offset !== undefined) check(offset >= 0 && offset <= 1, 'Invalid keyframe offset.'); } }
    if (a.cssFrames) for (const [at,s] of Object.entries(a.cssFrames)) { check(/^(from|to|\d+(?:\.\d+)?%)$/.test(at), 'Invalid CSS keyframe offset.'); styles(s); }
  }
  for (const s of p.sounds) { check(assetOK(s.asset), 'Invalid sound asset.'); check(Number.isFinite(s.frequency) && s.frequency >= 20 && s.frequency <= 20000 && Number.isFinite(s.volume) && s.volume >= 0 && s.volume <= .2, 'Invalid sound frequency or volume.'); }
  for (const e of p.entities) {
    check(['player','bot','notification','effect','game-object','font','music'].includes(e.kind), 'Unknown entity kind.'); check(assetOK(e.asset), 'Invalid entity asset.'); styles(e.properties);
    if(e.kind==='font')check(/^[\w -]{1,80}$/.test(e.name), 'Font names use letters, numbers, spaces and hyphens.');
    if(e.kind==='music' && e.behavior?.volume!==undefined)check(Number.isFinite(e.behavior.volume)&&e.behavior.volume>=0&&e.behavior.volume<=.2,'Music volume must be 0–0.2.');
    if(e.kind==='bot' && e.behavior?.difficulty)check(['inherit','clever','casual'].includes(e.behavior.difficulty),'Bot difficulty is inherit, clever or casual.');
  }
  return p;
}
