// Original, code-native reconstructions of the Bean/paw presentation language.
// These drawings are not extracted game assets or the official animation rigs.
const COLORS = ['#f3a23b', '#83c8cf', '#b79adc', '#a9c876', '#efca63'];
const OUTLINE = '#342828';
const safeColor = color => /^#[\da-f]{3,8}$/i.test(String(color)) ? color : COLORS[0];

export function colorForSeat(seat) {
  const id = Number.isInteger(seat) ? seat : Number(seat?.id) || 0;
  return COLORS[((id % COLORS.length) + COLORS.length) % COLORS.length];
}

export function beanMarkup(seat, { dead = false, expression = 'idle' } = {}) {
  const id = Number.isInteger(seat) ? seat : Number(seat?.id) || 0;
  const color = colorForSeat(id);
  const mood = dead ? 'dead' : ['idle', 'worried', 'happy', 'angry'].includes(expression) ? expression : 'idle';
  const cat = id === 0;
  const eyes = mood === 'dead'
    ? '<path d="m64 73 14 15m0-15-14 15m37-15 14 15m0-15-14 15" fill="none" stroke-width="5" stroke-linecap="round"/>'
    : `<ellipse cx="72" cy="79" rx="16" ry="21" fill="#fffdf2"/><ellipse cx="112" cy="77" rx="16" ry="22" fill="#fffdf2"/><ellipse cx="${mood === 'worried' ? 74 : 77}" cy="${mood === 'happy' ? 82 : 79}" rx="5" ry="8" fill="${OUTLINE}"/><ellipse cx="${mood === 'worried' ? 110 : 116}" cy="${mood === 'happy' ? 80 : 77}" rx="5" ry="8" fill="${OUTLINE}"/>`;
  const mouth = mood === 'dead'
    ? '<path d="M80 114q11-13 24 0" fill="none" stroke-width="4"/><path d="M88 112v12q7 4 9-1v-11" fill="#de7c80" stroke-width="2"/>'
    : mood === 'worried'
      ? '<ellipse cx="93" cy="111" rx="8" ry="10" fill="#5a3537"/><path d="m58 57 25-5m18 0 25 5" fill="none" stroke-width="4" stroke-linecap="round"/>'
      : mood === 'happy'
        ? '<path d="M79 105q14 6 28-2-2 25-16 22-11-3-12-20" fill="#65333a"/><path d="M84 119q10-6 17 0" fill="#ec8b93" stroke="none"/>'
        : mood === 'angry'
          ? '<path d="m58 55 26 9m18 0 25-10M80 111h25" fill="none" stroke-width="4" stroke-linecap="round"/>'
          : '<path d="M83 108q10 10 21-1" fill="none" stroke-width="4" stroke-linecap="round"/>';
  const costume = cat
    ? `<path d="M39 54 31 16q22 3 39 23M109 37q24-24 42-22l-7 44" fill="${color}"/><path d="m39 37-2-13 23 17m64-1 17-16-1 16" fill="#de805f" stroke="none"/><path d="M40 89q-23 1-17 20 6 15 19 7m99 3q34-12 18 17-4 7-17 6" fill="${color}"/><path d="m42 47 14 7m78-7-13 7m-84 83 13-4m80 2 13 6" fill="none" stroke="#b97833" stroke-width="5" stroke-linecap="round"/>`
    : id % 4 === 1
      ? '<path d="M61 41q-16-25-21-28m82 28q10-24 21-28" fill="none" stroke-width="4"/><circle cx="39" cy="12" r="9" fill="#eee0a5"/><circle cx="144" cy="12" r="9" fill="#eee0a5"/>'
      : id % 4 === 2
        ? '<path d="m52 45 26-35 44 33 16 7q-40 14-91 2Z" fill="#8060a8"/><path d="m87 23 3 7 8 1-6 5 1 8-7-4-7 4 2-8-6-5 8-1Z" fill="#ffe18c" stroke="none"/>'
        : id % 4 === 3
          ? '<circle cx="56" cy="43" r="14" fill="#90b75f"/><circle cx="125" cy="41" r="14" fill="#90b75f"/><circle cx="55" cy="39" r="5" fill="#fff5cc" stroke="none"/><circle cx="125" cy="37" r="5" fill="#fff5cc" stroke="none"/>'
          : '<path d="m59 44-6-27m65 26 10-26" fill="none" stroke-width="4"/><circle cx="51" cy="15" r="8" fill="#6b4b37"/><circle cx="130" cy="15" r="8" fill="#6b4b37"/>';
  const deadSmoke = dead ? '<path d="M63 29q-10-11 2-20m29 20q13-11 3-23m25 24q-8-12 3-20" fill="none" stroke="#928078" stroke-width="5" stroke-linecap="round"/>' : '';
  const bones = dead ? '<g class="bean-bones" fill="none" stroke="#302826" stroke-width="4" stroke-linecap="round"><path d="M92 143v32m-20-29q20 12 40 0m-41 9q20 10 42 0m-38 9q17 9 34-1M81 175l-17 14m36-14 20 14M35 124l-10 18m120-23 12 15"/><path d="m78 173 14 6 13-7" stroke-width="5"/><circle cx="63" cy="189" r="3" fill="#eee2ce"/><circle cx="121" cy="189" r="3" fill="#eee2ce"/><circle cx="25" cy="142" r="3" fill="#eee2ce"/><circle cx="158" cy="135" r="3" fill="#eee2ce"/></g>' : '';
  return `<svg class="steam-bean steam-bean-${cat ? 'cat' : 'costume'} steam-bean-${mood}" viewBox="0 0 180 205" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"><ellipse cx="91" cy="192" rx="54" ry="9" fill="#302821" opacity=".19" stroke="none"/>${costume}<path class="bean-arm bean-arm-left" d="M43 117q-28-5-30 21-1 10 12 13 12 2 18-13" fill="${dead ? '#a69b91' : color}"/><path class="bean-arm bean-arm-right" d="M139 114q26-8 28 17 0 13-14 15-10 0-16-11" fill="${dead ? '#a69b91' : color}"/><path d="m64 165-6 20q-12 1-13 10h35l3-31m31 0 7 21q15 0 18 10h-35l-8-31" fill="${dead ? '#a69b91' : color}"/><path class="bean-body" d="M43 68q2-34 47-35 45 0 49 39l8 70q5 30-24 34l-64 2q-31-4-27-32Z" fill="${dead ? '#a69b91' : color}"/><path d="M44 73q0-25 17-30" fill="none" stroke="#fffbe8" stroke-width="7" opacity=".28" stroke-linecap="round"/><path d="M45 103q2-50 45-48 45-2 48 44l-6 27q-7 17-40 18-39 0-47-21Z" fill="${dead ? '#d3c7ba' : '#f5e5cd'}" stroke-width="2.6"/>${eyes}${mouth}<path d="M69 151q21 10 45-1m-23-6 1 29" fill="none" stroke="#5d473d" stroke-width="2" opacity=".55"/>${cat ? '<path d="M87 96h11l-5 5Z" fill="#c9796c" stroke-width="1.6"/><path d="m46 104 14 1m-13 7 14-2m64-5 15-2m-15 10 15 1" fill="none" stroke-width="2"/>' : ''}${bones}${deadSmoke}</g></svg>`;
}

export function handMarkup(color = COLORS[0]) {
  const fill = safeColor(color);
  return `<svg class="steam-paw" viewBox="0 0 140 245" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g stroke="${OUTLINE}" stroke-width="3.2" stroke-linejoin="round"><path class="paw-arm" d="M45 109q20-10 45-3l19 137H26Z" fill="${fill}"/><path d="M48 121q20 7 43-1l3 19q-27 7-47-1Z" fill="#fff9eb" opacity=".35" stroke="none"/><path class="paw-palm" d="M40 106 26 75Q10 62 16 54q8-9 24 3L31 28q-4-16 9-18 11 0 17 25l4-23Q64-3 75 2q10 5 8 28l9-11q12-8 19 3 4 7-3 24l-2 7q24-8 28 5 2 8-12 21l-16 14q-3 18-20 24Z" fill="${fill}"/><path d="m51 76 3 20m17-28 1 24m20-26-4 27" fill="none" stroke-width="2.6" opacity=".6" stroke-linecap="round"/><path d="M33 23q4-8 11-2l5 12-9 3Zm31-9q8-6 13 2v13l-12-1Zm31 14q6-7 11-1l-6 10-10-4ZM119 57q9-3 10 3l-9 8-7-6Z" fill="#90d5d0" stroke-width="1.8"/><path d="m47 159 4 54" fill="none" stroke="#fffaf0" stroke-width="8" stroke-linecap="round" opacity=".22"/></g></svg>`;
}

export function symbolMarkup(kind) {
  const shapes = {
    flame: '<path d="M101 12q25 34 7 59 30-5 31-32 52 52 27 112-12 31-63 35-59-2-69-50-11-47 18-77-1 30 22 37-1-38 27-84Z" fill="#ef673e"/><path d="M95 62q20 23 4 45 25-5 27-22 26 35 10 64-9 21-35 22-34 0-42-26-8-28 10-46 0 22 15 27-1-36 11-64Z" fill="#ffc347"/><path d="M103 123q25 21 8 36-9 8-21 0-14-10 13-36Z" fill="#fff0a6"/>',
    smoke: '<path d="M35 155q-24-8-15-31-20-24 5-42-6-27 24-32 0-35 35-28 27-26 46 4 35-7 34 29 31 9 17 37 28 20 8 43-4 31-35 27-38 24-73-3-27 15-46-4Z" fill="#d7cec0"/><path d="M53 71q-20 22 8 29m67-53q19 24-4 33m-26 15q-29 16-5 34m60-21q-2 22-23 21" fill="none" stroke="#9d9083" stroke-width="7" opacity=".6" stroke-linecap="round"/>',
    crown: '<path d="m33 58 34 27 32-57 32 57 35-27-17 88H48Z" fill="#f1bc3a" stroke="#6b4726" stroke-width="5" stroke-linejoin="round"/><path d="M49 119h100v30H49Z" fill="#f6d86c"/><circle cx="99" cy="119" r="11" fill="#dc6565"/><circle cx="32" cy="53" r="10" fill="#ffdf7b"/><circle cx="100" cy="23" r="10" fill="#ffdf7b"/><circle cx="166" cy="53" r="10" fill="#ffdf7b"/>',
    safe: '<circle cx="100" cy="100" r="75" fill="#96bd79" stroke="#334632" stroke-width="5"/><path d="m55 104 30 30 61-70" fill="none" stroke="#fff6df" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>',
    skull: '<path d="M48 110q-30-69 52-82 81 12 54 82l-22 14v39H68v-39Z" fill="#eee2ce" stroke="#352b29" stroke-width="5"/><ellipse cx="74" cy="85" rx="15" ry="19" fill="#352b29"/><ellipse cx="126" cy="85" rx="15" ry="19" fill="#352b29"/><path d="m100 104-10 18h20ZM86 140v22m28-22v22" fill="#352b29" stroke="#352b29" stroke-width="4"/>',
    burst: '<path d="m100 9 13 47 36-30-8 47 48 3-38 27 36 34-48-2 3 49-31-38-25 40-4-49-48 14 30-39-44-23 48-6-17-45 40 25Z" fill="#ffd55d" stroke="#9a482f" stroke-width="3"/>',
  };
  return `<svg class="steam-symbol steam-symbol-${Object.hasOwn(shapes, kind) ? kind : 'burst'}" viewBox="0 0 200 200" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${shapes[kind] || shapes.burst}</svg>`;
}
