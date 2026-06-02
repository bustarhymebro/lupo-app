// ═══════════════════════════════════════════════════════
//  LUPO WOLF — shaded illustrated mascot (front-facing, sitting)
//  Morphs by maturity 0..1: pup (huge head/big eyes/stubby ears/round)
//  -> adult (lean, tall ears, mane, amber eyes). Soft gradient shading,
//  ambient occlusion, glossy eyes — a designed look, not flat slop.
// ═══════════════════════════════════════════════════════
(function (global) {
  'use strict';
  let UID = 0;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hx(n) { n = Math.round(Math.max(0, Math.min(255, n))); return n.toString(16).padStart(2, '0'); }
  function toRGB(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
  function mix(c1, c2, t) { const a=toRGB(c1), b=toRGB(c2); return '#'+hx(lerp(a[0],b[0],t))+hx(lerp(a[1],b[1],t))+hx(lerp(a[2],b[2],t)); }
  function lighten(c,t){ return mix(c,'#FFFFFF',t); }
  function darken(c,t){ return mix(c,'#1A1F29',t); }

  function style(m) {
    m = Math.max(0, Math.min(1, m));
    const fur = mix('#C9CFD5', '#828E98', m);
    return {
      m, fur,
      furLight: lighten(fur, 0.16),
      furShadow: darken(fur, 0.20),
      cream: '#EFEFEA', creamSh: '#D9DAD2',
      ear: '#3A4047', earInner: mix('#5A4038', '#6B4A40', m),
      nose: '#2C3137',
      amber: m > 0.55,
      eye: m > 0.55 ? '#E8A23A' : '#33383F',
      eyeHi: m > 0.55 ? '#FFD27A' : '#5A616B',
      eyeDark: '#16191E',
      mane: m > 0.7,
      earLen: lerp(-10, 36, m),
      headK: lerp(1.5, 0.86, m),
      bodyK: lerp(0.72, 1.1, m),
      eyeK: lerp(1.42, 0.86, m),
      scale: lerp(0.9, 1.06, m),
    };
  }

  function wolfSVG(m) {
    const s = style(m), el = s.earLen, id = 'w' + (UID++);
    const er = (7.6 * s.eyeK).toFixed(1), ery = (9.4 * s.eyeK).toFixed(1);
    const mane = s.mane
      ? `<g fill="${s.furShadow}">
           <path d="M62 150 l-19 9 l15 6 l-15 13 l19 -1 l-8 14 l20 -8"/>
           <path d="M158 150 l19 9 l-15 6 l15 13 l-19 -1 l8 14 l-20 -8"/>
         </g>` : '';
    const pupils = s.amber
      ? `<ellipse cx="93" cy="${99}" rx="${3.5*s.eyeK}" ry="${4.6*s.eyeK}" fill="${s.eyeDark}"/>
         <ellipse cx="127" cy="${99}" rx="${3.5*s.eyeK}" ry="${4.6*s.eyeK}" fill="${s.eyeDark}"/>` : '';

    return `
<svg class="wolf-svg-el" viewBox="0 0 220 250" xmlns="http://www.w3.org/2000/svg" aria-label="Lupo">
 <defs>
   <radialGradient id="${id}b" cx="50%" cy="32%" r="75%">
     <stop offset="0%" stop-color="${s.furLight}"/><stop offset="62%" stop-color="${s.fur}"/><stop offset="100%" stop-color="${s.furShadow}"/>
   </radialGradient>
   <radialGradient id="${id}h" cx="50%" cy="36%" r="70%">
     <stop offset="0%" stop-color="${s.furLight}"/><stop offset="66%" stop-color="${s.fur}"/><stop offset="100%" stop-color="${s.furShadow}"/>
   </radialGradient>
   <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0%" stop-color="${s.cream}"/><stop offset="100%" stop-color="${s.creamSh}"/>
   </linearGradient>
   <radialGradient id="${id}e" cx="40%" cy="35%" r="70%">
     <stop offset="0%" stop-color="${s.eyeHi}"/><stop offset="55%" stop-color="${s.eye}"/><stop offset="100%" stop-color="${darken(s.eye,0.3)}"/>
   </radialGradient>
 </defs>
 <g class="w-all">
  <ellipse cx="110" cy="238" rx="${74*s.bodyK}" ry="11" fill="rgba(0,0,0,0.30)"/>
  <g transform="translate(110 250) scale(${s.scale}) translate(-110 -250)">

   <!-- BODY -->
   <g transform="translate(110 240) scale(${s.bodyK}) translate(-110 -240)">
     <g class="w-tail">
       <path d="M150 198 q47 -6 43 -61 q-3 -29 -25 -29 q16 25 3 50 q-9 21 -34 28 z" fill="url(#${id}b)"/>
       <path d="M180 112 q14 7 12 27 q-1 12 -7 18 q-8 -25 -7 -45 z" fill="${s.furLight}"/>
     </g>
     <ellipse cx="72" cy="198" rx="35" ry="41" fill="${s.furShadow}"/>
     <ellipse cx="148" cy="198" rx="35" ry="41" fill="${s.furShadow}"/>
     <path d="M110 130 c36 0 52 27 52 60 c0 31 -19 48 -52 48 c-33 0 -52 -17 -52 -48 c0 -33 16 -60 52 -60 z" fill="url(#${id}b)"/>
     <path d="M110 150 c15 0 23 14 23 38 c0 21 -10 33 -23 33 c-13 0 -23 -12 -23 -33 c0 -24 8 -38 23 -38 z" fill="url(#${id}c)"/>
     ${mane}
     <rect x="89"  y="188" width="19" height="54" rx="9.5" fill="${s.fur}"/>
     <rect x="112" y="188" width="19" height="54" rx="9.5" fill="${s.fur}"/>
     <rect x="89"  y="220" width="19" height="22" rx="9.5" fill="${s.ear}"/>
     <rect x="112" y="220" width="19" height="22" rx="9.5" fill="${s.ear}"/>
     <ellipse cx="110" cy="132" rx="40" ry="13" fill="rgba(0,0,0,0.06)"/>
   </g>

   <!-- HEAD -->
   <g transform="translate(110 116) scale(${s.headK}) translate(-110 -116)">
     <polygon points="74,80 60,${22-el} 104,58" fill="${s.furShadow}"/>
     <polygon points="73,72 65,${31-el} 95,57" fill="${s.earInner}"/>
     <polygon points="146,80 160,${22-el} 116,58" fill="${s.furShadow}"/>
     <polygon points="147,72 155,${31-el} 125,57" fill="${s.earInner}"/>
     <polygon points="60,102 49,93 65,117" fill="${s.fur}"/>
     <polygon points="160,102 171,93 155,117" fill="${s.fur}"/>
     <path d="M110 54 c31 0 52 21 52 52 c0 31 -22 52 -52 52 c-30 0 -52 -21 -52 -52 c0 -31 21 -52 52 -52 z" fill="url(#${id}h)"/>
     <path d="M110 60 c-22 0 -40 12 -47 30 c10 -10 27 -16 47 -16 c20 0 37 6 47 16 c-7 -18 -25 -30 -47 -30 z" fill="${s.furLight}" opacity="0.5"/>
     <path d="M110 82 c12 0 21 4 25 13 c5 11 4 30 -4 40 c-5 8 -13 11 -21 11 c-8 0 -16 -3 -21 -11 c-8 -10 -9 -29 -4 -40 c4 -9 13 -13 25 -13 z" fill="url(#${id}c)"/>
     <g class="w-eyes">
       <ellipse cx="93" cy="98" rx="${er}" ry="${ery}" fill="url(#${id}e)"/>
       <ellipse cx="127" cy="98" rx="${er}" ry="${ery}" fill="url(#${id}e)"/>
       ${pupils}
       <circle cx="${(93-2.6*s.eyeK).toFixed(1)}" cy="${(94.5-s.eyeK).toFixed(1)}" r="${(2.1*s.eyeK).toFixed(1)}" fill="#fff"/>
       <circle cx="${(127-2.6*s.eyeK).toFixed(1)}" cy="${(94.5-s.eyeK).toFixed(1)}" r="${(2.1*s.eyeK).toFixed(1)}" fill="#fff"/>
       <circle cx="${(95.5*1).toFixed(1)}" cy="101" r="${(0.9*s.eyeK).toFixed(1)}" fill="rgba(255,255,255,0.6)"/>
       <circle cx="129.5" cy="101" r="${(0.9*s.eyeK).toFixed(1)}" fill="rgba(255,255,255,0.6)"/>
     </g>
     <ellipse cx="110" cy="120" rx="${7.5}" ry="${6}" fill="${s.nose}"/>
     <ellipse cx="108" cy="118" rx="2.4" ry="1.7" fill="rgba(255,255,255,0.4)"/>
     <path d="M110 126 v6" stroke="${s.nose}" stroke-width="2" stroke-linecap="round"/>
   </g>
  </g>
 </g>
</svg>`;
  }

  function renderWolf(idOrEl, m) {
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if (!el) return;
    const key = String(Math.round(m * 200));
    if (el.dataset.m === key && el.firstChild) return;
    el.dataset.m = key;
    el.innerHTML = wolfSVG(m);
  }
  global.LupoWolf = { wolfSVG, renderWolf, style };
})(window);
