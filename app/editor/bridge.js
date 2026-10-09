// Loaded only in an explicitly requested editor sandbox. All mechanics use the engine.
import { createGame, transition, assertState, botView } from '../engine.js';
import { chooseBotAction } from '../bots.js';
import { CARDS } from '../catalog.js';
import { project, setProject, applyPresentation, animationSettings, tuneFrames } from '../config/runtime.js';
import { validateProject } from '../config/validation.js';
export function installBridge(game) {
  let inspecting=false;
  const send=(type,payload)=>parent.postMessage({editor:true,type,...payload},location.origin);
  function fresh(bots=3,deckId) {
    const d=project.decks.find(d=>d.id===deckId && d.enabled)||project.decks.find(d=>d.enabled);
    const catalog=Object.fromEntries(project.cards.map(c=>[c.id,c]));
    const inventory=Object.fromEntries(Object.entries(d.cards).filter(([id])=>catalog[id].enabled));
    return createGame({bots,catalog,inventory,deckId:d.id,botNames:project.entities.filter(e=>e.enabled&&e.kind==='bot').map(e=>e.name).concat(['Peachy','Prootzel','Jazzy','Dolores']).slice(0,4)});
  }
  function transfer(s,type,player) {
    if(type==='exploding-kitten')throw new Error('Use Force Kitten draw; hazards cannot enter a hand.');
    for(const pile of [s.deck,s.discard,s.removed,...s.players.filter(p=>p.id!==player).map(p=>p.hand)]) {
      const i=pile.findIndex(c=>c.type===type); if(i>=0){const [c]=pile.splice(i,1);s.players[player].hand.push(c);s.players.forEach(p=>p.known=[]);return c;}
    }
    throw new Error(`No available ${type} card. Increase its deck quantity and create a new table.`);
  }
  async function debug(data) {
    if(data.action==='new'||data.action==='spawn') { game.replaceState(fresh(Number(data.bots),data.deck)); return; }
    let s=game.getState(); if(!s)throw new Error('Create a sandbox table first.');
    const player=Number(data.player||0);
    if(!s.players[player]?.alive)throw new Error('Choose a living seat.');
    if(data.action==='command') { await game.command(data.command);return; }
    if(data.action==='bot') { await game.command(chooseBotAction(botView(s,player)));return; }
    if(data.action==='defuse') { await game.command({type:'DEFUSE',player:s.danger?.player??player});return; }
    if(data.action==='nope') { await game.command({type:'NOPE',player});return; }
    if(s.phase!=='turn')throw new Error('Finish the current response/rescue/peek before editing the table, or create a new sandbox.');
    if(data.action==='give')transfer(s,data.card,player);
    else if(data.action==='remove') {const i=s.players[player].hand.findIndex(c=>c.type===data.card);if(i<0)throw new Error('That seat does not hold this card.');s.discard.push(...s.players[player].hand.splice(i,1));}
    else if(data.action==='current')s.current=player;
    else if(data.action==='order') {
      const ids=String(data.order).split(/[\s,]+/).filter(Boolean);
      if(ids.length!==s.deck.length||new Set(ids).size!==ids.length||ids.some(id=>!s.deck.some(c=>c.uid===id)))throw new Error('Deck order must list every existing deck UID exactly once.');
      s.deck=ids.map(id=>s.deck.find(c=>c.uid===id));s.players.forEach(p=>p.known=[]);
    } else if(['kitten','eliminate','gameover'].includes(data.action)) {
      const targets=data.action==='gameover'?s.players.filter(p=>p.alive&&p.id!==player).map(p=>p.id):[player];
      for(const id of targets) {
        const i=s.deck.findIndex(c=>c.type==='exploding-kitten');if(i<0)throw new Error('No Kitten remains in the deck.');
        [s.deck[0],s.deck[i]]=[s.deck[i],s.deck[0]];s.players.forEach(p=>p.known=[]);s.current=id;
        s=transition(s,{type:'DRAW',player:id});
        if(data.action!=='kitten')s=transition(s,{type:'EXPLODE',player:id});
      }
    } else if(['attack','future'].includes(data.action)) {
      s.current=player; const effect=data.action==='attack'?'attack-2x':'see-the-future-3x';
      const type=project.cards.find(c=>c.effect===effect&&c.enabled&&s.inventory[c.id])?.id;
      if(!type)throw new Error('This deck does not contain that effect.');
      const card=s.players[player].hand.find(c=>c.type===type)||transfer(s,type,player);
      assertState(s);game.replaceState(s); await game.command({type:'PLAY',player,cards:[card.uid]});return;
    } else throw new Error('Unknown sandbox control.');
    assertState(s);game.replaceState(s);
  }
  async function preview(id) {
    const a=project.animations.find(a=>a.id===id);if(!a)throw new Error('Unknown animation.');
    const f=game.preview, card=game.getState()?.players[0].hand[0]||{uid:'preview',type:'attack-2x'};
    const from=f.rect(document.getElementById('drawPile')),to=f.rect(document.getElementById('discardPile'));
    if(id==='flight'||id==='deal')return f.fly(card,from,to,true,false,a.duration,id);
    if(id==='draw-reveal')return f.drawReveal(card,from,to,true,game.token());
    if(id==='shuffle-flight')return f.eventFx({kind:'shuffle'},{},game.token());
    if(id==='turn-banner')return f.presentTurn(game.token(),true);
    if(id==='stamp')return f.eventFx({kind:'nope',cancelled:true},{},game.token());
    if(id==='danger-flash'||id==='danger-shake')return f.dangerMoment(game.token());
    if(id==='defuse-cancel')return f.defuseMoment(game.token(),0);
    if(id==='confetti')return f.confetti();
    const settings=animationSettings(id,a.duration);
    if(!settings.enabled)return;
    const el=document.createElement('div');el.className='editor-animation-sample card-back';el.textContent=a.name;
    Object.assign(el.style,{position:'fixed',left:'45%',top:'40%',width:'132px',height:'184px',padding:'20px',borderRadius:'12px'});
    document.getElementById('fx').append(el);
    const frames=a.keyframes || (a.cssFrames?Object.entries(a.cssFrames).map(([at,style])=>({...style,offset:at==='from'?0:at==='to'?1:parseFloat(at)/100})).sort((a,b)=>a.offset-b.offset):[{transform:'translateY(40px) rotate(-10deg)',opacity:0},{transform:'translateY(0) rotate(0)',opacity:1}]);
    const animation=el.animate(tuneFrames(frames,settings),{duration:settings.duration/settings.speed,delay:settings.delay,easing:settings.easing,fill:'both'});
    animation.finished.catch(()=>{}).finally(()=>el.remove());
  }
  window.addEventListener('message',async event=>{
    if(event.origin!==location.origin||event.source!==parent||!event.data?.editor)return;
    const {id,type,payload}=event.data;
    try {
      if(type==='config'){validateProject(payload);setProject(payload);Object.assign(CARDS,Object.fromEntries(payload.cards.map(c=>[c.id,c])));applyPresentation(payload);game.refresh();}
      else if(type==='inspect')inspecting=Boolean(payload);
      else if(type==='debug')await debug(payload);
      else if(type==='animation') {
        if(['play','replay'].includes(payload.action)){ document.getElementById('fx').getAnimations({subtree:true}).forEach(a=>a.cancel());void preview(payload.id).catch(error=>send('previewError',{error:error.message})); }
        else for(const a of document.getAnimations()){ if(payload.action==='pause')a.pause();else if(payload.action==='slow'){a.playbackRate=.25;a.play();}else if(payload.action==='resume'){a.playbackRate=1;a.play();}else if(payload.action==='reset')a.cancel(); }
      }
      send('reply',{id,result:{state:game.getState(),preferences:game.getPreferences()}});
    }catch(error){send('reply',{id,error:error.message});}
  });
  document.addEventListener('click',event=>{
    if(!inspecting)return;
    event.preventDefault();event.stopImmediatePropagation();
    const target=event.target, matches=project.ui.filter(u=>{try{return target.matches(u.selector)||target.closest(u.selector);}catch{return false;}});
    const selected=matches.find(u=>target.matches(u.selector))||matches.at(-1)||matches[0];
    const el=selected ? target.closest(selected.selector) || target : target;
    const rect=el.getBoundingClientRect(), css=getComputedStyle(el),card=el.closest('[data-card]');
    send('inspection',{item:selected?.id,detail:{name:selected?.name||el.tagName,entityId:card?.dataset.card||el.id||el.dataset.configEntity||selected?.id||'',asset:el.currentSrc||el.src||el.querySelector('img')?.src||css.backgroundImage,position:{x:rect.x,y:rect.y},size:{width:rect.width,height:rect.height},styles:{color:css.color,background:css.background,font:css.font,opacity:css.opacity,border:css.border,shadow:css.boxShadow,zIndex:css.zIndex,transform:css.transform},animations:el.getAnimations().map(a=>({name:a.animationName||'Web Animation',timing:a.effect.getTiming()})),eventHandlers:card?['click → renderHand → dispatch']:selected?[`${selected.source.symbol} → click handler / dispatch (see mapped source)`]:[],feature:selected?.feature,source:selected?.source}});
  },true);
  send('ready',{});
}
