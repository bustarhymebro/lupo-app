// ═══════════════════════════════════════════════════════
//  LUPO share card — canvas-generated milestone card for @raiselupo.
// ═══════════════════════════════════════════════════════

import { state } from './state.js';
import * as XP from './xp.js';

const W = 1080, H = 1350;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildCard() {
  const L = XP.levelForXp(state.xp);
  const stage = XP.stageForLevel(L);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // night-sky backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0B1020');
  bg.addColorStop(0.55, '#0A0A0A');
  bg.addColorStop(1, '#120D04');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // stars
  for (let i = 0; i < 130; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.6;
    ctx.fillStyle = '#FFFFFF';
    const s = Math.random() * 2.2 + 0.6;
    ctx.fillRect(Math.random() * W, Math.random() * H * 0.55, s, s);
  }
  ctx.globalAlpha = 1;
  // moon
  ctx.beginPath();
  ctx.arc(W - 170, 170, 78, 0, Math.PI * 2);
  ctx.fillStyle = '#F4ECD8';
  ctx.shadowColor = 'rgba(244,236,216,.6)';
  ctx.shadowBlur = 60;
  ctx.fill();
  ctx.shadowBlur = 0;

  // wolf art
  const img = new Image();
  img.src = `assets/wolf/painted-cut-${stage.idx}.png`;
  await new Promise(res => { img.onload = res; img.onerror = res; });
  const wW = 640, wH = 640;
  ctx.save();
  ctx.shadowColor = 'rgba(245,166,35,.35)';
  ctx.shadowBlur = 90;
  try { ctx.drawImage(img, (W - wW) / 2, 260, wW, wH); } catch (_) {}
  ctx.restore();

  // name + rank
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 92px Nunito, system-ui, sans-serif';
  ctx.fillText(state.name.toUpperCase(), W / 2, 1010);
  ctx.fillStyle = '#F5A623';
  ctx.font = '700 52px Nunito, system-ui, sans-serif';
  ctx.fillText(`${XP.rankTitle(L, state.cycle).toUpperCase()} · ${XP.phaseForLevel(L).toUpperCase()}`, W / 2, 1082);

  // stat chips, centered as a pair
  const chips = [
    [`LEVEL ${L}`, '#F5A623'],
    [`🔥 ${state.streak} DAY STREAK`, '#FFFFFF'],
  ];
  ctx.font = '800 40px Nunito, system-ui, sans-serif';
  const GAP = 26;
  const widths = chips.map(([label]) => ctx.measureText(label).width + 64);
  let cx = (W - widths.reduce((a, b) => a + b, 0) - GAP * (chips.length - 1)) / 2;
  for (let i = 0; i < chips.length; i++) {
    const [label, color] = chips[i];
    const tw = widths[i];
    roundRect(ctx, cx, 1130, tw, 86, 43);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(label, cx + tw / 2, 1188);
    cx += tw + 26;
  }

  // footer
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = '700 34px Nunito, system-ui, sans-serif';
  ctx.fillText('RAISED AT  raiselupo.chleb.ai', W / 2, 1296);

  return canvas;
}

export async function shareCard() {
  const canvas = await buildCard();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) return false;
  const file = new File([blob], `${state.name.toLowerCase()}-lupo.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Lupo', text: `${state.name} just hit ${XP.rankTitle(XP.levelForXp(state.xp), state.cycle)} on Lupo 🐺 raiselupo.chleb.ai` });
      return true;
    } catch (_) { /* user cancelled — fall through to download */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}
