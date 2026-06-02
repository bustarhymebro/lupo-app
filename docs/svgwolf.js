// ═══════════════════════════════════════════════════════
//  LUPO WOLF — flat-illustration mascot (front-facing, sitting)
//  Morphs HARD by maturity (0..1):
//   pup  = huge head, big eyes, stubby ears, tiny round body, pale
//   adult= lean body, tall pointed ears, mane, amber eyes, darker
// ═══════════════════════════════════════════════════════
(function (global) {
  'use strict';
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hx(n) { n = Math.round(Math.max(0, Math.min(255, n))); return n.toString(16).padStart(2, '0'); }
  function mix(c1, c2, t) {
    const a = [parseInt(c1.slice(1,3),16),parseInt(c1.slice(3,5),16),parseInt(c1.slice(5,7),16)];
    const b = [parseInt(c2.slice(1,3),16),parseInt(c2.slice(3,5),16),parseInt(c2.slice(5,7),16)];
    return '#' + hx(lerp(a[0],b[0],t)) + hx(lerp(a[1],b[1],t)) + hx(lerp(a[2],b[2],t));
  }
  function style(m) {
    m = Math.max(0, Math.min(1, m));
    return {
      m,
      fur:     mix('#C7CDD3', '#7C8893', m),
      furDark: mix('#AEB5BC', '#67727C', m),
      cream:   '#ECEDE9', ear:'#373C42', paw:'#373C42', nose:'#2C3034',
      amber:   m > 0.55,
      eye:     m > 0.55 ? '#E8A23A' : '#2C3034', eyeDark:'#1A1D21',
      mane:    m > 0.7,
      earLen:  lerp(-10, 36, m),   // stubby -> tall
      headK:   lerp(1.5, 0.86, m), // big baby head -> proportional
      bodyK:   lerp(0.74, 1.1, m), // tiny -> full body
      eyeK:    lerp(1.4, 0.85, m), // big baby eyes -> sharp
      scale:   lerp(0.9, 1.06, m),
    };
  }

  function wolfSVG(m) {
    const s = style(m), el = s.earLen;
    const mane = s.mane
      ? `<path d="M64 150 l-18 8 l15 6 l-14 12 l18 -1 l-7 13 l18 -7" fill="${s.furDark}"/>
         <path d="M156 150 l18 8 l-15 6 l14 12 l-18 -1 l7 13 l-18 -7" fill="${s.furDark}"/>` : '';
    const pupils = s.amber
      ? `<ellipse cx="93" cy="100" rx="${3.6*s.eyeK}" ry="${4.4*s.eyeK}" fill="${s.eyeDark}"/>
         <ellipse cx="127" cy="100" rx="${3.6*s.eyeK}" ry="${4.4*s.eyeK}" fill="${s.eyeDark}"/>` : '';
    const er = (7.4*s.eyeK).toFixed(1), ery = (9.2*s.eyeK).toFixed(1);

    return `
<svg class="wolf-svg-el" viewBox="0 0 220 250" xmlns="http://www.w3.org/2000/svg" aria-label="Lupo">
 <g class="w-all">
  <ellipse cx="110" cy="237" rx="${72*s.bodyK}" ry="11" fill="rgba(0,0,0,0.28)"/>
  <g transform="translate(110 250) scale(${s.scale}) translate(-110 -250)">

   <!-- BODY -->
   <g transform="translate(110 240) scale(${s.bodyK}) translate(-110 -240)">
     <g class="w-tail">
       <path d="M150 198 q46 -6 42 -60 q-3 -29 -25 -29 q16 25 3 50 q-9 21 -34 28 z" fill="${s.fur}"/>
       <path d="M178 116 q13 6 12 25 q0 11 -6 17 q-7 -23 -6 -42 z" fill="${s.furDark}"/>
     </g>
     <ellipse cx="72" cy="198" rx="35" ry="41" fill="${s.furDark}"/>
     <ellipse cx="148" cy="198" rx="35" ry="41" fill="${s.furDark}"/>
     <path d="M110 130 c36 0 52 27 52 60 c0 31 -19 48 -52 48 c-33 0 -52 -17 -52 -48 c0 -33 16 -60 52 -60 z" fill="${s.fur}"/>
     <path d="M110 150 c15 0 23 14 23 38 c0 21 -10 33 -23 33 c-13 0 -23 -12 -23 -33 c0 -24 8 -38 23 -38 z" fill="${s.cream}"/>
     ${mane}
     <rect x="89"  y="188" width="19" height="54" rx="9.5" fill="${s.fur}"/>
     <rect x="112" y="188" width="19" height="54" rx="9.5" fill="${s.fur}"/>
     <rect x="89"  y="219" width="19" height="23" rx="9.5" fill="${s.paw}"/>
     <rect x="112" y="219" width="19" height="23" rx="9.5" fill="${s.paw}"/>
   </g>

   <!-- HEAD -->
   <g transform="translate(110 116) scale(${s.headK}) translate(-110 -116)">
     <polygon points="74,80 60,${22 - el} 104,58" fill="${s.fur}"/>
     <polygon points="74,68 64,${32 - el} 96,56" fill="${s.cream}"/>
     <polygon points="68,56 60,${22 - el} 80,44" fill="${s.ear}"/>
     <polygon points="146,80 160,${22 - el} 116,58" fill="${s.fur}"/>
     <polygon points="146,68 156,${32 - el} 124,56" fill="${s.cream}"/>
     <polygon points="152,56 160,${22 - el} 140,44" fill="${s.ear}"/>
     <polygon points="60,102 50,94 64,116" fill="${s.fur}"/>
     <polygon points="160,102 170,94 156,116" fill="${s.fur}"/>
     <path d="M110 54 c31 0 52 21 52 52 c0 31 -23 52 -52 52 c-29 0 -52 -21 -52 -52 c0 -31 21 -52 52 -52 z" fill="${s.fur}"/>
     <path d="M110 82 c12 0 21 4 25 13 c5 11 4 29 -4 39 c-5 8 -13 11 -21 11 c-8 0 -16 -3 -21 -11 c-8 -10 -9 -28 -4 -39 c4 -9 13 -13 25 -13 z" fill="${s.cream}"/>
     <g class="w-eyes">
       <ellipse cx="93" cy="98" rx="${er}" ry="${ery}" fill="${s.eye}"/>
       <ellipse cx="127" cy="98" rx="${er}" ry="${ery}" fill="${s.eye}"/>
       ${pupils}
       <circle cx="${93 - 2.5*s.eyeK}" cy="${95 - s.eyeK}" r="${1.9*s.eyeK}" fill="#fff"/>
       <circle cx="${127 - 2.5*s.eyeK}" cy="${95 - s.eyeK}" r="${1.9*s.eyeK}" fill="#fff"/>
     </g>
     <path d="M110 116 c6 0 11 4 11 9 c0 5 -5 8 -11 8 c-6 0 -11 -3 -11 -8 c0 -5 5 -9 11 -9 z" fill="${s.nose}"/>
     <path d="M110 133 v6" stroke="${s.nose}" stroke-width="2" stroke-linecap="round"/>
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
