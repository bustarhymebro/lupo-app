// ═══════════════════════════════════════════════════════
//  LUPO WOLF — flat-illustration mascot (front-facing, sitting)
//  Morphs CONTINUOUSLY by maturity (0..1): newborn pup -> adult wolf.
//  Returns an animated inline SVG string. Reference: clean flat vector,
//  gray + cream, dark ears/paws.
// ═══════════════════════════════════════════════════════
(function (global) {
  'use strict';

  function lerp(a, b, t) { return a + (b - a) * t; }
  function hx(n) { n = Math.round(Math.max(0, Math.min(255, n))); return n.toString(16).padStart(2, '0'); }
  function mix(c1, c2, t) {
    const a = [parseInt(c1.slice(1, 3), 16), parseInt(c1.slice(3, 5), 16), parseInt(c1.slice(5, 7), 16)];
    const b = [parseInt(c2.slice(1, 3), 16), parseInt(c2.slice(3, 5), 16), parseInt(c2.slice(5, 7), 16)];
    return '#' + hx(lerp(a[0], b[0], t)) + hx(lerp(a[1], b[1], t)) + hx(lerp(a[2], b[2], t));
  }

  function style(m) {
    m = Math.max(0, Math.min(1, m));
    return {
      m,
      fur:     mix('#B8BEC4', '#8C97A0', m),
      furDark: mix('#9CA3AA', '#717C86', m),
      cream:   '#ECEDE9',
      ear:     '#373C42',
      paw:     '#373C42',
      nose:    '#2C3034',
      amber:   m > 0.6,
      eye:     m > 0.6 ? '#E8A23A' : '#2C3034',
      eyeDark: '#1A1D21',
      mane:    m > 0.82,
      earLen:  lerp(0, 30, m),
      headK:   lerp(1.18, 0.95, m),
      scale:   lerp(0.74, 1.12, m),
    };
  }

  // m: maturity 0..1
  function wolfSVG(m) {
    const s = style(m);
    const el = s.earLen;
    const maneLeft  = s.mane ? `<path d="M70 150 l-16 10 l14 4 l-12 12 l16 0 l-6 12 l16 -6" fill="${s.furDark}"/>` : '';
    const maneRight = s.mane ? `<path d="M150 150 l16 10 l-14 4 l12 12 l-16 0 l6 12 l-16 -6" fill="${s.furDark}"/>` : '';
    const pupils = s.amber
      ? `<circle cx="93" cy="100" r="4" fill="${s.eyeDark}"/><circle cx="127" cy="100" r="4" fill="${s.eyeDark}"/>`
      : '';

    return `
<svg class="wolf-svg-el" viewBox="0 0 220 250" xmlns="http://www.w3.org/2000/svg" aria-label="Lupo">
 <g class="w-all">
  <ellipse cx="110" cy="236" rx="74" ry="11" fill="rgba(0,0,0,0.28)"/>
  <g class="w-tail">
    <path d="M150 196 q44 -6 40 -58 q-3 -28 -24 -28 q15 24 3 48 q-9 20 -33 28 z" fill="${s.fur}"/>
    <path d="M176 116 q12 6 12 24 q0 10 -6 16 q-6 -22 -6 -40 z" fill="${s.furDark}"/>
  </g>
  <g transform="translate(110 250) scale(${s.scale}) translate(-110 -250)">
    <ellipse cx="74" cy="196" rx="34" ry="40" fill="${s.furDark}"/>
    <ellipse cx="146" cy="196" rx="34" ry="40" fill="${s.furDark}"/>
    <path d="M110 132 c34 0 50 26 50 58 c0 30 -18 46 -50 46 c-32 0 -50 -16 -50 -46 c0 -32 16 -58 50 -58 z" fill="${s.fur}"/>
    <path d="M110 150 c14 0 22 14 22 36 c0 20 -9 32 -22 32 c-13 0 -22 -12 -22 -32 c0 -22 8 -36 22 -36 z" fill="${s.cream}"/>
    ${maneLeft}${maneRight}
    <rect x="90"  y="186" width="18" height="52" rx="9" fill="${s.fur}"/>
    <rect x="112" y="186" width="18" height="52" rx="9" fill="${s.fur}"/>
    <rect x="90"  y="216" width="18" height="22" rx="9" fill="${s.paw}"/>
    <rect x="112" y="216" width="18" height="22" rx="9" fill="${s.paw}"/>
    <g transform="translate(110 118) scale(${s.headK}) translate(-110 -118)">
      <polygon points="74,82 60,${24 - el} 104,60" fill="${s.fur}"/>
      <polygon points="74,70 64,${34 - el} 96,58" fill="${s.cream}"/>
      <polygon points="68,58 60,${24 - el} 80,46" fill="${s.ear}"/>
      <polygon points="146,82 160,${24 - el} 116,60" fill="${s.fur}"/>
      <polygon points="146,70 156,${34 - el} 124,58" fill="${s.cream}"/>
      <polygon points="152,58 160,${24 - el} 140,46" fill="${s.ear}"/>
      <polygon points="60,104 50,96 64,118" fill="${s.fur}"/>
      <polygon points="160,104 170,96 156,118" fill="${s.fur}"/>
      <path d="M110 56 c30 0 50 20 50 50 c0 30 -22 50 -50 50 c-28 0 -50 -20 -50 -50 c0 -30 20 -50 50 -50 z" fill="${s.fur}"/>
      <path d="M110 84 c12 0 20 4 24 12 c5 10 4 28 -4 38 c-5 7 -12 10 -20 10 c-8 0 -15 -3 -20 -10 c-8 -10 -9 -28 -4 -38 c4 -8 12 -12 24 -12 z" fill="${s.cream}"/>
      <g class="w-eyes">
        <ellipse cx="93" cy="98" rx="7.5" ry="9.5" fill="${s.eye}"/>
        <ellipse cx="127" cy="98" rx="7.5" ry="9.5" fill="${s.eye}"/>
        ${pupils}
        <circle cx="90.5" cy="95" r="2" fill="#fff"/>
        <circle cx="124.5" cy="95" r="2" fill="#fff"/>
      </g>
      <path d="M110 116 c6 0 10 4 10 8 c0 5 -5 8 -10 8 c-5 0 -10 -3 -10 -8 c0 -4 4 -8 10 -8 z" fill="${s.nose}"/>
      <path d="M110 132 v6" stroke="${s.nose}" stroke-width="2" stroke-linecap="round"/>
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
