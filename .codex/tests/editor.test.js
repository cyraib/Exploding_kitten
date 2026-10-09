import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { validateProject } from '../../app/config/validation.js';
import { createGame, transition, assertState, botView } from '../../app/engine.js';
import { chooseBotAction } from '../../app/bots.js';
const defaults=JSON.parse(await readFile('app/config/defaults.json','utf8'));
const configured=p=>({catalog:Object.fromEntries(p.cards.map(c=>[c.id,c])),inventory:p.decks[0].cards,deckId:p.decks[0].id});
test('editor rejects broken decks, unsupported effects, external assets and unsafe CSS',()=>{
  validateProject(defaults);
  for(const mutate of [p=>p.cards[0].effect='targeted-attack',p=>p.decks[0].cards.defuse=0,p=>p.cards[0].art='https://example.com/card.jpg',p=>p.ui[0].styles.color='red;}body{display:none',p=>p.animations[0].duration=-1,p=>p.cards[0].targetRequirement='any-player']){
    const p=structuredClone(defaults);mutate(p);assert.throws(()=>validateProject(p));
  }
});
test('custom cards resolve existing effects and inventories survive configuration changes',()=>{
  const p=structuredClone(defaults),copy={...p.cards.find(c=>c.id==='attack-2x'),id:'custom-attack',name:'Custom attack',count:3};
  p.cards.push(copy);p.decks[0].cards[copy.id]=3;validateProject(p);
  let s=createGame({bots:1,seed:71,...configured(p)});
  const pile=[s.deck,s.removed,s.discard,...s.players.map(p=>p.hand)].find(p=>p.some(c=>c.type===copy.id));
  const index=pile.findIndex(c=>c.type===copy.id),card=pile.splice(index,1)[0];s.players[0].hand.push(card);
  s=transition(s,{type:'PLAY',player:0,cards:[card.uid]});assert.equal(s.pending.effect,'attack-2x');
  while(s.phase==='reaction')s=transition(s,{type:'PASS',player:s.pending.responder});
  assert.equal(s.current,1);assert.equal(s.turnsRemaining,2);assertState(JSON.parse(JSON.stringify(s)));
  p.cards=p.cards.filter(c=>c.id!==copy.id);delete p.decks[0].cards[copy.id];validateProject(p);
  assertState(s);assert.equal(s.catalog[copy.id].name,'Custom attack');
});
test('24 complete custom-deck bot matches finish with distinct card variants and preserved inventory',()=>{
  const p=structuredClone(defaults);
  for(const effect of ['attack-2x','skip','favor','shuffle','see-the-future-3x','cat-card']){
    const copy={...p.cards.find(c=>c.effect===effect),id:`variant-${effect}`,count:3};p.cards.push(copy);p.decks[0].cards[copy.id]=3;
  }
  validateProject(p);
  for(let n=0;n<24;n++){
    let s=createGame({bots:1+n%4,seed:100+n,...configured(p)});
    for(let step=0;step<3000&&s.phase!=='gameover';step++){
      const id=s.phase==='reaction'?s.pending.responder:s.phase==='favor'?s.favor.from:s.phase==='steal'?s.steal.to:s.current;
      s=transition(s,chooseBotAction(botView(s,id),()=>.95));
    }
    assert.equal(s.phase,'gameover',`Match ${n} finished`);assertState(s);
  }
});
test('editor API saves with backups, detects conflicts, rejects foreign writes and exposes only mapped source',async t=>{
  const port=4183,origin=`http://127.0.0.1:${port}`,server=spawn(process.execPath,['.codex/serve.mjs'],{env:{...process.env,EK_PORT:String(port)},windowsHide:true});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('No editor test server')),5000);server.stdout.on('data',()=>{clearTimeout(timer);resolve();});server.on('error',reject);});
  const original=await readFile('app/config/project.json','utf8');
  const post=data=>fetch(origin+'/__editor/config',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
  let savedText=original;
  t.after(async()=>{try{const current=await readFile('app/config/project.json','utf8');if(current!==original){const response=await post({base:current,project:JSON.parse(original)});assert.equal(response.status,200);}}finally{server.kill();}});
  assert.equal((await fetch(origin+'/app/editor/index.html')).status,200);
  assert.equal((await fetch(origin+'/__editor/source?file=app/engine.js')).status,200);
  assert.equal((await fetch(origin+'/__editor/source?file=app/config/project.json')).status,200);
  assert.equal((await fetch(origin+'/__editor/source?file=.codex/server.log')).status,403);
  const list=await(await fetch(origin+'/__editor/assets')).json();assert.ok(list.length>=265);
  const iconPath=defaults.cards[0].icon, bytes=await readFile('.'+iconPath);
  const upload=await fetch(origin+'/__editor/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'editor-test.png',data:bytes.toString('base64')})});
  assert.equal(upload.status,200);const uploaded=await upload.json();assert.match(uploaded.path,/^\/app\/config\/uploads\/[\w-]+\.png$/);
  t.after(()=>unlink('.'+uploaded.path));
  assert.deepEqual(Buffer.from(await(await fetch(origin+uploaded.path)).arrayBuffer()),bytes);
  assert.equal((await fetch(origin+'/__editor/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'script.html',data:bytes.toString('base64')})})).status,400);
  const project=JSON.parse(original);project.theme['--yellow']='#ffe080';
  assert.equal((await fetch(origin+'/__editor/config',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({project,base:original})})).status,403);
  const response=await post({project,base:original});assert.equal(response.status,200);const saved=await response.json();savedText=saved.text;
  assert.equal(await readFile(saved.backup,'utf8'),original);
  assert.equal((await post({project,base:original})).status,409);
  const invalid=structuredClone(project);invalid.decks[0].cards.defuse=0;
  assert.equal((await post({project:invalid,base:savedText})).status,400);
  assert.equal(await readFile('app/config/project.json','utf8'),savedText);
});
