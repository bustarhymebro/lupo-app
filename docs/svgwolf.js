// ═══════════════════════════════════════════════════════
//  LUPO WOLF. Full-body standing mascot, front facing.
//  Morphs by maturity 0..1: baby pup (huge head, short legs, round,
//  pale, big dark eyes) -> adult wolf (long legs, lean, mane, amber eyes).
//  Shaded with gradients. Animated: idle bob, blink, tail wag, ear twitch.
// ═══════════════════════════════════════════════════════
(function (global) {
  'use strict';
  let UID = 0;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function n(v){ return Math.round(v*100)/100; }
  function hx(x) { x = Math.round(Math.max(0, Math.min(255, x))); return x.toString(16).padStart(2, '0'); }
  function rgb(c){ return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
  function mix(c1, c2, t) { const a=rgb(c1), b=rgb(c2); return '#'+hx(lerp(a[0],b[0],t))+hx(lerp(a[1],b[1],t))+hx(lerp(a[2],b[2],t)); }
  function lighten(c,t){ return mix(c,'#FFFFFF',t); }
  function darken(c,t){ return mix(c,'#161B24',t); }

  function style(m){
    m=Math.max(0,Math.min(1,m));
    const fur=mix('#C9CFD5','#828E98',m);
    return { m, fur, furLight:lighten(fur,0.16), furShadow:darken(fur,0.20),
      cream:'#EFEFEA', creamSh:'#D9DAD2', ear:'#3A4047', earInner:mix('#5A4038','#6B4A40',m),
      nose:'#2C3137', amber:m>0.55, eye:m>0.55?'#E8A23A':'#33383F', eyeHi:m>0.55?'#FFD27A':'#5A616B', eyeDark:'#16191E',
      mane:m>0.62 };
  }

  function wolfSVG(m){
    m=Math.max(0,Math.min(1,m));
    const s=style(m), id='w'+(UID++);
    // proportions
    const S = lerp(0.82,1.04,m);          // overall
    const LH = lerp(26,58,m);             // leg length
    const HK = lerp(1.46,0.9,m);          // head scale
    const BW = lerp(0.92,1.10,m);         // body width
    const NECK = lerp(36,54,m);           // neck length
    const earLen = lerp(-12,34,m);
    const eyeK = lerp(1.4,0.86,m);
    const ground = 236;
    const bodyRx = 56*BW, bodyRy = 46;
    const bodyCY = ground - LH - bodyRy*0.55;
    const headCY = bodyCY - NECK;
    const legTopY = bodyCY + bodyRy*0.4;
    const lw = 16*lerp(1.05,0.92,m);      // leg width (pup chunkier)
    const er=(7.4*eyeK).toFixed(1), ery=(9.2*eyeK).toFixed(1);

    function leg(x, color){ return `<rect x="${n(x-lw/2)}" y="${n(legTopY)}" width="${n(lw)}" height="${n(ground-legTopY+2)}" rx="${n(lw/2)}" fill="${color}"/>
      <rect x="${n(x-lw/2)}" y="${n(ground-12)}" width="${n(lw)}" height="14" rx="${n(lw/2)}" fill="${s.ear}"/>`; }

    const mane = s.mane ? `<path d="M${n(110-bodyRx*0.7)} ${n(bodyCY-bodyRy*0.5)} q-16 8 -8 20 q-12 4 -4 16 M${n(110+bodyRx*0.7)} ${n(bodyCY-bodyRy*0.5)} q16 8 8 20 q12 4 4 16" stroke="${s.furShadow}" stroke-width="9" fill="none" stroke-linecap="round"/>` : '';
    const pupils = s.amber ? `<ellipse cx="93" cy="100" rx="${n(3.5*eyeK)}" ry="${n(4.6*eyeK)}" fill="${s.eyeDark}"/><ellipse cx="127" cy="100" rx="${n(3.5*eyeK)}" ry="${n(4.6*eyeK)}" fill="${s.eyeDark}"/>` : '';

    return `
<svg class="wolf-svg-el" viewBox="0 0 220 250" xmlns="http://www.w3.org/2000/svg" aria-label="Lupo">
 <defs>
  <radialGradient id="${id}b" cx="50%" cy="30%" r="78%"><stop offset="0%" stop-color="${s.furLight}"/><stop offset="62%" stop-color="${s.fur}"/><stop offset="100%" stop-color="${s.furShadow}"/></radialGradient>
  <radialGradient id="${id}h" cx="50%" cy="34%" r="72%"><stop offset="0%" stop-color="${s.furLight}"/><stop offset="66%" stop-color="${s.fur}"/><stop offset="100%" stop-color="${s.furShadow}"/></radialGradient>
  <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${s.cream}"/><stop offset="100%" stop-color="${s.creamSh}"/></linearGradient>
  <radialGradient id="${id}e" cx="40%" cy="35%" r="70%"><stop offset="0%" stop-color="${s.eyeHi}"/><stop offset="55%" stop-color="${s.eye}"/><stop offset="100%" stop-color="${darken(s.eye,0.3)}"/></radialGradient>
 </defs>
 <g class="w-all">
  <ellipse cx="110" cy="${ground+4}" rx="${n(64*S*BW)}" ry="10" fill="rgba(0,0,0,0.30)"/>
  <g transform="translate(110 ${ground+6}) scale(${n(S)}) translate(-110 -${ground+6})">

   <!-- back legs -->
   ${leg(96, s.furShadow)}
   ${leg(124, s.furShadow)}

   <!-- tail -->
   <g class="w-tail">
     <path d="M${n(110+bodyRx*0.78)} ${n(bodyCY-6)} q34 -4 40 -40 q4 -22 -14 -24 q10 18 -2 36 q-9 16 -30 18 z" fill="url(#${id}b)"/>
   </g>

   <!-- body -->
   <ellipse cx="110" cy="${n(bodyCY)}" rx="${n(bodyRx)}" ry="${n(bodyRy)}" fill="url(#${id}b)"/>
   <ellipse cx="110" cy="${n(bodyCY+bodyRy*0.12)}" rx="${n(bodyRx*0.5)}" ry="${n(bodyRy*0.8)}" fill="url(#${id}c)"/>
   ${mane}

   <!-- front legs -->
   ${leg(102, s.fur)}
   ${leg(118, s.fur)}

   <!-- neck -->
   <path d="M${n(110-18)} ${n(headCY+10)} L${n(110-22)} ${n(bodyCY-bodyRy*0.5)} L${n(110+22)} ${n(bodyCY-bodyRy*0.5)} L${n(110+18)} ${n(headCY+10)} Z" fill="url(#${id}h)"/>

   <!-- HEAD -->
   <g class="w-head" transform="translate(110 ${n(headCY)}) scale(${n(HK)}) translate(-110 -106)">
     <g class="w-ear">
       <polygon points="74,80 60,${n(22-earLen)} 104,58" fill="${s.furShadow}"/>
       <polygon points="73,72 65,${n(31-earLen)} 95,57" fill="${s.earInner}"/>
       <polygon points="146,80 160,${n(22-earLen)} 116,58" fill="${s.furShadow}"/>
       <polygon points="147,72 155,${n(31-earLen)} 125,57" fill="${s.earInner}"/>
     </g>
     <polygon points="60,102 49,93 65,117" fill="${s.fur}"/>
     <polygon points="160,102 171,93 155,117" fill="${s.fur}"/>
     <path d="M110 54 c31 0 52 21 52 52 c0 31 -22 52 -52 52 c-30 0 -52 -21 -52 -52 c0 -31 21 -52 52 -52 z" fill="url(#${id}h)"/>
     <path d="M110 60 c-22 0 -40 12 -47 30 c10 -10 27 -16 47 -16 c20 0 37 6 47 16 c-7 -18 -25 -30 -47 -30 z" fill="${s.furLight}" opacity="0.5"/>
     <path d="M110 82 c12 0 21 4 25 13 c5 11 4 30 -4 40 c-5 8 -13 11 -21 11 c-8 0 -16 -3 -21 -11 c-8 -10 -9 -29 -4 -40 c4 -9 13 -13 25 -13 z" fill="url(#${id}c)"/>
     <g class="w-eyes">
       <ellipse cx="93" cy="98" rx="${er}" ry="${ery}" fill="url(#${id}e)"/>
       <ellipse cx="127" cy="98" rx="${er}" ry="${ery}" fill="url(#${id}e)"/>
       ${pupils}
       <circle cx="${n(93-2.6*eyeK)}" cy="${n(94.5-eyeK)}" r="${n(2.1*eyeK)}" fill="#fff"/>
       <circle cx="${n(127-2.6*eyeK)}" cy="${n(94.5-eyeK)}" r="${n(2.1*eyeK)}" fill="#fff"/>
     </g>
     <ellipse cx="110" cy="120" rx="7.5" ry="6" fill="${s.nose}"/>
     <ellipse cx="108" cy="118" rx="2.3" ry="1.6" fill="rgba(255,255,255,0.4)"/>
     <path d="M110 126 v6" stroke="${s.nose}" stroke-width="2" stroke-linecap="round"/>
   </g>
  </g>
 </g>
</svg>`;
  }

  function renderWolf(idOrEl, m){
    const el = typeof idOrEl==='string' ? document.getElementById(idOrEl) : idOrEl;
    if(!el) return;
    const key=String(Math.round(m*200));
    if(el.dataset.m===key && el.firstChild) return;
    el.dataset.m=key; el.innerHTML=wolfSVG(m);
  }
  global.LupoWolf = { wolfSVG, renderWolf, style };
})(window);
