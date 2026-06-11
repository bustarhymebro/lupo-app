// ═══════════════════════════════════════════════════════
//  LUPO boot — load state, roll the day, start the UI, keep the clock honest.
// ═══════════════════════════════════════════════════════

import { load, dayKey } from './state.js';
import * as engine from './engine.js';
import * as ui from './ui.js';

load();
engine.rollDays();
ui.init();

// keep "today" honest while the app stays open (tab left overnight, 4 AM roll)
let lastDay = dayKey();
function tick() {
  const now = dayKey();
  if (now === lastDay) return;
  lastDay = now;
  engine.rollDays();
  const item = engine.resolveHunt();
  ui.renderAll();
  if (item) ui.toast(`🐾 ${item.icon} ${item.text}`, 6000);
}
setInterval(tick, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
