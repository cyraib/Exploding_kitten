// Isolated behavioral checks: no browser dependency and no gameplay mutations.
// The tiny DOM stand-in tests hidden-card routing and scene cleanup, not layout.
import assert from 'node:assert/strict';
import { createSteamScenes } from '../app/presentation/steam-scenes.js';

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.style = { cssText: '' };
    this.children = []; this.parent = null; this.className = ''; this.attributes = {};
    this.classList = { add: (...names) => { this.className += ` ${names.join(' ')}`; } };
    if (tag === 'template') this.content = {};
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  set innerHTML(value) {
    this.html = value; this.children = [];
    if (this.content) {
      const child = new Element(); child.className = /class="([^"]*)"/.exec(value)?.[1] || '';
      this.content.firstElementChild = child;
    }
  }
  get innerHTML() { return this.html || ''; }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  appendChild(child) { this.append(child); return child; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  querySelector(selector) {
    const className = selector.slice(1);
    let child = this.children.find(child => child.className.split(/\s+/).includes(className));
    if (!child && this.innerHTML.includes(className)) { child = new Element(); child.className = className; this.append(child); }
    return child;
  }
}
const fx = new Element();
globalThis.document = { createElement: tag => new Element(tag), getElementById: id => id === 'fx' ? fx : null };
globalThis.innerWidth = 1366; globalThis.innerHeight = 768;
const from = { cx: 280, cy: 300, w: 132, h: 184 }, to = { cx: 800, cy: 580, w: 132, h: 184 };
const card = { uid: 'private-bot-card', type: 'nope' };
let epoch = 0, calm = false, faces = 0, calls = [], configuredFrame = false;
const recordAnimate = async (el, frames, ms, id) => { calls.push({ ms, id, frames, className: el.className }); return true; };
let animate = recordAnimate;
const scenes = createSteamScenes({
  animate: (...args) => animate(...args), getEpoch: () => epoch, isCalm: () => calm,
  finalFrame: frames => configuredFrame ? { ...frames.at(-1), transform: `${frames.at(-1).transform || ''} scale(1.3)`, opacity: .4 } : frames.at(-1),
  cardFace: () => { faces++; return '<div class="card"><span>private face</span></div>'; },
  backFace: () => '<span>public back</span>', anchor: () => to, centerRect: () => from,
  getPlayers: () => [{ id: 0, name: 'You' }, { id: 1, name: 'Peachy' }], sound() {},
});
function reset() { assert.equal(fx.children.length, 0, 'scene nodes must be removed'); faces = 0; calls = []; calm = false; configuredFrame = false; animate = recordAnimate; }
let passed = 0;
async function check(name, run) { reset(); await run(); assert.equal(fx.children.length, 0, `${name}: leftover scene nodes`); passed++; console.log(`PASS ${name}`); }

await check('hidden flights never construct a private face', async () => {
  await scenes.handFlight(card, from, to, { face: false, token: epoch }); assert.equal(faces, 0);
});
await check('hidden bot draw and shuffle remain backs', async () => {
  await scenes.draw(card, from, to, { face: false, token: epoch }); await scenes.shuffle(from, epoch); assert.equal(faces, 0);
});
await check('visible draw constructs its face exactly once', async () => {
  await scenes.draw(card, from, to, { face: true, token: epoch }); assert.equal(faces, 1); assert.equal(calls.length, 5);
});
await check('restart during draw stops before revealing', async () => {
  animate = async () => { epoch++; return true; };
  await scenes.draw(card, from, to, { face: true, token: epoch }); assert.equal(faces, 0);
});
await check('failed segment removes its moving card and hand', async () => {
  animate = async () => { throw new Error('animation failure'); };
  await assert.rejects(scenes.draw(card, from, to, { face: true, token: epoch }), /animation failure/); assert.equal(faces, 0);
});
animate = async (el, frames, ms, id) => { calls.push({ ms, id }); return true; };
await check('every public scene cleans up', async () => {
  for (const method of ['turn', 'nope', 'danger', 'defuse', 'explode', 'win']) await scenes[method]({ player: 1, name: '<script>seat</script>' }, epoch);
});
await check('calm draw skips foreground motion', async () => {
  calm = true; await scenes.draw(card, from, to, { face: true, token: epoch }); assert.equal(faces, 0); assert.equal(calls.length, 0);
});
await check('configured final frames survive draw stage boundaries', async () => {
  configuredFrame = true;
  animate = async (el, frames, ms, id) => {
    calls.push({ ms, id });
    if (calls.length === 2) { assert.match(el.parent.style.transform, /scale\(1\.3\)/); assert.equal(el.parent.style.opacity, .4); }
    return true;
  };
  await scenes.draw(card, from, to, { face: true, token: epoch }); assert.equal(faces, 1);
});
await check('cancelled segment stops the rest of the draw', async () => {
  animate = async () => false;
  await scenes.draw(card, from, to, { face: true, token: epoch }); assert.equal(faces, 0, 'cancellation must not advance into a face reveal');
});
await check('opaque flight hands off before its one sprite is removed', async () => {
  let arrived = 0;
  await scenes.handFlight(card, from, to, { token: epoch, onArrive() {
    arrived++; assert.equal(fx.children.length, 1);
    assert.equal(fx.children[0].children.length, 1, 'card travels without a decorative paw');
    assert.equal(fx.children[0].style.opacity, 1);
  } });
  assert.equal(arrived, 1); assert.equal(faces, 1);
  assert.ok(calls[0].frames.every(frame => frame.opacity === 1), 'no fade at the source or destination');
});
await check('visible draw hands off before removing its sprite', async () => {
  let arrived = false;
  await scenes.draw(card, from, to, { face: true, token: epoch, onArrive() {
    arrived = true; assert.equal(fx.children.length, 1); assert.equal(fx.children[0].style.opacity, 1);
  } });
  assert.equal(arrived, true); assert.equal(faces, 1);
  assert.equal(calls.reduce((ms, call) => ms + call.ms, 0), 560, 'ordinary draw stays short');
});
await check('cancelled or stale flight never performs its arrival callback', async () => {
  let arrived = 0;
  animate = async () => false;
  await scenes.handFlight(card, from, to, { token: epoch, onArrive: () => arrived++ });
  await scenes.handFlight(card, from, to, { token: epoch - 1, onArrive: () => arrived++ });
  assert.equal(arrived, 0);
});
await check('calm or unavailable anchor still completes destination handoff', async () => {
  let arrived = 0;
  calm = true;
  await scenes.handFlight(card, from, to, { token: epoch, onArrive: () => arrived++ });
  await scenes.draw(card, from, to, { token: epoch, face: true, onArrive: () => arrived++ });
  calm = false;
  await scenes.handFlight(card, null, to, { token: epoch, onArrive: () => arrived++ });
  assert.equal(arrived, 3); assert.equal(faces, 0); assert.equal(calls.length, 0);
});
await check('shuffle mixes two back-only packets and squares them', async () => {
  await scenes.shuffle(from, epoch);
  assert.equal(faces, 0); assert.equal(calls.length, 6);
  assert.ok(calls.every(call => call.ms === 540 && call.id === 'shuffle-flight'));
  const split = calls.map(call => call.frames[1].transform);
  assert.ok(split.some(transform => transform.includes('translate(-35px')));
  assert.ok(split.some(transform => transform.includes('translate(35px')));
  assert.ok(calls.every(call => call.frames.at(-1).transform === 'translate(0,0)' && call.frames.at(-1).opacity === 1));
});
await check('secret reinsertion opens slides and closes with only three backs', async () => {
  animate = async (el, frames, ms, id) => {
    calls.push({ ms, id, frames, className: el.className });
    assert.equal(fx.children.length, 1); assert.equal(fx.children[0].children.length, 3);
    assert.ok(fx.children[0].children.every(child => child.className.includes('card-back')));
    return true;
  };
  await scenes.reinsert(to, from, { token: epoch });
  assert.equal(faces, 0); assert.deepEqual(calls.map(call => call.ms), [180, 180, 240, 160]);
  assert.match(calls[0].className, /steam-deck-upper/);
  assert.match(calls[2].className, /steam-insert-card/);
  assert.match(calls[3].className, /steam-deck-upper/);
});
await check('cancelled insertion never continues its stack closing', async () => {
  animate = async (el, frames, ms, id) => { calls.push({ ms, id }); return calls.length < 3; };
  await scenes.reinsert(to, from, { token: epoch });
  assert.equal(calls.length, 3); assert.equal(faces, 0);
});
await check('restart during deck lifting stops insertion and cleans up', async () => {
  animate = async () => { epoch++; return true; };
  await scenes.reinsert(to, from, { token: epoch });
  assert.equal(faces, 0);
});
await check('calm reinsertion and shuffle skip foreground motion', async () => {
  calm = true;
  await scenes.reinsert(to, from, { token: epoch }); await scenes.shuffle(from, epoch);
  assert.equal(faces, 0); assert.equal(calls.length, 0);
});
console.log(`${passed} scene behavior checks passed.`);
