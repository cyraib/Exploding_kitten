// Optional configuration consumer. The engine never imports the editor.
export let project = null;
if (typeof window !== 'undefined') {
  try {
    const response = await fetch('/app/config/project.json');
    if (response.ok) project = await response.json();
  } catch { /* The original game remains usable without configuration. */ }
}
export function setProject(value) { project = value; }
export function animationSettings(id, duration) {
  const a = project?.animations?.find(a => a.id === id);
  return { duration: a?.duration ?? duration, delay: a?.delay ?? 0, easing: a?.easing ?? 'cubic-bezier(.22,.75,.22,1)',
    enabled: a?.enabled !== false, speed: a?.speed ?? 1, distance: a?.distance ?? 1, scale: a?.scale ?? 1,
    rotation: a?.rotation ?? 0, opacity: a?.opacity ?? 1, intensity: a?.intensity ?? 1, keyframes: a?.keyframes };
}
// Used by both the game and dashboard preview; preserve measured flight endpoints.
export function tuneFrames(frames, settings) {
  return frames.map((frame, index) => {
    const copy = { ...frame };
    if (copy.opacity !== undefined) copy.opacity = Number(copy.opacity) * settings.opacity;
    if (copy.transform) {
      copy.transform = (copy.transform==='none'?'':copy.transform) + ` scale(${settings.scale}) rotate(${settings.rotation}deg)`;
      if (index > 0 && index < frames.length - 1) copy.transform += ` translateY(${-20 * (settings.distance - 1) * settings.intensity}px)`;
    }
    return copy;
  });
}
export function presentationCSS(config) {
  const rule = (selector, styles) => `${selector}{${Object.entries(styles || {}).map(([k,v]) => `${k}:${v}`).join(';')}}`;
  let css = ':root{' + Object.entries(config?.theme || {}).map(([k,v]) => `${k}:${v}`).join(';') + '}';
  for(const e of config?.entities || [])if(e.enabled && e.kind==='font' && e.asset)css+=`@font-face{font-family:"${e.name}";src:url("${e.asset}");font-display:swap}`;
  for (const u of config?.ui || []) {
    if (!u.enabled) { css += rule(u.selector, { display: 'none!important' }); continue; }
    css += rule(u.selector, u.styles);
    if(u.asset)css+=rule(u.selector.split(',').map(s=>s.trim()+':not(img)').join(','),{'background-image':`url("${u.asset}")`});
    for (const state of ['hover','active','disabled']) css += rule(u.selector.split(',').map(s=>s.trim()+':'+state).join(','), u[state]);
    for (const [size, condition] of [['mobile','max-width:700px'], ['tablet','min-width:701px) and (max-width:1000px'], ['desktop','min-width:1001px']]) {
      css += `@media(${condition}){${rule(u.selector, u[size])}}`;
    }
  }
  for (const a of config?.animations || []) if (a.selector) {
    const speed = a.speed || 1;
    if (a.kind === 'transition') { css += rule(a.selector, {'transition-duration':`${a.enabled ? a.duration/speed : 0}ms!important`,'transition-delay':`${a.delay}ms!important`,'transition-timing-function':`${a.easing}!important`}); continue; }
    css += rule(a.selector, { 'animation-duration': `${a.duration / speed}ms!important`, 'animation-delay': `${a.delay}ms!important`, 'animation-timing-function': `${a.easing}!important`, ...(a.enabled ? {} : { animation: 'none!important' }) });
    if (a.cssFrames) css += `@keyframes ${a.id}{${Object.entries(a.cssFrames).map(([at, style]) => {
      const tuned={...style};
      if(a.opacity!==1)tuned.opacity=String(Number(tuned.opacity ?? 1)*a.opacity);
      if(a.scale!==1 || a.rotation!==0 || a.distance!==1) tuned.transform=(tuned.transform==='none'?'':tuned.transform||'')+` scale(${1+(a.scale-1)*a.intensity}) rotate(${a.rotation*a.intensity}deg) translateY(${-20*(a.distance-1)*a.intensity}px)`;
      if(a.intensity!==1 && tuned['box-shadow'])tuned['box-shadow']=tuned['box-shadow'].replace(/([\d.]+)px/g,(_,n)=>`${Number(n)*a.intensity}px`);
      return `${at}{${Object.entries(tuned).map(([k,v]) => `${k}:${v}`).join(';')}}`;
    }).join('')}}`;
  }
  (config?.entities || []).filter(e=>e.kind==='bot'&&e.enabled).forEach((e,i)=>{css+=rule(`[data-seat="${i+1}"]`,e.properties);});
  const player=config?.entities?.find(e=>e.kind==='player'&&e.enabled);if(player)css+=rule('#humanSeat',player.properties);
  return css;
}
export function applyPresentation(config = project) {
  if (!config) return;
  let style = document.getElementById('projectPresentation');
  if (!style) { style = document.createElement('style'); style.id = 'projectPresentation'; document.head.append(style); }
  style.textContent = presentationCSS(config);
  for (const u of config.ui || []) document.querySelectorAll(u.selector).forEach(el => {
    const textTarget=el.childElementCount ? [...el.querySelectorAll('span,strong,p,small')].find(n=>!n.childElementCount && n.textContent.trim()) : el;
    if (u.text) {
      if (textTarget) { if (!textTarget.dataset.originalText) textTarget.dataset.originalText = textTarget.textContent; textTarget.textContent = u.text; }
    } else if (textTarget?.dataset.originalText) { textTarget.textContent = textTarget.dataset.originalText; delete textTarget.dataset.originalText; }
    if (el.tagName === 'IMG') { if(u.asset){el.dataset.originalSrc ||= el.src;el.src=u.asset;}else if(el.dataset.originalSrc){el.src=el.dataset.originalSrc;delete el.dataset.originalSrc;} }
  });
  document.querySelectorAll('[data-config-entity]').forEach(el => el.remove());
  const bots=(config.entities || []).filter(e=>e.kind==='bot'&&e.enabled);
  const originalAvatars=['/Assets/cards/cat-card/tacocat.png','/Assets/cards/cat-card/beard-cat.png','/Assets/cards/cat-card/hairy-potato-cat.png','/Assets/cards/cat-card/rainbow-ralphing-cat.png'];
  bots.forEach((e,i)=>document.querySelectorAll(`[data-seat="${i+1}"]`).forEach(el=>{
    const avatar=el.querySelector('.avatar'), img=avatar?.querySelector('img');
    if(img && e.asset)img.src=e.asset;
    avatar?.classList.toggle('custom-avatar',Boolean(e.asset && e.asset!==originalAvatars[i]));
  }));
  for (const e of config.entities || []) {
    if (!e.enabled || !['notification','game-object','effect'].includes(e.kind)) continue;
    const el = document.createElement('div'); el.dataset.configEntity = e.id; el.className = 'configured-entity';
    el.textContent = e.name; Object.assign(el.style, e.properties || {});
    if (e.asset) { const img = document.createElement('img'); img.src = e.asset; img.alt = e.name; img.style.maxWidth = '100%'; el.replaceChildren(img); }
    document.getElementById('game')?.append(el);
  }
}
