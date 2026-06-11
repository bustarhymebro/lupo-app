// ═══════════════════════════════════════════════════════
//  LUPO confetti — tiny canvas particle burst, zero dependencies.
//  Honors prefers-reduced-motion. <100 particles per burst.
// ═══════════════════════════════════════════════════════

let canvas = null, ctx = null, parts = [], raf = 0;

function reduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensure() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
}

function size() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const COLORS = ['#F5A623', '#FFD37A', '#FFFFFF', '#8FB4FF', '#C9F58A'];

export function burst(x, y, opts = {}) {
  if (reduced()) return;
  ensure(); size();
  const n = Math.min(90, opts.count || 55);
  const spread = (opts.spread || 75) * Math.PI / 180;
  const angle = (opts.angle == null ? -90 : opts.angle) * Math.PI / 180;
  const power = opts.power || 9;
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const v = power * (0.5 + Math.random() * 0.8);
    parts.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      g: 0.32, life: 1, decay: 0.012 + Math.random() * 0.012,
      size: 4 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      shape: Math.random() < 0.25 ? 'paw' : 'rect',
    });
  }
  if (!raf) tick();
}

export function burstFrom(el, opts = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export function fireworks(el) {
  burstFrom(el, { count: 70, spread: 100, power: 10 });
  setTimeout(() => burstFrom(el, { count: 50, spread: 130, power: 8 }), 220);
  setTimeout(() => burstFrom(el, { count: 60, spread: 360, power: 7 }), 450);
}

function tick() {
  raf = requestAnimationFrame(tick);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  if (!parts.length) { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= p.decay; p.rot += p.vr;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 'paw') {
      ctx.font = p.size * 2.4 + 'px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🐾', 0, 0);
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
    }
    ctx.restore();
  }
}
