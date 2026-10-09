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
  let s = createGame({ bots: name === 'targets' ? 3 : 1, seed: 102, name: 'You' });
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
  } else if (name === 'targets') {
    move(s, 'attack-2x', s.players[0].hand); move(s, 'favor', s.players[0].hand); move(s, 'hairy-potato-cat', s.players[0].hand, 2);
  } else throw new Error('Unknown fixture');
  s.events = []; assertState(s); return s;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:4180');
    if (url.pathname.startsWith('/fixture/')) {
      const name = url.pathname.slice('/fixture/'.length), s = fixture(name);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(`<html><title>Update2 fixture: ${name}</title><body><p>Loading isolated ${name} test table…</p><script>localStorage.setItem('ek-original-save-v1',${JSON.stringify(JSON.stringify(s))});localStorage.setItem('ek-original-preferences-v1',${JSON.stringify(JSON.stringify({ speed: 'normal', bots: s.players.length - 1, difficulty: 'clever', name: 'You' }))});location.replace('/');</script></body></html>`);
    }
    const upstream = await fetch(`http://127.0.0.1:4177${url.pathname}${url.search}`);
    res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(error.message); }
});
server.listen(4180, '127.0.0.1', () => console.log('Update2 browser fixtures: http://localhost:4180/fixture/counter'));
