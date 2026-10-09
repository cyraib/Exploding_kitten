import { CARDS } from './catalog.js';
import { createGame, transition, assertState, botView, nextLiving, canNope } from './engine.js';
import { chooseBotAction } from './bots.js';
import { MOTION, DECK_OPTIONS, MODE_OPTIONS, selectionHint } from './ui-config.js';
import { project, applyPresentation, animationSettings, tuneFrames } from './config/runtime.js';
import { beanMarkup } from './presentation/steam-visuals.js';
import { createSteamScenes } from './presentation/steam-scenes.js';
import { cardArtMarkup, enhanceCardArt } from './presentation/card-art.js';
import { syncHandOrder, moveHandCard, groupHandOrder } from './hand-order.js';
import { createDecisionClock } from './decision-clock.js';

const $ = id => document.getElementById(id);
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const editorSandbox = new URLSearchParams(location.search).has('editor');
const SAVE_KEY = editorSandbox ? 'ek-editor-sandbox-save-v1' : 'ek-original-save-v1';
const PREF_KEY = editorSandbox ? 'ek-editor-sandbox-preferences-v1' : 'ek-original-preferences-v1';
const ORDER_KEY = `${SAVE_KEY}-hand-order`;
const defaults = { speed: 'normal', sound: false, name: project?.entities.find(e=>e.kind==='player'&&e.enabled)?.name || 'You', bots: 3, difficulty: 'clever', deck: 'original', mode: 'bots' };
let preferences = { ...defaults };
try { preferences = { ...defaults, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { /* Storage is optional. */ }
let state = null, saved = null, selected = [], busy = false, paused = false, panel = 'setup', epoch = 0, toastTimer, audio;
let handOrder = [], givingCard = null, orderCard = null, draggedCard = null, lastDragAt = 0;
try { const order = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); if (Array.isArray(order)) handOrder = order.filter(uid => typeof uid === 'string'); } catch { /* Optional UI preference. */ }
let clockWorker = null;
try { clockWorker = new Worker(new URL('./background-clock.js', import.meta.url), { type: 'module' }); } catch { /* Main-thread deadline fallback. */ }
const decisionClock = createDecisionClock(clockWorker);
const effects = new Set();
const hiddenCards = new Set();
let presentedTurn = '';
const REACTION_MS = 3000;
let reactionDeadline = 0, reactionTick, thinkingPlayer = null, setupStage = 0;
let sandboxFrozen = false;
let musicAudio, musicPath = '';
let targetRequest = 'defuse';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let storageWorks = true;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const candidate = JSON.parse(raw); assertState(candidate); saved = candidate; }
} catch { saved = null; }

function isCalm() { return preferences.speed === 'calm' || reduced.matches || document.hidden; }
function duration(ms) { return isCalm() ? 1 : preferences.speed === 'fast' ? ms * .5 : ms; }
function writePrefs() {
  document.body.classList.toggle('calm', preferences.speed === 'calm');
  syncMusic();
  try { localStorage.setItem(PREF_KEY, JSON.stringify(preferences)); } catch { /* In-memory play still works. */ }
}
function save() {
  if (!state) return;
  handOrder = syncHandOrder(handOrder, state.players[0].hand);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, events: [] })); localStorage.setItem(ORDER_KEY, JSON.stringify(handOrder)); saved = structuredClone(state); }
  catch { storageWorks = false; }
  $('saveStatus').textContent = storageWorks ? 'AUTO-SAVED · LOCAL' : 'LOCAL · UNSAVED';
}
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3200);
}
function syncMusic() {
  const music=project?.entities.find(e=>e.kind==='music' && e.enabled && e.asset);
  if(!preferences.sound || !music) { musicAudio?.pause(); return; }
  if(musicPath!==music.asset) {musicAudio?.pause();musicAudio=new Audio(music.asset);musicPath=music.asset;musicAudio.loop=true;}
  musicAudio.volume=music.behavior?.volume ?? .04;
  if(musicAudio.paused)void musicAudio.play().catch(()=>{});
}
function sound(kind = 'play') {
  if (!preferences.sound) return;
  syncMusic();
  const definition = project?.sounds.find(s => s.id === kind);
  if (definition?.enabled === false) return;
  if (definition?.asset) { const clip = new Audio(definition.asset); clip.volume = definition.volume; void clip.play().catch(()=>{}); return; }
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    void audio.resume().catch(() => { /* A blocked audio context must not reject gameplay. */ });
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    const frequency = definition?.frequency || { play: 400, draw: 540, nope: 180, danger: 115, defuse: 750, win: 920 }[kind] || 400;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * (kind === 'danger' ? .45 : 1.3), now + .13);
    gain.gain.setValueAtTime(definition?.volume ?? .045, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .19);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + .2);
  } catch { /* Audio must never prevent play. */ }
}
function cardFace(card, ordinal = '', asButton = false) {
  const c = CARDS[card.type];
  const tag = asButton ? 'button' : 'div';
  return `<${tag} class="card${selected.includes(card.uid) && asButton ? ' selected' : ''}" style="--card-color:${c.color}" ${asButton ? `data-card="${esc(card.uid)}" aria-pressed="${selected.includes(card.uid)}" aria-label="${esc(c.name)}. ${esc(c.description)}"` : `aria-label="${esc(c.name)}"`}>
    ${c.uiBehavior==='text'?`<span class="card-copy"><strong class="card-name">${esc(c.name)}</strong><span class="card-description">${esc(c.description)}</span></span>`:`<img class="card-image" src="${esc(c.uiBehavior==='icon'?c.icon:c.art)}" alt="" draggable="false">`}${cardArtMarkup(card, CARDS)}<span class="sr-only">${esc(c.name)}. ${esc(c.description)}</span>${ordinal ? `<span class="card-ordinal">${ordinal}</span>` : ''}</${tag}>`;
}
const backFace = () => '<span class="back-stars">✦</span><span class="back-title">EXPLODING<br>KITTENS</span><span class="back-paw">✳</span>';
// Scene segments keep their authored proportions; dashboard durations act as a multiplier.
const SCENE_BASE_MS = { flight:420, deal:200, 'draw-reveal':820, 'turn-banner':200, stamp:850, 'danger-flash':850, 'danger-shake':850, 'defuse-cancel':850, 'shuffle-flight':420, confetti:850 };
const steamScenes = createSteamScenes({ animate:(el,frames,ms,id)=>animate(el,frames,ms,id,true), finalFrame:(frames,id)=>{const settings=animationSettings(id,0);return tuneFrames(settings.keyframes || frames,settings).at(-1);}, getEpoch:()=>epoch, isCalm, cardFace, backFace, anchor, centerRect, sound, getPlayers:()=>state?.players || [] });
async function presentTurn(token, force = false) {
  if(force && !state && token===epoch)return steamScenes.turn({player:0,name:'You'},token);
  if (token !== epoch || state?.phase !== 'turn' || (!force && (paused || panel))) return;
  const key = `${state.turnNumber}:${state.current}:${state.turnsRemaining}`;
  if (!force && presentedTurn === key) return;
  presentedTurn = key;
  if (!force) return; // The persistent table status already announces the turn.
  await steamScenes.turn({player:state.current,name:state.players[state.current].name,attacked:state.attacked,remaining:state.turnsRemaining},token);
}
function canAct() { return state?.phase === 'turn' && state.current === 0 && state.players[0].alive && !busy && !paused && !panel; }
function selectedCards() { return (state?.players[0].hand || []).filter(c => selected.includes(c.uid)); }
function validSelection() {
  const cards = selectedCards();
  return cards.length > 0 && cards.every(c => c.type === cards[0].type) && (cards.length > 1 || !['defuse', 'nope'].includes(cards[0].type));
}
function render() {
  const players = state?.players || Array.from({ length: 4 }, (_, id) => ({ id, name: ['You', 'Peachy', 'Prootzel', 'Jazzy'][id], alive: true, hand: [] }));
  const avatarTypes = ['tacocat', 'beard-cat', 'hairy-potato-cat', 'rainbow-ralphing-cat'];
  $('game').dataset.players = players.length;
  $('opponents').innerHTML = players.slice(1).map((p, i) => `<article class="opponent${!p.alive ? ' dead' : ''}${state && p.alive && state.current === p.id ? ' active' : ''}" data-seat="${p.id}" aria-label="${esc(p.name)}, ${p.alive ? `${p.hand.length} cards` : 'eliminated'}"><span class="opponent-name">${esc(p.name)}</span><div class="seat" style="--avatar-color:${['#ecc768','#a7cf9a','#b9a5d1','#a5d1dc'][i]}"><span class="active-marker">↗</span><div class="avatar">${beanMarkup(p.id,{dead:!p.alive})}<img class="avatar-source" src="${CARDS[avatarTypes[i]].icon}" alt=""></div><div class="mini-hand" data-anchor="${p.id}"><i class="mini-card"></i><i class="mini-card"></i><i class="mini-card"></i></div><span class="hand-badge">${p.hand.length}</span></div>${!p.alive ? '<div class="dead-tag">EXPLODED</div>' : ''}</article>`).join('');
  $('humanName').textContent = players[0].name;
  $('humanAvatar').innerHTML = beanMarkup(0,{dead:!players[0].alive});
  $('humanSeat').className = `you${state && state.current === 0 && players[0].alive ? ' active' : ''}${!players[0].alive ? ' dead' : ''}`;
  $('handCount').textContent = `${players[0].hand.length} cards in hand${!players[0].alive ? ' · eliminated' : ''}`;
  $('deckCount').textContent = state?.deck.length ?? '—';
  $('discardCount').textContent = `${state?.discard.length || 0} cards played`;
  $('survivors').textContent = `${players.filter(p => p.alive).length} ALIVE`;
  $('turnCount').textContent = state?.phase === 'gameover' ? 'MATCH OVER' : state?.attacked ? `${state.turnsRemaining} TURN${state.turnsRemaining > 1 ? 'S' : ''} LEFT` : `TURN ${state?.turnNumber ?? 1}`;
  document.querySelector('.meter').classList.toggle('under-attack', Boolean(state?.attacked && state.phase !== 'gameover'));
  $('turnHint').textContent = state?.phase === 'gameover' ? 'the match is complete' : state?.attacked ? 'finish every attacked turn' : 'draw at the end';
  const banner = !state ? 'YOUR TABLE. YOUR LUCK.' : paused ? 'PAUSED' : state.phase === 'gameover' ? state.winner === 0 ? 'YOU WIN!' : `${players[state.winner].name.toUpperCase()} WINS!` : state.current === 0 ? `YOUR TURN${state.attacked ? ` · ${state.turnsRemaining} LEFT` : ''}` : `BOT TURN · ${players[state.current].name.toUpperCase()}`;
  if ($('turnLabel').textContent !== banner) {
    $('turnLabel').textContent = banner;
  }
  $('turnLabel').classList.toggle('human-turn', Boolean(state?.current === 0));
  $('turnLabel').classList.toggle('bot-turn', Boolean(state && state.current !== 0));
  const visibleDiscard = (state?.discard || []).filter(c => !hiddenCards.has(c.uid));
  $('discardPile').innerHTML = visibleDiscard.length ? visibleDiscard.slice(-3).map((c, i, cards) => cardFace(c).replace('style="', `style="--rot:${(i - cards.length + 1) * -7}deg;--stack:${cards.length - i - 1};z-index:${i};`)).join('') : '<span class="discard-placeholder">PLAY IT<br>SAFE-ISH.<small>your cards go here</small></span>';
  $('historyCount').textContent = state?.log.length || 0;
  $('soundButton').classList.toggle('active', preferences.sound);
  $('soundButton').setAttribute('aria-label', preferences.sound ? 'Turn sound off' : 'Turn sound on');
  $('pauseButton').classList.toggle('active', paused);
  $('pauseButton').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  $('pauseButton').disabled = !state || state.phase === 'gameover';
  $('footerStatus').textContent = !state ? 'One human. A few suspicious cats.' : state.phase === 'gameover' ? `${players[state.winner].name} survived. Start another round when ready.` : !players[0].alive ? 'You exploded. Stay to watch the remaining bots.' : paused ? 'Paused. Your table is saved.' : `${players.length - 1} ${state.difficulty} bot${players.length > 2 ? 's' : ''} · clockwise · ${state.attacked ? 'Attack in progress' : 'Original Edition'}`;
  renderHand();
  renderModal();
  renderReaction();
  renderThinking();
  renderInteraction();
  renderDanger();
  applyPresentation();
  enhanceCardArt($('game'),{motion:false,allowInspection:false});
  enhanceCardArt($('modal'),{motion:false,allowInspection:false});
  syncMusic();
}
function renderHand() {
  const engineHand = state?.players[0].hand || [];
  if (state) handOrder = syncHandOrder(handOrder, engineHand);
  const hand = (state ? handOrder : []).map(uid => engineHand.find(c => c.uid === uid));
  selected = selected.filter(uid => hand.some(c => c.uid === uid));
  const giving = state?.phase === 'favor' && state.favor.from === 0 && !busy && !panel && !paused;
  if (!giving || !hand.some(c => c.uid === givingCard)) givingCard = null;
  if (!hand.some(c => c.uid === orderCard)) orderCard = null;
  const arranging = Boolean(state?.players[0].alive && !busy && !panel && !paused);
  const rescuing = state?.phase === 'danger' && state.danger.player === 0 && hand.some(c => c.type === 'defuse') && !busy && !panel && !paused;
  if (state && state.phase !== 'turn') selected = [];
  if (state && state.current !== 0) selected = [];
  // Keep the clicked nodes alive so the browser can recognize a real double-click.
  const signature = JSON.stringify(hand.map(c => { const d = CARDS[c.type]; return [c.uid,c.type,d.art,d.icon,d.uiBehavior,d.name,d.description,d.color]; }));
  if ($('hand').dataset.cards !== signature) {
    $('hand').innerHTML = hand.map((c, i) => cardFace(c, i + 1, true)).join('');
    $('hand').dataset.cards = signature;
  }
  $('hand').querySelectorAll('[data-card]').forEach(button => {
    const uid = button.dataset.card;
    button.style.visibility = hiddenCards.has(uid) ? 'hidden' : '';
    button.classList.toggle('selected', selected.includes(uid) || givingCard === uid);
    button.setAttribute('aria-pressed', String(selected.includes(uid) || givingCard === uid));
    button.draggable = arranging;
    button.title = 'Double-click to play. Drag to arrange, or use Alt + Left / Right.';
    button.onclick = event => {
    if (busy || panel || paused || event.detail > 1 || Date.now() - lastDragAt < 250) return;
    const uid = button.dataset.card, card = hand.find(c => c.uid === uid);
    orderCard = uid;
    if (giving) { givingCard = uid; renderHand(); return; }
    if (rescuing) {
      if (card.type === 'defuse') return dispatch({ type: 'DEFUSE', player: 0 });
      return toast('Choose a highlighted Defuse to survive.');
    }
    if (!canAct()) { renderHand(); return; }
    if (selected.includes(uid)) selected = selected.filter(id => id !== uid);
    else {
      if (selectedCards()[0]?.type !== card.type) selected = [];
      if (selected.length >= 3) return toast('Select up to three matching cards.');
      selected.push(uid);
    }
    renderHand();
    };
    button.ondblclick = event => {
      event.preventDefault();
      if (!canAct() || Date.now() - lastDragAt < 250) return;
      selected = [uid];
      renderHand();
      if (validSelection()) playSelected();
      else toast('Choose two or three matching cards to play a combo.');
    };
    button.onkeydown = event => {
      if (event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key) && arranging) {
        event.preventDefault();
        moveInHand(uid, event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    button.ondragstart = event => {
      if (!arranging) return event.preventDefault();
      draggedCard = uid; orderCard = uid;
      event.dataTransfer.setData('text/plain', uid);
      event.dataTransfer.effectAllowed = 'move';
      button.classList.add('dragging');
      $('cardPlayAction').hidden = true;
    };
    button.ondragover = event => {
      if (!draggedCard || draggedCard === uid) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      const after = event.clientX > button.getBoundingClientRect().left + button.offsetWidth / 2;
      $('hand').querySelectorAll('.drop-before,.drop-after').forEach(c => c.classList.remove('drop-before','drop-after'));
      button.classList.add(after ? 'drop-after' : 'drop-before');
    };
    button.ondrop = event => {
      event.preventDefault();
      if (!draggedCard || !arranging) return;
      const after = event.clientX > button.getBoundingClientRect().left + button.offsetWidth / 2;
      handOrder = moveHandCard(handOrder, draggedCard, uid, after);
      lastDragAt = Date.now(); draggedCard = null; save(); renderHand();
    };
    button.ondragend = () => { draggedCard = null; lastDragAt = Date.now(); renderHand(); };
    button.classList.remove('dragging', 'drop-before', 'drop-after');
  });
  const cards = selectedCards();
  $('playButton').disabled = !canAct() || !validSelection();
  $('drawButton').disabled = !canAct();
  $('drawPile').disabled = !canAct();
  $('clearButton').disabled = !cards.length || busy || paused || Boolean(panel);
  $('playButton').textContent = cards.length > 1 ? `Play ${cards.length === 2 ? 'pair' : 'triple'} ↗` : cards.length ? `Play ${CARDS[cards[0].type].name.replace(' 3x', '').replace(' 2x', '')} ↗` : 'Play selected';
  $('selectionInfo').innerHTML = giving ? `<strong>${esc(state.players[state.favor.to].name)} asked for a Favor.</strong><span>Choose a card from your hand to give them.</span>` : rescuing ? '<strong>EXPLODING KITTEN!</strong><span>Click a highlighted Defuse in your hand.</span>' : state?.phase === 'danger' && state.danger.player === 0 && !busy ? '<strong>NO DEFUSE REMAINS.</strong><span>Accept your explosive fate to continue.</span>' : cards.length ? `<strong>${esc(selectionHint(cards, CARDS, state?.turnsRemaining, state?.attacked))}</strong><button class="text-button" id="detailButton">View card</button>` : state?.phase === 'gameover' ? state.winner === 0 ? 'You win. The match is complete.' : `${esc(state.players[state.winner].name)} wins. The match is complete.` : !state?.players[0].alive && state ? 'You are spectating. The bots will finish the game.' : state?.phase === 'reaction' ? canNope(state, 0) ? 'Opponent action or Nope — use a red hand button to respond.' : state.pending.actor === 0 ? 'Your action — opponents have three seconds to respond.' : 'Response window — watch the action countdown.' : thinkingPlayer !== null ? `${esc(state.players[thinkingPlayer].name)} is thinking…` : state?.current > 0 ? 'Bot turn — watch their action, then respond with Nope if available.' : 'Your turn — pick a card to play, or draw to finish.';
  $('hand').classList.toggle('giving', giving);
  if (givingCard) {
    const chosen = hand.find(c => c.uid === givingCard);
    $('selectionInfo').innerHTML = `<div class="favor-confirm"><strong>Give ${esc(CARDS[chosen.type].name)} to ${esc(state.players[state.favor.to].name)}?</strong><div><button class="button yellow small" id="confirmGive">Give card</button><button class="button light small" id="cancelGive">Choose another</button></div></div>`;
    $('confirmGive').onclick = () => { const uid = givingCard; givingCard = null; dispatch({ type: 'GIVE', player: 0, card: uid }); };
    $('cancelGive').onclick = () => { givingCard = null; renderHand(); };
  }
  if (arranging && !givingCard) {
    $('selectionInfo').insertAdjacentHTML('beforeend', `<div class="hand-order-controls"><span>Drag to arrange · double-click to play</span><button class="text-button" id="sortHand">Group matching</button>${orderCard ? '<button class="text-button" id="moveHandLeft" aria-label="Move chosen card left">←</button><button class="text-button" id="moveHandRight" aria-label="Move chosen card right">→</button>' : ''}</div>`);
    $('sortHand').onclick = () => { handOrder = groupHandOrder(handOrder, engineHand); save(); renderHand(); };
    $('moveHandLeft')?.addEventListener('click', () => moveInHand(orderCard, -1));
    $('moveHandRight')?.addEventListener('click', () => moveInHand(orderCard, 1));
  }
  $('hand').classList.toggle('rescuing', rescuing);
  $('hand').querySelectorAll('[data-card]').forEach(b => {
    const rescueCard = rescuing && hand.find(c => c.uid === b.dataset.card)?.type === 'defuse';
    b.classList.toggle('defuse-ready', Boolean(rescueCard));
    b.disabled = !(arranging || giving || rescueCard);
  });
  $('drawPile').setAttribute('aria-label', canAct() ? 'Draw & end turn' : 'Draw pile — wait for your turn');
  $('drawPile').classList.toggle('ready-to-draw', canAct());
  positionHandActions();
  enhanceCardArt($('hand'),{motion:false,allowInspection:false});
  $('detailButton')?.addEventListener('click', () => openPanel('detail'));
}

function moveInHand(uid, direction) {
  const index = handOrder.indexOf(uid), target = handOrder[index + direction];
  if (!target) return;
  orderCard = uid;
  handOrder = moveHandCard(handOrder, uid, target, direction > 0);
  save(); renderHand();
  const card = document.querySelector(`[data-card="${CSS.escape(uid)}"]`);
  card?.focus({ preventScroll: true }); card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function header(title, kicker = '', closable = false) {
  return `<div class="modal-heading"><div>${kicker ? `<span class="modal-kicker">${esc(kicker)}</span>` : ''}<h2 id="modalTitle">${esc(title)}</h2></div>${closable ? '<button class="close-button" data-close aria-label="Close dialog">×</button>' : ''}</div>`;
}
function showModal(content, className = '') {
  $('modalContent').innerHTML = `<div class="modal-inner ${className}">${content}</div>`;
  if (!$('modal').open) $('modal').showModal();
  $('modal').querySelectorAll('[data-close]').forEach(b => b.onclick = closePanel);
}
function hideModal() { if ($('modal').open) $('modal').close(); }
function openPanel(type) { panel = type; thinkingPlayer = null; if (['setup', 'newgame'].includes(type)) setupStage = 0; decisionClock.cancel(); clearInterval(reactionTick); render(); }
function closePanel() { panel = state ? null : 'setup'; render(); schedule(); }
function renderModal() {
  if (panel !== 'target') $('targetLayer').replaceChildren();
  if (panel === 'setup' || panel === 'newgame') return renderSetup(panel === 'newgame');
  if (panel === 'settings') return renderSettings();
  if (panel === 'rules') return renderRules();
  if (panel === 'history') {
    showModal(`${header('GAME LOG', 'ACTIONS & TURN HISTORY', true)}<p>Latest actions first. Private draws and insertion positions stay private.</p><ol class="history-list">${(state?.log || ['A fresh table is waiting.']).slice().reverse().map(line => `<li>${esc(line)}</li>`).join('')}</ol>`);
    return;
  }
  if (panel === 'detail') {
    const card = selectedCards()[0];
    if (!card) { panel = null; return hideModal(); }
    const c = CARDS[card.type];
    showModal(`${header(c.name.toUpperCase(), 'CARD CLOSE-UP', true)}<div class="detail-grid"><div class="steam-card-inspect">${cardFace(card)}</div><div><p>${esc(c.rule)}</p><p>Box inventory: <strong>${c.count} copies</strong>.</p>${c.family === 'cat-card' ? '<p>Match the exact cat name for a pair or triple.</p>' : ''}</div></div>`);
    return;
  }
  if (panel === 'target') return renderTarget();
  if (!state || paused) return hideModal();
  if (busy && ['future', 'insert', 'steal', 'gameover'].includes(state.phase)) return hideModal();
  const me = state.players[0];
  if (state.phase === 'future' && state.future.player === 0) {
    showModal(`${header('A PEEK INTO YOUR FUTURE', 'ONLY YOU CAN SEE THESE')}<p>The top ${state.future.cards.length} cards, in order. Looking does not end your turn.</p><div class="future-cards">${state.future.cards.map((c, i) => `<div>${cardFace(c)}<span class="future-order">${i === 0 ? 'NEXT DRAW' : `THEN #${i + 1}`}</span></div>`).join('')}</div><div class="modal-actions"><button class="button yellow" id="closeFuture">Return cards & keep playing</button></div>`);
    $('closeFuture').onclick = () => dispatch({ type: 'CLOSE_FUTURE', player: 0 });
  } else if (state.phase === 'danger' && state.danger.player === 0) {
    hideModal();
  } else if (state.phase === 'insert' && state.danger.player === 0) {
    const n = state.deck.length;
    showModal(`${header('YOUR LITTLE SECRET.', 'KITTY DEFUSED')}<p>Return the Kitten anywhere in the draw pile. No one sees the position you choose. This ends one turn.</p><p class="position-label" id="positionLabel">ON TOP · NEXT DRAW</p><label class="field">Kitten insertion position<input id="insertPosition" type="range" min="0" max="${n}" value="0"></label><div class="position-presets"><button class="button light small" id="insertTop">Top</button><button class="button light small" id="insertBottom">Bottom</button><button class="button light small" id="insertRandom">Random</button></div><div class="modal-actions"><button class="button yellow" id="insertButton">Secretly return Kitten</button></div>`);
    const slider = $('insertPosition');
    const label = () => { const p = Number(slider.value); $('positionLabel').textContent = p === 0 ? 'ON TOP · NEXT DRAW' : p === n ? 'AT THE VERY BOTTOM' : `AFTER ${p} CARD${p === 1 ? '' : 'S'}`; };
    slider.oninput = label;
    $('insertTop').onclick = () => { slider.value = 0; label(); };
    $('insertBottom').onclick = () => { slider.value = n; label(); };
    $('insertRandom').onclick = () => { slider.value = Math.floor(Math.random() * (n + 1)); label(); };
    $('insertButton').onclick = () => dispatch({ type: 'INSERT', player: 0, position: Number(slider.value) });
  } else if (state.phase === 'favor' && state.favor.from === 0) {
    hideModal();
  } else if (state.phase === 'steal' && state.steal.to === 0) {
    const target = state.players[state.steal.from];
    showModal(`${header('PICK A HIDDEN CARD.', `${target.name.toUpperCase()}'S HAND`)}<p>Choose one back. The hand has been mixed; card identities stay hidden until you steal.</p><div class="steal-cards">${target.hand.map((_, i) => `<button class="steal-back card-back" data-steal="${i}" aria-label="Steal hidden card ${i + 1}">${backFace()}</button>`).join('')}</div>`);
    $('modal').querySelectorAll('[data-steal]').forEach(b => b.onclick = () => dispatch({ type: 'STEAL', player: 0, index: Number(b.dataset.steal) }));
  } else if (state.phase === 'gameover') {
    const winner = state.players[state.winner];
    showModal(`<span class="winner-crown" aria-hidden="true">♛</span>${header(state.winner === 0 ? 'YOU LIVED TO TELL THE TAIL.' : `${winner.name.toUpperCase()} SURVIVED.`, 'LAST CAT STANDING')}<p>${state.winner === 0 ? 'A little luck. A little strategy. A completely intact human.' : 'The table has its champion. There is always another round.'}</p>${state.players.map(p => `<div class="score-row"><strong>${esc(p.name)}</strong><span>${p.id === state.winner ? 'Last survivor' : 'Exploded'}</span></div>`).join('')}<div class="modal-actions"><button class="button light" id="endHistory">Game log</button><button class="button yellow" id="againButton">One more round ↗</button></div>`);
    $('againButton').onclick = () => openPanel('newgame');
    $('endHistory').onclick = () => openPanel('history');
  } else hideModal();
  if (busy) $('modal').querySelectorAll('button,input,select').forEach(e => { e.disabled = true; });
}
function renderSetup(closable) {
  const stepper = `<ol class="setup-steps">${['Select Deck', 'Select Mode', 'Start Game'].map((s, i) => `<li class="${i === setupStage ? 'current' : i < setupStage ? 'done' : ''}" ${i === setupStage ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s}</li>`).join('')}</ol>`;
  const fields = setupStage === 0 ? `<label class="field">SELECT DECK<select id="deckChoice">${(project?.decks.filter(d=>d.enabled).map(d=>({...d,available:true})) || DECK_OPTIONS).map(d => `<option value="${d.id}" ${preferences.deck === d.id ? 'selected' : ''} ${d.available ? '' : 'disabled'}>${esc(d.name)}</option>`).join('')}</select></label><p class="setup-note">Select an enabled deck. New tables use its configured card inventory.</p>` : setupStage === 1 ? `<label class="field">SELECT MODE<select id="modeChoice">${MODE_OPTIONS.map(m => `<option value="${m.id}" ${preferences.mode === m.id ? 'selected' : ''} ${m.available ? '' : 'disabled'}>${esc(m.name)}</option>`).join('')}</select></label><p class="setup-note">One human against bot opponents. Choose your table on the next step.</p>` : `<label class="field">YOUR NAME<input id="playerName" maxlength="18" value="${esc(preferences.name)}" autocomplete="off"></label><label class="field">BOT OPPONENTS<select id="botCount">${[1, 2, 3, 4].map(n => `<option value="${n}" ${n === Number(preferences.bots) ? 'selected' : ''}>${n} bot${n > 1 ? 's' : ''} · ${n + 1} players</option>`).join('')}</select></label><label class="field">BOT PERSONALITY<select id="difficulty"><option value="clever" ${preferences.difficulty === 'clever' ? 'selected' : ''}>Clever · remembers peeks</option><option value="casual" ${preferences.difficulty === 'casual' ? 'selected' : ''}>Casual · a little less sneaky</option></select></label><p class="setup-note">Eight cards each. One guaranteed Defuse. Last survivor wins.</p>`;
  showModal(`${header(closable ? 'A FRESH TABLE.' : 'TRY NOT TO EXPLODE.', 'ORIGINAL EDITION · LOCAL PLAY', closable)}${stepper}<div class="setup-grid"><div class="setup-hero"><img src="${CARDS['exploding-kitten'].icon}" alt=""><div><h1>A LITTLE<br>MISCHIEF.</h1><p>A few suspicious cats. One last survivor.</p></div></div><form id="setupForm" class="setup-form">${fields}<button class="button yellow" type="submit">${setupStage === 0 ? 'Next: Select Mode' : setupStage === 1 ? 'Next: Start Game' : 'Start Game ↗'}</button>${setupStage ? '<button class="button light" type="button" id="setupBack">Back</button>' : ''}</form></div>${!closable && saved && saved.phase !== 'gameover' ? `<div class="resume-note">Your ${saved.players.length}-player table is waiting. <button class="text-button" id="resumeSaved">Continue saved game ↗</button></div>` : ''}${!closable ? '<div class="modal-actions"><button class="text-button" id="setupRules">How to play</button><button class="text-button" id="setupSettings">Motion & sound</button></div>' : ''}`);
  $('setupForm').onsubmit = event => {
    event.preventDefault();
    if (setupStage < 2) {
      if (setupStage === 0) preferences.deck = $('deckChoice').value;
      else preferences.mode = $('modeChoice').value;
      setupStage++; writePrefs(); renderSetup(closable); return;
    }
    preferences.name = $('playerName').value.trim() || 'You';
    preferences.bots = Number($('botCount').value);
    preferences.difficulty = $('difficulty').value;
    writePrefs();
    newGame();
  };
  $('setupBack')?.addEventListener('click', () => {
    if (setupStage === 2) { preferences.name = $('playerName').value.trim() || 'You'; preferences.bots = Number($('botCount').value); preferences.difficulty = $('difficulty').value; }
    setupStage--; renderSetup(closable);
  });
  $('resumeSaved')?.addEventListener('click', async () => {
    resetEffects(); state = structuredClone(saved); Object.assign(CARDS,state.catalog || {}); selected = []; panel = null; paused = false; busy = true;
    const token = epoch; save(); render();
    try { await presentTurn(token); }
    finally { if(token===epoch){busy=false;render();schedule();} }
  });
  $('setupRules')?.addEventListener('click', () => openPanel('rules'));
  $('setupSettings')?.addEventListener('click', () => openPanel('settings'));
}
function renderTarget() {
  const cards = selectedCards();
  if (!cards.length) { panel = null; return render(); }
  hideModal();
  const triple = cards.length === 3, attack = cards.length === 1 && (CARDS[cards[0].type].effect || cards[0].type) === 'attack-2x';
  const origin = rect($('humanSeat'));
  const opponents = state.players.filter(p => p.id !== 0 && p.alive);
  const targets = opponents.map(p => ({ p, r: rect(document.querySelector(`[data-seat="${p.id}"]`)), allowed: !attack || p.id === nextLiving(state, 0) }));
  const holes = targets.filter(t => t.allowed).map(({ r }) => `<rect x="${r.x - 12}" y="${r.y - 10}" width="${r.w + 24}" height="${r.h + 64}" rx="20" fill="black"/>`).join('');
  $('targetLayer').innerHTML = `<svg class="target-arrows" width="100%" height="100%" aria-hidden="true"><defs><mask id="targetSpotlights"><rect width="100%" height="100%" fill="white"/>${holes}</mask><marker id="targetHead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" stroke-width="2"/></marker></defs><rect class="target-dimmer" width="100%" height="100%" mask="url(#targetSpotlights)"/>${targets.filter(t => t.allowed).map(({ r }) => `<rect class="target-highlight" x="${r.x - 10}" y="${r.y - 8}" width="${r.w + 20}" height="${r.h + 16}" rx="19"/>`).join('')}${targets.map(({ r, allowed }) => `<path class="${allowed ? 'allowed' : 'unavailable'}" d="M ${origin.cx} ${origin.y - 8} Q ${origin.cx} ${r.cy + 130} ${r.cx} ${r.y + r.h + 8}" marker-end="url(#targetHead)"/>`).join('')}</svg><div class="target-prompt"><strong>CHOOSE A PLAYER</strong><span>${attack ? 'ATTACK · Next living player clockwise' : triple ? 'TRIPLE · Request a card by name' : cards.length === 2 ? 'PAIR · Choose a hidden card next' : 'FAVOR · They choose what to give'}</span>${triple ? `<label>Card name <select id="requestCard">${Object.entries(CARDS).map(([id, c]) => `<option value="${id}" ${id === targetRequest ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}<button class="button light small" id="cancelTarget">Cancel</button></div>${targets.map(({ p, r, allowed }) => `<button class="target-seat-button" style="left:${r.cx}px;top:${r.y + r.h + 16}px" data-target="${p.id}" ${allowed ? '' : 'disabled'} aria-label="${attack ? 'Attack' : 'Choose'} ${esc(p.name)}${!allowed ? ', not the next clockwise player' : ''}">${allowed ? '↗' : '—'} ${esc(p.name)}</button>`).join('')}`;
  $('cancelTarget').onclick = closePanel;
  $('requestCard')?.addEventListener('change', e => { targetRequest = e.target.value; });
  $('targetLayer').querySelectorAll('[data-target]').forEach(b => b.onclick = () => {
    const request = targetRequest;
    panel = null;
    dispatch({ type: 'PLAY', player: 0, cards: [...selected], target: Number(b.dataset.target), ...(triple ? { request } : {}) });
  });
}
function renderSettings() {
  showModal(`${header('MAKE YOURSELF AT HOME.', 'SETTINGS', true)}<div class="settings-grid"><label class="field">ANIMATION PACE<select id="motionSetting"><option value="normal" ${preferences.speed === 'normal' ? 'selected' : ''}>Smooth · normal pace</option><option value="fast" ${preferences.speed === 'fast' ? 'selected' : ''}>Fast · shorter animations</option><option value="calm" ${preferences.speed === 'calm' ? 'selected' : ''}>Calm · minimal motion</option></select></label><label class="toggle-row">Little sound effects<input id="soundSetting" type="checkbox" ${preferences.sound ? 'checked' : ''}></label><p>System reduced-motion preferences are respected at every pace. Opening menus pauses bot decisions. ${storageWorks ? 'Your current table is saved in this browser.' : 'Browser storage is unavailable; keep this tab open to finish your game.'}</p></div><div class="modal-actions">${state ? '<button class="button light" id="freshTable">New table</button>' : ''}<button class="button yellow" data-close>Back to ${state ? 'the table' : 'setup'}</button></div>`);
  $('motionSetting').onchange = e => { preferences.speed = e.target.value; writePrefs(); };
  $('soundSetting').onchange = e => { preferences.sound = e.target.checked; writePrefs(); sound(); };
  $('freshTable')?.addEventListener('click', () => openPanel('newgame'));
}
function renderRules() {
  showModal(`${header('A QUICK SURVIVAL GUIDE.', 'HOW TO PLAY', true)}<ol class="rules-list"><li>On your turn, play any number of cards, or none. <strong>Draw at the end</strong> to finish your turn.</li><li>Draw an Exploding Kitten? Use a <strong>Defuse</strong> and secretly reinsert it anywhere in the pile. No Defuse means elimination. Last survivor wins.</li><li><strong>Attack</strong> ends your turn and gives the next player two turns. When responding to an Attack, transfer all remaining turns and add two. <strong>Skip</strong> ends only one turn.</li><li><strong>Nope</strong> cancels an action or combo before it begins. A Nope cancels another Nope. Kittens and Defuses cannot be Noped.</li><li>Pick <strong>two cards with the same title</strong> to steal randomly. Pick <strong>three matching titles</strong> to request a named card. Cat identities must match exactly. Combo cards do not also perform their individual effects.</li><li><strong>Favor</strong>: the target chooses what to give. <strong>See the Future</strong>: a private top-three peek, without changing their order. <strong>Shuffle</strong>: randomize the pile, then keep playing.</li></ol><p>Setup: each player gets one Defuse plus seven other cards. At 2–3 players, only two leftover Defuses return to the deck. There is one fewer Exploding Kitten than players. No hand-size limit and no five-different-card combo.</p><div class="card-reference">${Object.entries(CARDS).filter(([, c]) => c.family !== 'cat-card').map(([, c]) => `<div class="reference-item"><img src="${c.icon}" alt=""><div><strong>${esc(c.name)} · ${c.count} copies</strong>${esc(c.description)}</div></div>`).join('')}</div><div class="modal-actions"><button class="button yellow" data-close>Got it · back to ${state ? 'the game' : 'setup'}</button></div>`);
}

function resetEffects() {
  presentedTurn = '';
  givingCard = null; orderCard = null; draggedCard = null;
  epoch++; clearTimeout(toastTimer); $('toast').classList.remove('show'); $('toast').textContent = ''; decisionClock.cancel(); clearInterval(reactionTick); reactionDeadline = 0; thinkingPlayer = null; hiddenCards.clear(); effects.forEach(a => a.cancel()); effects.clear(); $('fx').replaceChildren(); $('interactionLayer').replaceChildren(); busy = false;
}
async function newGame() {
  resetEffects();
  handOrder = [];
  const deck = project?.decks.find(d=>d.id===preferences.deck && d.enabled) || project?.decks.find(d=>d.enabled);
  const inventory = deck && Object.fromEntries(Object.entries(deck.cards).filter(([id])=>project.cards.find(c=>c.id===id)?.enabled));
  state = createGame({ bots: preferences.bots, name: preferences.name, difficulty: preferences.difficulty, ...(deck ? {catalog:CARDS,inventory,deckId:deck.id,botNames:project.entities.filter(e=>e.kind==='bot'&&e.enabled).map(e=>e.name).concat(['Peachy','Prootzel','Jazzy','Dolores']).slice(0,4)} : {}) });
  selected = []; paused = false; panel = null;
  busy = true;
  const token = epoch;
  state.players[0].hand.forEach(c => hiddenCards.add(c.uid));
  save(); render();
  try {
    for (let i = 0; i < 8 && token === epoch; i++) {
      await Promise.all(state.players.map(p => {
        const card = p.hand[i];
        return fly(card, rect($('drawPile')), anchor(p.id, card.uid), p.id === 0, false, MOTION.deal, 'deal').then(() => {
          if (token !== epoch) return;
          hiddenCards.delete(card.uid);
          if (p.id === 0) document.querySelector(`[data-card="${CSS.escape(card.uid)}"]`)?.style.removeProperty('visibility');
        });
      }));
    }
    await presentTurn(token);
  } finally {
    if (token === epoch) { hiddenCards.clear(); busy = false; render(); sound('draw'); toast('Eight cards each. You start. Make them count.'); schedule(); }
  }
}
function playSelected() {
  if (!canAct() || !validSelection()) return;
  const cards = selectedCards();
  if (cards.length > 1 || (CARDS[cards[0].type].effect || cards[0].type) === 'favor') return openPanel('target');
  dispatch({ type: 'PLAY', player: 0, cards: [...selected] });
}

function rect(element) {
  if (!element) return null;
  const r = element.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}
function anchor(player, uid) {
  return player === 0 ? rect(uid ? document.querySelector(`[data-card="${CSS.escape(uid)}"]`) : $('humanSeat')) || rect($('humanSeat')) : rect(document.querySelector(`[data-anchor="${player}"]`));
}
async function animate(element, frames, ms, id = 'flight', sceneSegment = false) {
  if (document.hidden) return true;
  const settings = animationSettings(id, ms);
  if (!settings.enabled) return false;
  const factor = sceneSegment ? ms / (SCENE_BASE_MS[id] || ms) : id === 'draw-reveal' ? ms / 820 : 1;
  const effectMs = duration(settings.duration * factor / settings.speed), delay = isCalm() ? 0 : settings.delay;
  const a = element.animate(tuneFrames(settings.keyframes || frames, settings), { duration: effectMs, delay, easing: settings.easing, fill: 'forwards' });
  effects.add(a);
  let watchdog, completed = true;
  try {
    await Promise.race([a.finished, new Promise(resolve => { const recover=()=>{if(editorSandbox && a.playState==='paused')watchdog=setTimeout(recover,1000);else resolve();};watchdog = setTimeout(recover, Math.max(1200, effectMs + delay + 500)); })]);
  } catch { completed = false; /* Restart/cleanup cancels animations. */ }
  finally { clearTimeout(watchdog); effects.delete(a); a.cancel(); }
  return completed;
}
async function fly(card, from, to, face = true, reveal = false, ms = 300, id = 'flight', onArrive) {
  if (id !== 'deal') return steamScenes.handFlight(card,from,to,{face,id:face ? (CARDS[card.type]?.animation || id) : id,token:epoch,ms,onArrive});
  if (!from || !to || isCalm()) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = face ? cardFace(card) : `<div class="card-back">${backFace()}</div>`;
  const el = wrapper.firstElementChild;
  el.classList.add('fly-card');
  Object.assign(el.style, { left: `${from.cx - 66}px`, top: `${from.cy - 92}px` });
  $('fx').appendChild(el);
  const dx = to.cx - from.cx, dy = to.cy - from.cy;
  const startScale = Math.min(1.15, Math.max(.35, from.w / 132)), endScale = Math.min(1.15, Math.max(.4, to.w / 132));
  await animate(el, [
    { transform: `translate(0,0) rotate(-5deg) scale(${startScale})`, opacity: .75 },
    { offset: .4, transform: `translate(${dx * .36}px,${dy * .36 - 36}px) ${reveal ? 'rotateY(75deg)' : 'rotate(5deg)'} scale(${(startScale + endScale) / 2 + .08})`, opacity: 1 },
    { transform: `translate(${dx}px,${dy}px) rotate(3deg) scale(${endScale})`, opacity: 1 },
  ], ms, id === 'flight' && face ? (CARDS[card.type]?.animation || id) : id);
  el.remove();
}
async function stamp(text, color = '#de6156') {
  const el = document.createElement('div'); el.className = 'effect-stamp'; el.textContent = text; el.style.background = color; $('fx').appendChild(el);
  await animate(el, [{ transform: 'translate(-50%,-50%) rotate(-12deg) scale(.6)', opacity: 0 }, { offset: .32, transform: 'translate(-50%,-50%) rotate(3deg) scale(1.08)', opacity: 1 }, { offset: .7, transform: 'translate(-50%,-50%) rotate(-5deg) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-65%) rotate(-5deg) scale(1.02)', opacity: 0 }], MOTION.reveal, 'stamp');
  el.remove();
}
function centerRect() {
  const table = rect(document.querySelector('.table'));
  return { cx: table.cx, cy: table.cy + 18, w: 156, h: 216 };
}
async function drawReveal(card, from, to, reveal, token, onArrive) {
  return steamScenes.draw(card,from,to,{face:reveal,token,hazard:card.type==='exploding-kitten',onArrive});
}
async function dangerMoment(token, player = state?.danger?.player ?? state?.current ?? 0) {
  await steamScenes.danger({player},token);
}
async function defuseMoment(token, player) {
  sound('defuse');
  await steamScenes.defuse({player},token);
  if(token===epoch) toast(player===0?'Defused. Choose a secret insertion position.':`${state.players[player].name} defused the Kitten.`);
}
async function eventFx(event, sources, token) {
  if (token !== epoch) return;
  const discard = rect($('discardPile')), deck = rect($('drawPile'));
  if (event.kind === 'play') {
    sound(CARDS[event.card.type]?.sound || 'play');
    await fly(event.card, sources[event.card.uid] || anchor(event.player), discard, true, event.player !== 0, 300, 'flight', () => {
      if (token === epoch) { hiddenCards.delete(event.card.uid); render(); }
    });
  } else if (event.kind === 'draw') {
    const visible = event.player === 0 || event.card.type === 'exploding-kitten';
    const targetElement = event.player === 0 ? document.querySelector(`[data-card="${CSS.escape(event.card.uid)}"]`) : null;
    targetElement?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const target = event.card.type === 'exploding-kitten' ? rect($('dangerCard')) || centerRect() : targetElement ? rect(targetElement) : anchor(event.player);
    if (targetElement) targetElement.style.visibility = 'hidden';
    sound('draw'); await drawReveal(event.card, deck, target, visible, token, () => {
      if (token !== epoch) return;
      hiddenCards.delete(event.card.uid);
      if (targetElement) targetElement.style.visibility = '';
      renderDanger();
    });
    if (token === epoch && event.player === 0 && event.card.type !== 'exploding-kitten') toast(`You drew ${CARDS[event.card.type].name}.`);
  } else if (event.kind === 'steal') {
    const face = event.from === 0 || event.to === 0 || event.isPublic;
    await fly(event.card, sources[event.card.uid] || anchor(event.from), anchor(event.to, event.card.uid), face, false, 300, 'flight', () => {
      if (token === epoch) { hiddenCards.delete(event.card.uid); render(); }
    });
    if (token === epoch && event.to === 0) toast(`You received ${CARDS[event.card.type].name}.`);
  } else if (event.kind === 'nope') { sound('nope'); await steamScenes.nope({cancelled:event.cancelled,player:state?.pending?.lastNopeBy ?? state?.events?.filter(e=>e.kind==='play' && e.card.type==='nope').at(-1)?.player ?? 0},token); if(token===epoch)toast(event.cancelled?'Nope! Action cancelled.':'Yup! Action restored.'); }
  else if (event.kind === 'attack') toast(`${state.players[event.to].name} must take ${event.remaining} turns.`);
  else if (event.kind === 'defuse') await defuseMoment(token, event.player);
  else if (event.kind === 'insert') await steamScenes.reinsert(sources[event.card.uid] || anchor(event.player), deck, {token});
  else if (event.kind === 'danger') { sound('danger'); await dangerMoment(token,event.player); }
  else if (event.kind === 'explode') {
    sound('danger'); await steamScenes.explode({player:event.player,name:state.players[event.player].name},token);
    if(token!==epoch)return;
    const spent=sources.deathHands?.[event.player] || [];
    await Promise.all(spent.map(card=>fly(card,sources.deathAnchors?.[event.player] || anchor(event.player),discard,false,false,200,'deal')));
    if(token===epoch){spent.forEach(card=>hiddenCards.delete(card.uid));render();toast(`${state.players[event.player].name} exploded.`);}
  }
  else if (event.kind === 'shuffle') await steamScenes.shuffle(deck,token);
  else if (event.kind === 'win') { sound('win'); await confetti(); }

}
async function confetti() {
  return steamScenes.win({player:state?.winner ?? 0,name:state?.players[state?.winner ?? 0]?.name},epoch);
}
async function dispatch(command) {
  if (busy || paused || panel) return;
  const token = epoch;
  let next;
  try {
    next = state;
    const events = [];
    for (const c of Array.isArray(command) ? command : [command]) { next = transition(next, c); events.push(...next.events); }
    next.events = events;
  } catch (error) { toast(error.message); render(); schedule(); return; }
  const sources = {};
  sources.deathHands={}; sources.deathAnchors={};
  for(const e of next.events)if(e.kind==='explode'){
    sources.deathHands[e.player]=[...state.players[e.player].hand];
    sources.deathAnchors[e.player]=anchor(e.player);
    state.players[e.player].hand.forEach(card=>hiddenCards.add(card.uid));
  }
  for (const e of next.events) if (e.card) sources[e.card.uid] = anchor(e.player ?? e.from, e.card.uid);
  for (const e of next.events) if (['play', 'draw', 'steal'].includes(e.kind) && e.card) hiddenCards.add(e.card.uid);
  decisionClock.cancel();
  thinkingPlayer = null;
  clearInterval(reactionTick); reactionDeadline = 0;
  busy = true; state = next;
  selected = [];
  save(); render();
  try { for (const e of next.events) { if (token !== epoch) break; await eventFx(e, sources, token); } await presentTurn(token); }
  catch (error) { console.error('Animation failed; game state remains valid.', error); }
  finally { if (token === epoch) { $('fx').replaceChildren(); hiddenCards.clear(); busy = false; render(); schedule(); } }
}
function activeActor() {
  if (!state || state.phase === 'gameover') return null;
  if (state.phase === 'reaction') return state.pending.responder;
  if (state.phase === 'steal') return state.steal.to;
  if (state.phase === 'favor') return state.favor.from;
  if (state.phase === 'future') return state.future.player;
  if (['danger', 'insert'].includes(state.phase)) return state.danger.player;
  return state.current;
}
function schedule() {
  decisionClock.cancel();
  clearInterval(reactionTick);
  thinkingPlayer = null; renderThinking();
  if (!state || busy || paused || panel || state.phase === 'gameover') return;
  if (editorSandbox && sandboxFrozen) { if(state.phase==='reaction')reactionDeadline=Date.now()+REACTION_MS;renderReaction();return; }
  if (state.phase === 'reaction') {
    reactionDeadline = Date.now() + REACTION_MS;
    renderReaction();
    reactionTick = setInterval(renderReaction, 100);
    const token = epoch;
    decisionClock.schedule(() => {
      if (token !== epoch || busy || paused || panel || state.phase !== 'reaction') return;
      let preview = state;
      const commands = [];
      while (preview.phase === 'reaction') {
        const id = preview.pending.responder;
        const c = id === 0 ? { type: 'PASS', player: 0 } : chooseBotAction(botView(preview, id));
        commands.push(c);
        preview = transition(preview, c);
        if (c.type === 'NOPE') break;
      }
      dispatch(commands);
    }, REACTION_MS);
    return;
  }
  reactionDeadline = 0; renderReaction();
  const actor = activeActor();
  if (actor === 0) {
    return;
  }
  const token = epoch;
  const view = botView(state, actor), botDefinition = project?.entities.filter(e=>e.kind==='bot' && e.enabled)[actor-1];
  if (['clever','casual'].includes(botDefinition?.behavior?.difficulty)) view.difficulty=botDefinition.behavior.difficulty;
  const command = chooseBotAction(view);
  const ms = 500 + Math.random() * 700;
  thinkingPlayer = actor; renderThinking();
  decisionClock.schedule(() => { if (token === epoch) dispatch(command); }, ms);
}

function renderReaction() {
  const show = state?.phase === 'reaction' && !panel && !paused;
  $('reactionBar').hidden = !show;
  if (!show) return;
  const a = state.pending;
  const remaining = busy ? REACTION_MS : Math.max(0, reactionDeadline - Date.now());
  $('reactionHeading').textContent = a.cancelled ? 'ACTION CANCELLED · COUNTER-NOPE?' : 'RESPONSE WINDOW';
  $('reactionText').textContent = `${state.players[a.actor].name}: ${a.label} · ${(remaining / 1000).toFixed(1)}s`;
  const type = a.cardType ?? (CARDS[a.effect] ? a.effect : state.discard.findLast(c => c.type !== 'nope')?.type);
  if ($('reactionArt').dataset.type !== type) { $('reactionArt').dataset.type = type; $('reactionArt').innerHTML = type ? `<img src="${CARDS[type].art}" alt="">` : ''; }
  const count = a.nopeCount ?? 0;
  $('reactionNopes').innerHTML = count ? `${Array.from({ length: Math.min(count, 5) }, (_, i) => `<img style="--i:${i}" src="${CARDS.nope.art}" alt="">`).join('')}<b>${count} NOPE${count > 1 ? 'S' : ''} · ${a.cancelled ? 'CANCELLED' : 'RESTORED'}</b>` : '';
  $('reactionProgress').style.width = `${remaining / REACTION_MS * 100}%`;
  $('nopeButton').hidden = !canNope(state, 0);
  $('nopeButton').disabled = busy;
  $('nopeButton').textContent = a.cancelled ? 'COUNTER-NOPE!' : 'NOPE!';
  positionHandActions();
}

function positionHandActions() {
  const play = $('cardPlayAction');
  const selectedCard = $('hand').querySelector('.selected');
  play.hidden = !selectedCard || !canAct() || !validSelection();
  if (!play.hidden) {
    const r = rect(selectedCard), clip = rect($('handScroll'));
    play.hidden = r.cx < clip.x || r.cx > clip.x + clip.w;
    play.style.left = `${Math.max(42, Math.min(innerWidth - 42, r.cx))}px`;
    play.style.top = `${Math.max(0, r.y - 35)}px`;
    play.textContent = selected.length > 1 ? `PLAY ${selected.length === 2 ? 'PAIR' : 'TRIPLE'} ↗` : 'PLAY ↗';
  }
  const container = $('handNopeActions');
  if (!canNope(state, 0) || busy || panel || paused) { container.replaceChildren(); return; }
  const clip = rect($('handScroll'));
  const choices = state.players[0].hand.filter(c => c.type === 'nope').map(c => ({ c, r: rect(document.querySelector(`[data-card="${CSS.escape(c.uid)}"]`)) })).filter(({ r }) => r && r.cx >= clip.x && r.cx <= clip.x + clip.w);
  const key = choices.map(({ c }) => c.uid).join(',');
  if (container.dataset.key !== key || !container.children.length) {
    container.dataset.key = key;
    container.innerHTML = choices.map(({ c }, i) => `<button class="hand-nope-button" data-nope-card="${esc(c.uid)}" aria-label="Nope opponent action with hand card ${i + 1}" title="Nope this opponent action">NOPE</button>`).join('');
    container.querySelectorAll('[data-nope-card]').forEach(b => b.onclick = () => dispatch({ type: 'NOPE', player: 0, card: b.dataset.nopeCard }));
  }
  choices.forEach(({ r }, i) => {
    const b = container.children[i];
    b.style.left = `${Math.min(clip.x + clip.w - 21, r.x + r.w - 15)}px`;
    b.style.top = `${Math.max(8, r.y + 15)}px`;
  });
}

function renderThinking() {
  document.querySelectorAll('.opponent').forEach(e => {
    const thinking = !paused && !panel && !busy && Number(e.dataset.seat) === thinkingPlayer;
    e.classList.toggle('thinking', thinking);
    let badge = e.querySelector('.thinking-label');
    if (!badge) { badge = document.createElement('span'); badge.className = 'thinking-label'; e.appendChild(badge); }
    badge.textContent = 'THINKING…'; badge.hidden = !thinking;
  });
}

function renderInteraction() {
  let actor, target, label;
  if (!state || paused || panel) return $('interactionLayer').replaceChildren();
  if (state.phase === 'reaction' && ['pair', 'triple', 'favor'].includes(state.pending.effect) && !state.pending.cancelled) {
    actor = state.pending.actor; target = state.pending.target; label = state.pending.effect === 'favor' ? 'FAVOR' : 'STEAL';
  } else if (state.phase === 'favor') { actor = state.favor.to; target = state.favor.from; label = 'FAVOR'; }
  else if (state.phase === 'steal') { actor = state.steal.to; target = state.steal.from; label = 'STEAL'; }
  else return $('interactionLayer').replaceChildren();
  const from = actor === 0 ? rect($('humanSeat')) : rect(document.querySelector(`[data-seat="${actor}"]`));
  const to = target === 0 ? rect($('humanSeat')) : rect(document.querySelector(`[data-seat="${target}"]`));
  if (!from || !to) return;
  const sx = from.cx, sy = actor === 0 ? from.y - 10 : from.y + from.h + 12;
  const ex = to.cx, ey = target === 0 ? to.y - 15 : to.y + to.h + 12;
  const bend = Math.min(innerHeight - 200, Math.max(sy, ey) + (actor && target ? 65 : -100));
  $('interactionLayer').innerHTML = `<svg class="interaction-path" width="100%" height="100%" aria-hidden="true"><path d="M${sx},${sy} Q${(sx + ex) / 2},${bend} ${ex},${ey}"/></svg><span class="interaction-caption" role="status">${esc(state.players[actor].name)} <span aria-hidden="true">→</span> ${esc(state.players[target].name)} · ${label}</span>`;
}

function renderDanger() {
  const show = state?.phase === 'danger' && !panel && !paused;
  $('dangerPanel').hidden = !show;
  if (!show) return;
  const card = state.danger.card, player = state.players[state.danger.player], safe = player.hand.some(c => c.type === 'defuse');
  const center = centerRect();
  $('dangerPanel').style.left = `${center.cx}px`; $('dangerPanel').style.top = `${center.cy}px`;
  if ($('dangerCard').dataset.uid !== card.uid) { $('dangerCard').innerHTML = cardFace(card); $('dangerCard').dataset.uid = card.uid; }
  $('dangerCard').style.visibility = hiddenCards.has(card.uid) ? 'hidden' : '';
  $('dangerTitle').textContent = 'EXPLODING KITTEN!';
  $('dangerHint').textContent = busy ? `${player.name} drew a Kitten…` : state.danger.player !== 0 ? `${player.name} is resolving the Kitten.` : safe ? 'Click a glowing Defuse in your hand to survive.' : 'No Defuse remains. This is your last turn.';
  $('explodeButton').hidden = busy || state.danger.player !== 0 || safe;
}

$('cardPlayAction').onclick = playSelected;
$('explodeButton').onclick = () => dispatch({ type: 'EXPLODE', player: 0 });

$('nopeButton').onclick = () => dispatch({ type: 'NOPE', player: 0 });
function reposition() { if (panel === 'target') renderTarget(); positionHandActions(); renderInteraction(); renderDanger(); }
window.addEventListener('resize', reposition);
window.addEventListener('scroll', reposition, true);

$('drawPile').onclick = $('drawButton').onclick = () => { if (canAct()) dispatch({ type: 'DRAW', player: 0 }); };
$('playButton').onclick = playSelected;
$('clearButton').onclick = () => { selected = []; renderHand(); };
$('settingsButton').onclick = () => openPanel('settings');
$('rulesButton').onclick = () => openPanel('rules');
$('historyButton').onclick = () => openPanel('history');
$('soundButton').onclick = () => { preferences.sound = !preferences.sound; writePrefs(); render(); if (preferences.sound) sound(); };
$('pauseButton').onclick = () => { paused = !paused; thinkingPlayer = null; decisionClock.cancel(); clearInterval(reactionTick); save(); render(); if (!paused) schedule(); };
$('modal').addEventListener('cancel', e => { e.preventDefault(); if (panel && panel !== 'setup') closePanel(); });
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea') || e.ctrlKey || e.metaKey || e.altKey || $('modal').open) return;
  if (e.key.toLowerCase() === 'd' && canAct()) { e.preventDefault(); dispatch({ type: 'DRAW', player: 0 }); }
  if (e.key === 'Enter' && canAct()) { e.preventDefault(); playSelected(); }
  if (e.key === 'Escape') { if (panel === 'target') closePanel(); else { selected = []; renderHand(); } }
});
document.addEventListener('visibilitychange', () => {
  if (!state) return;
  if (document.hidden) {
    save();
    // Complete the current visual handoff; future hidden-tab actions skip travel.
    effects.forEach(animation => { try { animation.finish(); } catch { animation.cancel(); } });
  } else {
    decisionClock.catchUp();
    if (!busy) render();
  }
});
window.addEventListener('beforeunload', save);
reduced.addEventListener('change', () => { writePrefs(); });

writePrefs(); render();
if (editorSandbox) {
  const { installBridge } = await import('./editor/bridge.js');
  installBridge({ getState:()=>structuredClone(state), getPreferences:()=>({...preferences}),
    replaceState(next) { assertState(next); resetEffects(); state=structuredClone(next); Object.assign(CARDS,state.catalog || {}); selected=[]; panel=null; paused=false; sandboxFrozen=true; reactionDeadline=state.phase==='reaction'?Date.now()+REACTION_MS:0; save(); render(); },
    refresh() { Object.assign(CARDS,Object.fromEntries((project?.cards || []).map(c=>[c.id,c]))); render(); },
    async command(command) { if (!state) throw new Error('Create a sandbox table first.'); if(busy)throw new Error('Wait for the current animation.'); transition(state,command); panel=null; paused=false; sandboxFrozen=true; await dispatch(command); decisionClock.cancel(); clearInterval(reactionTick); thinkingPlayer=null; render(); },
    preview: { fly, drawReveal, eventFx, stamp, dangerMoment, defuseMoment, confetti, animate, centerRect, rect, anchor, sound, presentTurn },
    token:()=>epoch });
}
