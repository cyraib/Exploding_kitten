// Isolated local fixtures for repeatable UI checks. The normal server never exposes these.
import http from 'node:http';
import { createGame, transition, assertState } from '../app/engine.js';

function move(s, type, to, count = 1) {
  while (to.filter(c => c.type === type).length < count) {
    const lists = [s.deck, s.removed, s.discard, ...s.players.map(p => p.hand)].filter(list => list !== to);
    const list = lists.find(items => items.some(c => c.type === type));
    if (!list) throw new Error(`Unavailable fixture card: ${type}`);
    to.push(list.splice(list.findIndex(c => c.type === type), 1)[0]);
  }
}
function fixture(name) {
  if (name === 'seeded-win') return createGame({bots:1,seed:1019,difficulty:'casual'});
  if (name.startsWith('game-')) { const [, bots, seed] = name.split('-'); return createGame({bots:Number(bots),seed:Number(seed),difficulty:'casual'}); }
  let s = createGame({ bots: ['targets', 'attack', 'combos'].includes(name) ? 3 : 1, seed: 102, name: 'You' });
  move(s, 'nope', s.players[0].hand, 2);
  if (name === 'counter') {
    move(s, 'skip', s.players[0].hand);
    move(s, 'nope', s.players[1].hand);
    s = transition(s, { type: 'PLAY', player: 0, cards: [s.players[0].hand.find(c => c.type === 'skip').uid] });
    s = transition(s, { type: 'NOPE', player: 1 });
    // Make the next cycle resolve after the human restores their action.
    const bot = s.players[1]; s.deck.push(...bot.hand.filter(c => c.type === 'nope')); bot.hand = bot.hand.filter(c => c.type !== 'nope');
  } else if (name === 'favor') {
    move(s, 'favor', s.players[1].hand);
    s.current = 1;
    s = transition(s, { type: 'PLAY', player: 1, cards: [s.players[1].hand.find(c => c.type === 'favor').uid], target: 0 });
    while (s.phase === 'reaction') s = transition(s, { type: 'PASS', player: s.pending.responder });
  } else if (name === 'danger') {
    move(s, 'defuse', s.players[0].hand, 2);
    const list = [s.deck, s.removed].find(a => a.some(c => c.type === 'exploding-kitten'));
    const kitten = list.splice(list.findIndex(c => c.type === 'exploding-kitten'), 1)[0]; s.deck.unshift(kitten);
  } else if (name === 'fault') {
    move(s,'skip',s.players[0].hand);
  } else if (name === 'background') {
    s.current = 1; s.attacked = true; s.turnsRemaining = 2;
    const bot = s.players[1];
    s.deck.push(...bot.hand.filter(c => c.type !== 'defuse'));
    bot.hand = bot.hand.filter(c => c.type === 'defuse');
    // Two safe draws force two separate bot decisions while the tab is hidden.
    const safe = s.deck.filter(c => ['defuse', 'nope'].includes(c.type));
    s.deck = [...safe.slice(0, 2), ...s.deck.filter(c => !safe.slice(0, 2).includes(c))];
  } else if (name === 'shuffle') {
    move(s, 'shuffle', s.players[0].hand);
    for (const bot of s.players.slice(1)) {
      s.deck.push(...bot.hand.filter(c => c.type === 'nope'));
      bot.hand = bot.hand.filter(c => c.type !== 'nope');
    }
  } else if (name === 'targets') {
    move(s, 'attack-2x', s.players[0].hand); move(s, 'favor', s.players[0].hand); move(s, 'hairy-potato-cat', s.players[0].hand, 2);
  } else if (name === 'attack') {
    s.current = 1;
    move(s, 'attack-2x', s.players[1].hand);
    s = transition(s, {type:'PLAY',player:1,cards:[s.players[1].hand.find(c=>c.type==='attack-2x').uid]});
    while (s.phase === 'reaction') s = transition(s, {type:'PASS',player:s.pending.responder});
    move(s, 'attack-2x', s.players[2].hand);
    s = transition(s, {type:'PLAY',player:2,cards:[s.players[2].hand.find(c=>c.type==='attack-2x').uid]});
    while (s.phase === 'reaction') s = transition(s, {type:'PASS',player:s.pending.responder});
    move(s, 'attack-2x', s.players[3].hand);
    s = transition(s, {type:'PLAY',player:3,cards:[s.players[3].hand.find(c=>c.type==='attack-2x').uid]});
    while (s.phase === 'reaction') s = transition(s, {type:'PASS',player:s.pending.responder});
    move(s, 'skip', s.players[0].hand); move(s,'defuse',s.players[0].hand);
    const i=s.deck.findIndex(c=>c.type==='exploding-kitten');s.deck.unshift(s.deck.splice(i,1)[0]);
  } else if (name === 'combos') {
    move(s,'tacocat',s.players[0].hand,3);move(s,'beard-cat',s.players[0].hand,2);
    move(s,'favor',s.players[0].hand);move(s,'defuse',s.players[1].hand);
  } else if (name === 'bad-save') {
    s.phase='reaction';s.pending={actor:0,responder:1,effect:'unknown',label:'broken',cancelled:false,passed:[]};
    s.events=[]; return s;
  } else if (name === 'human-win') {
    const bot=s.players[1];s.discard.push(...bot.hand.filter(c=>c.type==='defuse'));bot.hand=bot.hand.filter(c=>c.type!=='defuse');
    s.current=1;const i=s.deck.findIndex(c=>c.type==='exploding-kitten');s.deck.unshift(s.deck.splice(i,1)[0]);
    s=transition(s,{type:'DRAW',player:1});
  } else if (name === 'last-card') {
    const kitten=s.deck.find(c=>c.type==='exploding-kitten');s.discard.push(...s.deck.filter(c=>c!==kitten));s.deck=[kitten];
    s.attacked=true;s.turnsRemaining=2;
  } else throw new Error('Unknown fixture');
  if (['attack','combos'].includes(name)) for (const bot of s.players.slice(1)) {
    s.deck.push(...bot.hand.filter(c=>c.type==='nope'));bot.hand=bot.hand.filter(c=>c.type!=='nope');
  }
  s.events = []; assertState(s); return s;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:4181');
    if (url.pathname.startsWith('/fixture/')) {
      const name = url.pathname.slice('/fixture/'.length), s = fixture(name);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(`<html><title>Playtest fixture: ${name}</title><body><p>Loading isolated ${name} test table…</p><script>localStorage.setItem('ek-original-save-v1',${JSON.stringify(JSON.stringify(s))});localStorage.setItem('ek-original-preferences-v1',${JSON.stringify(JSON.stringify({ speed: 'normal', bots: s.players.length - 1, difficulty: 'clever', name: 'You' }))});location.replace(${JSON.stringify(name === 'background' ? '/background-qa' : name === 'fault' ? '/fault' : name === 'seeded-win' ? '/steady' : '/')});</script></body></html>`);
    }
    const upstream = await fetch(`http://127.0.0.1:4177${['/fault','/steady','/background-qa'].includes(url.pathname) ? '/' : url.pathname}${url.search}`);
    if (url.pathname === '/background-qa') {
      // Automation keeps a controlled tab visible. This explicit fixture tests
      // the app's hidden-page branch without claiming a native browser freeze.
      const controls = `<button id="simulateHidden" style="position:fixed;left:8px;top:50px;z-index:1000">QA: Simulate hidden page</button><output id="backgroundEvidence" style="position:fixed;left:8px;top:82px;z-index:1000;font:12px monospace;background:white"></output><script>let qaHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>qaHidden});const qaButton=document.getElementById('simulateHidden');const qaOutput=document.getElementById('backgroundEvidence');const qaRead=()=>{qaOutput.textContent=JSON.stringify({simulated:true,hidden:document.hidden,deck:document.getElementById('deckCount').textContent,turn:document.getElementById('turnLabel').textContent,pause:document.getElementById('pauseButton').getAttribute('aria-label')});};qaButton.onclick=()=>{qaHidden=!qaHidden;qaButton.textContent=qaHidden?'QA: Return to visible page':'QA: Simulate hidden page';document.dispatchEvent(new Event('visibilitychange'));qaRead();};new MutationObserver(qaRead).observe(document.getElementById('game'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label']});</script>`;
      const html = (await upstream.text()).replace('</body>', controls + '</body>');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); return res.end(html);
    }
    if (['/fault','/steady'].includes(url.pathname)) {
      const shim=url.pathname === '/fault' ? 'Element.prototype.animate=()=>({finished:new Promise(()=>{}),cancel(){}});' : 'Math.random=()=>.99;';
      const html=(await upstream.text()).replace('<script type="module"', `<script>${shim}</script><script type="module"`);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html);
    }
    res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
server.listen(4181, '127.0.0.1', () => console.log('Playtest browser fixtures: http://localhost:4181/fixture/counter'));
