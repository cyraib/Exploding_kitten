import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { CARDS } from '../../app/catalog.js';

test('local server serves game/assets and refuses internal files or encoded traversal', async t => {
  const server = spawn(process.execPath, ['.codex/serve.mjs'], { env: { ...process.env, EK_PORT: '4178' }, windowsHide: true });
  t.after(() => server.kill());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server did not start')), 5000);
    server.stdout.on('data', () => { clearTimeout(timer); resolve(); });
    server.on('error', error => { clearTimeout(timer); reject(error); });
    server.on('exit', code => { if (code) { clearTimeout(timer); reject(new Error(`Test server exited: ${code}`)); } });
  });
  const origin = 'http://127.0.0.1:4178';
  assert.equal((await (await fetch(origin + '/__health')).json()).app, 'exploding-kittens-original-local');
  const home = await fetch(origin); assert.equal(home.status, 200); assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /app\/main.js/);
  for (const route of ['/app/main.js', '/app/styles.css', ...new Set(Object.values(CARDS).flatMap(c => [c.icon, c.art]))]) {
    assert.equal((await fetch(origin + route)).status, 200, route);
  }
  for (const route of ['/.codex/server.log', '/memory.md', '/package.json', '/Assets/%2e%2e%2f.codex%2fserver.log', '/app/%2e%2e%2fpackage.json']) {
    assert.ok([403, 404].includes((await fetch(origin + route)).status), route);
  }
  assert.equal((await fetch(origin, { method: 'POST', body: 'test' })).status, 405);
});
