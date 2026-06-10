// ═══════════════════════════════════════════════════════
//  LUPO UI — screens, onboarding, celebrations, overlays.
// ═══════════════════════════════════════════════════════

import { state, save, HABIT_CATALOG, addDaysKey, resetAll } from './state.js';
import * as XP from './xp.js';
import * as engine from './engine.js';
import { mountWolf } from './wolf.js';
import * as confetti from './confetti.js';
import { shareCard } from './sharecard.js';

const $ = (sel, root = document) => root.querySelector(sel);
const Sound = window.Sound || { tap(){}, check(){}, day(){}, level(){}, start(){} };
export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const fmtMin = m => { const h = Math.floor(m / 60), r = m % 60; return (h ? h + 'h' : '') + (r ? (h ? ' ' : '') + r + 'm' : (h ? '' : '0m')); };

let wolfHome = null;
let activeScreen = 'wolf';

// ─────────────────────────────────────────────
//  Toasts
// ─────────────────────────────────────────────
export function toast(msg, ms = 3200) {
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms);
}

// ─────────────────────────────────────────────
//  Overlay helper (one at a time, queued)
// ─────────────────────────────────────────────
const overlayQueue = [];
let overlayOpen = false;
function showOverlay(html, onMount) {
  overlayQueue.push({ html, onMount });
  pumpOverlay();
}
function pumpOverlay() {
  if (overlayOpen || !overlayQueue.length) return;
  overlayOpen = true;
  const { html, onMount } = overlayQueue.shift();
  const root = $('#overlayRoot');
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = `<div class="overlay-inner">${html}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => {
    wrap.classList.remove('show');
    setTimeout(() => { wrap.remove(); overlayOpen = false; pumpOverlay(); renderAll(); }, 280);
  };
  if (onMount) onMount(wrap, close);
  return close;
}

// confirm dialog
function confirmBox(title, body, yesLabel, cb, danger = false) {
  showOverlay(`
    <div class="ov-title">${esc(title)}</div>
    <div class="ov-body">${body}</div>
    <button class="btn-primary ${danger ? 'danger' : ''}" data-act="yes" type="button">${esc(yesLabel)}</button>
    <button class="btn-ghost" data-act="no" type="button">CANCEL</button>
  `, (wrap, close) => {
    $('[data-act="yes"]', wrap).onclick = () => { close(); cb(); };
    $('[data-act="no"]', wrap).onclick = close;
  });
}

// ─────────────────────────────────────────────
//  Celebrations (wired to engine events in init)
// ─────────────────────────────────────────────
function celebrateMicro(level) {
  confetti.burstFrom($('#screen-wolf .wolf-stage') || $('#appMain'), { count: 50 });
  Sound.day();
  toast(`<b>Level ${level}.</b> ${esc(XP.flavorLine(state.name, level))}`);
}
function celebrateCosmetic(level) {
  const item = XP.cosmeticAt(level);
  if (!item) return celebrateMicro(level);
  Sound.level();
  showOverlay(`
    <div class="ov-kicker">LEVEL ${level} · UNLOCKED</div>
    <div class="ov-emoji">${item.type === 'env' ? '🏞️' : item.type === 'aura' ? '✨' : '💍'}</div>
    <div class="ov-title">${esc(item.name)}</div>
    <div class="ov-body">A new ${item.type === 'env' ? 'den scene' : item.type === 'aura' ? 'aura' : 'portrait ring'} is waiting in the Den.</div>
    <button class="btn-primary" data-act="equip" type="button">EQUIP IT</button>
    <button class="btn-ghost" data-act="later" type="button">LATER</button>
  `, (wrap, close) => {
    confetti.fireworks(wrap);
    $('[data-act="equip"]', wrap).onclick = () => { state.equipped[item.type] = item.id; save(); close(); };
    $('[data-act="later"]', wrap).onclick = close;
  });
}
function celebrateRank(level) {
  Sound.level();
  const title = XP.rankTitle(level, state.cycle);
  showOverlay(`
    <div class="ov-kicker">RANK PROMOTION</div>
    <div class="rank-seal">${level}</div>
    <div class="ov-title big">${esc(state.name)} is now a<br>${esc(title)}</div>
    <div class="ov-body">${esc(XP.phaseForLevel(level))} · one of the few who make it this far.</div>
    <button class="btn-primary" data-act="share" type="button">SHARE THE MOMENT</button>
    <button class="btn-ghost" data-act="ok" type="button">CONTINUE</button>
  `, (wrap, close) => {
    confetti.fireworks(wrap);
    setTimeout(() => confetti.fireworks(wrap), 500);
    $('[data-act="share"]', wrap).onclick = async () => { await shareCard(); };
    $('[data-act="ok"]', wrap).onclick = close;
  });
}
function celebrateEvolution(toStage) {
  Sound.level();
  showOverlay(`
    <div class="ov-kicker">EVOLUTION</div>
    <div class="ov-wolf"><div class="wolf-stage" id="ovWolf"></div></div>
    <div class="ov-title big">${esc(state.name)} grew into<br>${esc(toStage.name)}</div>
    <div class="ov-body">Earned, not given. Keep going.</div>
    <button class="btn-primary" data-act="ok" type="button">CONTINUE</button>
  `, (wrap, close) => {
    const w = mountWolf($('#ovWolf', wrap), { still: false, mood: () => 'proud' });
    w.update();
    w.evolve(toStage.idx, () => confetti.fireworks(wrap));
    $('[data-act="ok"]', wrap).onclick = () => { w.destroy(); close(); };
  });
}
function showDiscovery(item) {
  const rarityLabel = { common: 'FOUND', journal: 'LEARNED', uncommon: 'UNCOMMON FIND', rare: 'RARE FIND', legendary: 'LEGENDARY' }[item.rarity] || 'FOUND';
  Sound.check();
  showOverlay(`
    <div class="ov-kicker rar-${item.rarity}">BACK FROM THE HUNT · ${rarityLabel}</div>
    <div class="ov-emoji">${item.icon}</div>
    <div class="ov-body big">${esc(item.text)}</div>
    <button class="btn-primary" data-act="ok" type="button">WELCOME HOME</button>
  `, (wrap, close) => {
    if (item.rarity === 'rare' || item.rarity === 'legendary') confetti.fireworks(wrap);
    $('[data-act="ok"]', wrap).onclick = close;
  });
}

// ─────────────────────────────────────────────
//  Screens
// ─────────────────────────────────────────────
function renderHeader() {
  $('#topName').textContent = state.name.toUpperCase();
  const L = XP.levelForXp(state.xp);
  $('#topSub').textContent = `LV ${L} · ${XP.rankTitle(L, state.cycle).toUpperCase()}`;
  $('#streakCount').textContent = state.streak;
  $('#streakBadge').classList.toggle('dim', state.streak === 0);
  document.body.dataset.env = state.equipped.env || '';
}

function renderWolfScreen() {
  const el = $('#screen-wolf');
  const sum = engine.todaySummary();
  const prog = XP.levelProgress(state.xp);
  const L = prog.level;
  const stage = XP.stageForLevel(L);

  // next milestone teaser
  const next5 = Math.min(XP.MAX_LEVEL, (Math.floor(L / 5) + 1) * 5);
  const xpTo5 = XP.THRESHOLDS[next5] - state.xp;
  const eta = Math.max(1, Math.ceil(xpTo5 / 100));
  const kind = XP.milestoneKind(next5);
  const teaser = kind === 'rank' ? `Rank promotion at LV ${next5}` : kind === 'cosmetic' ? `${(XP.cosmeticAt(next5) || {}).name || 'Unlock'} at LV ${next5}` : `Milestone at LV ${next5}`;

  let cta;
  if (sum.rest) {
    cta = `<div class="rest-chip">🌿 Rest day. ${esc(state.name)} is recharging with you.</div>`;
  } else if (!sum.checkin) {
    cta = `<button class="btn-primary feed" id="feedBtn" type="button">FEED ${esc(state.name.toUpperCase())} <span class="xp-pill">+${XP.XP_CHECKIN} XP</span></button>`;
  } else if (sum.under === null) {
    cta = `<button class="btn-primary" id="goToday" type="button">LOG TODAY'S SCREEN TIME <span class="xp-pill">+${sum.nextUnderXp} XP</span></button>`;
  } else if (sum.under === true) {
    cta = `<div class="kept-chip">✅ Line held. ${sum.huntOut ? esc(state.name) + ' is out hunting tonight.' : 'Day complete.'}</div>`;
  } else {
    cta = `<div class="over-chip">Today went over. It happens — the wolf waits, levels are banked. Tomorrow is a clean page.</div>`;
  }

  el.innerHTML = `
    <p class="mood-msg" id="moodMsg">${esc(engine.moodLine())}</p>
    <div class="wolf-card" data-frame="${esc(state.equipped.frame || '')}">
      <div class="wolf-home-slot" id="wolfHomeSlot"></div>
      <div class="stage-line">${esc(stage.name.toUpperCase())} · ${esc(XP.phaseForLevel(L).toUpperCase())}</div>
    </div>
    <div class="meter">
      <div class="meter-head">
        <span class="meter-label">LEVEL ${L}${L >= XP.MAX_LEVEL ? ' · MAX' : ''}</span>
        <span class="meter-val gold">${L >= XP.MAX_LEVEL ? 'MOONBORN' : prog.have + ' / ' + prog.need + ' XP'}</span>
      </div>
      <div class="meter-track"><div class="meter-fill gold" style="width:${Math.round(prog.pct * 100)}%"></div></div>
      <div class="meter-foot">${esc(teaser)} · ≈${eta} day${eta === 1 ? '' : 's'} away</div>
    </div>
    ${sum.huntOut ? `<div class="hunt-line">🌙 ${esc(state.name)} leaves on a hunt tonight. See what he brings back tomorrow.</div>` : ''}
    <div class="cta-slot">${cta}</div>
    <div class="spacer-bottom"></div>`;

  if (wolfHome) wolfHome.destroy();
  wolfHome = mountWolf($('#wolfHomeSlot'), { mood: engine.wolfMood });

  const feedBtn = $('#feedBtn');
  if (feedBtn) feedBtn.onclick = () => {
    wolfHome.react('happy');                       // optimistic: react before the save
    confetti.burstFrom(wolfHome.el, { count: 35 });
    Sound.check();
    const r = engine.checkIn();
    if (r.ok) { toast(`<b>+${r.xp} XP.</b> ${esc(state.name)} ate like a king.`); setTimeout(renderAll, 650); }
  };
  const goToday = $('#goToday');
  if (goToday) goToday.onclick = () => switchScreen('today');
}

function renderTodayScreen() {
  const el = $('#screen-today');
  const sum = engine.todaySummary();
  const rec = sum.rec;

  // 14-day strip
  let strip = '';
  for (let i = 13; i >= 0; i--) {
    const k = addDaysKey(engine.today(), -i);
    const r = state.days[k];
    let cls = 'empty', label = 'no data';
    if (r) {
      if (r.under === true) { cls = 'kept'; label = 'kept'; }
      else if (r.rest) { cls = 'rest'; label = 'rest day'; }
      else if (r.frozen) { cls = 'frozen'; label = 'streak freeze'; }
      else if (i > 0) { cls = 'missed'; label = 'missed'; }
      else { cls = 'pending'; label = 'today'; }
    } else if (i === 0) { cls = 'pending'; label = 'today'; }
    strip += `<span class="day-dot ${cls}" title="${k}: ${label}"></span>`;
  }

  let underBlock;
  if (sum.rest) {
    underBlock = `<div class="rest-chip">🌿 Rest day declared. No XP today, streak safe, wolf content.</div>`;
  } else if (sum.under === true) {
    underBlock = `<div class="kept-chip">✅ Logged: you stayed under ${fmtMin(state.limitMin)} today. ${esc(state.name)} hunts tonight.</div>`;
  } else if (sum.under === false) {
    underBlock = `<div class="over-chip">Logged: over the limit today. No guilt — growth pauses, nothing is lost.</div>`;
  } else {
    underBlock = `
      <div class="log-q">Did you stay under <b>${fmtMin(state.limitMin)}</b> today?</div>
      <div class="log-row">
        <button class="btn-primary half" id="keptBtn" type="button">I STAYED UNDER <span class="xp-pill">+${sum.nextUnderXp}</span></button>
        <button class="btn-ghost half" id="overBtn" type="button">I WENT OVER</button>
      </div>
      <div class="log-hint">Honor system for now. The native app will verify it automatically.</div>`;
  }

  const habitRows = state.habits.map(id => {
    const h = HABIT_CATALOG.find(x => x.id === id);
    const done = !!rec.habits[id];
    return `<button class="habit-row ${done ? 'done' : ''}" data-habit="${id}" type="button" ${done || sum.rest ? 'disabled' : ''}>
      <span class="h-icon">${h.icon}</span><span class="h-name">${esc(h.name)}</span>
      <span class="h-state">${done ? '+10 ✓' : '+10'}</span>
    </button>`;
  }).join('');

  el.innerHTML = `
    <header class="page-head"><h2 class="page-title">TODAY</h2>
      <div class="page-sub">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · day rolls at 4 AM</div>
    </header>
    <div class="strip-card"><div class="day-strip">${strip}</div></div>

    <div class="section-label">THE LINE <button class="mini-link" id="editLimit" type="button">CHANGE</button></div>
    <div class="info-card">${underBlock}</div>

    <div class="section-label">OPTIONAL HABITS · ${sum.habitsDone}/${sum.habitsTotal} <button class="mini-link" id="editHabits" type="button">EDIT</button></div>
    <div class="habit-list">${habitRows || '<div class="ic-sub">No optional habits picked. They\'re extra credit, never required.</div>'}</div>

    <div class="section-label">SAFETY NET</div>
    <div class="info-card">
      <div class="safety-row">
        <div><div class="ic-title">Streak freezes</div><div class="ic-sub">A missed day uses one automatically. ${state.freezes} of 3 left this month.</div></div>
        <div class="freeze-pips">${'🧊'.repeat(state.freezes)}${'·'.repeat(3 - state.freezes)}</div>
      </div>
      <div class="safety-row" style="margin-top:14px;">
        <div><div class="ic-title">Rest day</div><div class="ic-sub">Declare today a rest day: no XP, streak intact, zero guilt.</div></div>
        <button class="mini-btn ghost" id="restBtn" type="button" ${sum.rest || sum.checkin || sum.under !== null ? 'disabled' : ''}>REST</button>
      </div>
    </div>

    <div class="xp-today">XP today: <b>${rec.xp}</b> / ${XP.DAILY_CAP} cap</div>
    <div class="spacer-bottom"></div>`;

  const keptBtn = $('#keptBtn');
  if (keptBtn) keptBtn.onclick = () => {
    Sound.day();
    const r = engine.logUnderLimit();
    if (r.ok) {
      confetti.burstFrom(keptBtn, { count: 60 });
      toast(`<b>+${r.xp} XP.</b> 🔥 ${r.streak}-day streak. ${esc(state.name)} hunts tonight.`);
      setTimeout(renderAll, 700);
    }
  };
  const overBtn = $('#overBtn');
  if (overBtn) overBtn.onclick = () => {
    confirmBox('Log today as over?', 'No punishment. Growth pauses for the day and your freezes cover the streak if you have one left.', 'YES, I WENT OVER', () => {
      engine.logOverLimit(); Sound.tap(); renderAll();
    });
  };
  el.querySelectorAll('[data-habit]').forEach(btn => {
    btn.onclick = () => {
      Sound.check();
      const r = engine.checkHabit(btn.dataset.habit);
      if (r.ok) { confetti.burstFrom(btn, { count: 22, power: 6 }); toast(`<b>+${r.xp} XP.</b> Extra credit banked.`); setTimeout(renderAll, 500); }
    };
  });
  const restBtn = $('#restBtn');
  if (restBtn) restBtn.onclick = () => {
    confirmBox('Declare a rest day?', `${esc(state.name)} rests when you rest. No XP today, streak stays alive.`, 'REST TODAY', () => {
      engine.declareRestDay(); Sound.tap(); renderAll();
    });
  };
  $('#editLimit').onclick = openLimitSheet;
  $('#editHabits').onclick = openHabitSheet;
}

function openLimitSheet() {
  showOverlay(`
    <div class="ov-title">Your daily line</div>
    <div class="ov-body">The number you answer to. Pick something hard but real.</div>
    <div class="limit-big" id="limitBig">${fmtMin(state.limitMin)}</div>
    <input type="range" id="limitRange" min="30" max="480" step="15" value="${state.limitMin}" aria-label="Daily screen time limit">
    <button class="btn-primary" data-act="save" type="button">SET THE LINE</button>
    <button class="btn-ghost" data-act="no" type="button">CANCEL</button>
  `, (wrap, close) => {
    const range = $('#limitRange', wrap);
    range.oninput = () => { $('#limitBig', wrap).textContent = fmtMin(Number(range.value)); };
    $('[data-act="save"]', wrap).onclick = () => { state.limitMin = Number(range.value); save(); Sound.tap(); close(); };
    $('[data-act="no"]', wrap).onclick = close;
  });
}

function openHabitSheet() {
  const rows = HABIT_CATALOG.map(h => `
    <button class="habit-row pick ${state.habits.includes(h.id) ? 'done' : ''}" data-pick="${h.id}" type="button">
      <span class="h-icon">${h.icon}</span><span class="h-name">${esc(h.name)}</span>
      <span class="h-state">${state.habits.includes(h.id) ? '✓' : ''}</span>
    </button>`).join('');
  showOverlay(`
    <div class="ov-title">Optional habits</div>
    <div class="ov-body">Pick up to ${XP.MAX_HABITS}. Extra credit, never homework.</div>
    <div class="habit-list">${rows}</div>
    <button class="btn-primary" data-act="ok" type="button">DONE</button>
  `, (wrap, close) => {
    wrap.querySelectorAll('[data-pick]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.pick;
        if (state.habits.includes(id)) state.habits = state.habits.filter(x => x !== id);
        else if (state.habits.length < XP.MAX_HABITS) state.habits.push(id);
        else { toast(`Three is the limit. Unpick one first.`); return; }
        save(); Sound.tap();
        btn.classList.toggle('done');
        btn.querySelector('.h-state').textContent = state.habits.includes(id) ? '✓' : '';
      };
    });
    $('[data-act="ok"]', wrap).onclick = close;
  });
}

function renderJourneyScreen() {
  const el = $('#screen-journey');
  const prog = XP.levelProgress(state.xp);
  const L = prog.level;

  // roadmap: the next 6 milestone levels
  const marks = [];
  for (let M = (Math.floor(L / 5) + 1) * 5; M <= XP.MAX_LEVEL && marks.length < 6; M += 5) {
    const kind = XP.milestoneKind(M);
    const xpAway = XP.THRESHOLDS[M] - state.xp;
    const eta = Math.max(1, Math.ceil(xpAway / 100));
    let label, icon;
    if (kind === 'rank') { icon = '👑'; label = `${XP.rankTitle(M, state.cycle)} rank ceremony`; }
    else if (kind === 'cosmetic') { icon = '🎁'; const c = XP.cosmeticAt(M); label = c ? `Unlock ${c.name}` : 'Unlock'; }
    else { icon = '⭐'; label = 'Milestone'; }
    marks.push(`<div class="road-row">
      <span class="road-ico">${icon}</span>
      <div class="road-main"><b>LV ${M}</b> · ${esc(label)}</div>
      <span class="road-eta">≈${eta}d</span>
    </div>`);
  }

  const rankRows = XP.RANKS.map((r, i) => {
    const from = i * 100 + 1, to = (i + 1) * 100;
    const here = L >= from && L <= to;
    const passed = L > to;
    return `<div class="rank-row ${here ? 'here' : ''} ${passed ? 'passed' : ''}">
      <span class="rank-name">${esc(r)}${state.cycle > 0 ? '' : ''}</span>
      <span class="rank-range">LV ${from}–${to}</span>
      <span class="rank-mark">${passed ? '✓' : here ? '· you are here' : ''}</span>
    </div>`;
  }).join('');

  const hall = state.packHall.length ? `
    <div class="section-label">PACK HALL</div>
    <div class="info-card">${state.packHall.map(w => `
      <div class="hall-row"><span>🐺</span><div><b>${esc(w.name)}</b><div class="ic-sub">Cycle ${w.cycle + 1} · reached LV ${w.level} · ${esc(w.date)}</div></div></div>`).join('')}
    </div>` : '';

  const prestige = L >= XP.MAX_LEVEL ? `
    <div class="info-card prestige">
      <div class="ic-title">🌕 Begin a New Moon Cycle</div>
      <div class="ic-sub">${esc(state.name)} has reached Moonborn. Start again with a permanent mark of this cycle and a +5% XP boost. The portrait joins the Pack Hall forever.</div>
      <button class="btn-primary" id="prestigeBtn" type="button" style="margin-top:12px;">BEGIN NEW CYCLE</button>
    </div>` : '';

  el.innerHTML = `
    <header class="page-head"><h2 class="page-title">JOURNEY</h2>
      <div class="page-sub">${esc(XP.rankTitle(L, state.cycle))} · ${esc(XP.phaseForLevel(L))}${state.cycle > 0 ? ' · Cycle ' + (state.cycle + 1) : ''}</div>
    </header>
    <div class="journey-hero">
      <div class="journey-level">LV ${L}</div>
      <div class="journey-tier">${esc(XP.stageForLevel(L).name.toUpperCase())}</div>
      <div class="meter" style="width:100%;margin-top:14px;">
        <div class="meter-head"><span class="meter-label">NEXT LEVEL</span><span class="meter-val gold">${L >= XP.MAX_LEVEL ? 'MAX' : prog.have + ' / ' + prog.need + ' XP'}</span></div>
        <div class="meter-track"><div class="meter-fill gold" style="width:${Math.round(prog.pct * 100)}%"></div></div>
      </div>
      <div class="hero-stats">
        <div><b>${state.streak}</b><span>streak</span></div>
        <div><b>${state.bestStreak}</b><span>best</span></div>
        <div><b>${state.xp.toLocaleString()}</b><span>lifetime XP</span></div>
      </div>
    </div>
    ${prestige}
    <div class="section-label">WHAT'S AHEAD</div>
    <div class="info-card">${marks.join('') || '<div class="ic-sub">The road is fully walked.</div>'}</div>
    <div class="section-label">RANKS</div>
    <div class="info-card">${rankRows}</div>
    ${hall}
    <div class="spacer-bottom"></div>`;

  const pBtn = $('#prestigeBtn');
  if (pBtn) pBtn.onclick = () => {
    confirmBox('Begin a New Moon Cycle?', `${esc(state.name)}'s portrait is saved in the Pack Hall forever. Levels restart at 1 with a permanent +5% XP boost per cycle. This cannot be undone.`, 'BEGIN THE CYCLE', () => {
      const r = engine.beginNewCycle();
      if (r.ok) { Sound.level(); toast(`<b>Cycle ${r.cycle + 1} begins.</b> The moon remembers.`); renderAll(); }
    });
  };
}

function renderDenScreen() {
  const el = $('#screen-den');
  const L = XP.levelForXp(state.xp);

  const groups = { env: 'DEN SCENES', aura: 'AURAS', frame: 'PORTRAIT RINGS' };
  const grids = Object.keys(groups).map(type => {
    const items = XP.COSMETICS.filter(c => c.type === type).map(c => {
      const unlocked = L >= c.at;
      const equipped = state.equipped[type] === c.id;
      return `<button class="cos-card ${unlocked ? '' : 'locked'} ${equipped ? 'equipped' : ''}" data-cos="${c.id}" data-type="${type}" type="button" ${unlocked ? '' : 'disabled'}>
        <span class="cos-ico">${type === 'env' ? '🏞️' : type === 'aura' ? '✨' : '💍'}</span>
        <span class="cos-name">${esc(c.name)}</span>
        <span class="cos-sub">${unlocked ? (equipped ? 'EQUIPPED' : 'TAP TO EQUIP') : '🔒 LV ' + c.at}</span>
      </button>`;
    }).join('');
    return `<div class="section-label">${groups[type]}</div><div class="cos-grid">${items}</div>`;
  }).join('');

  const journal = state.discoveries.length ? state.discoveries.slice(0, 30).map(d => `
    <div class="disc-row rar-${d.rarity}"><span class="disc-ico">${d.icon}</span>
      <div><div class="disc-text">${esc(d.text)}</div><div class="ic-sub">${esc(d.day)} · ${d.rarity}</div></div>
    </div>`).join('') : '<div class="ic-sub">Nothing yet. Hold the line tonight and the wolf hunts while you sleep.</div>';

  el.innerHTML = `
    <header class="page-head"><h2 class="page-title">DEN</h2><div class="page-sub">what the wolf keeps</div></header>
    <div class="section-label">HUNT JOURNAL</div>
    <div class="info-card journal">${journal}</div>
    ${grids}
    <div class="spacer-bottom"></div>`;

  el.querySelectorAll('[data-cos]').forEach(btn => {
    btn.onclick = () => {
      const { cos, type } = btn.dataset;
      state.equipped[type] = state.equipped[type] === cos ? null : cos;
      save(); Sound.tap(); renderAll();
    };
  });
}

// ─────────────────────────────────────────────
//  Settings sheet
// ─────────────────────────────────────────────
function openSettings() {
  showOverlay(`
    <div class="ov-title">Settings</div>
    <div class="field-row">
      <input class="field-input" id="renameInput" maxlength="18" value="${esc(state.name)}" aria-label="Wolf name" autocomplete="off">
      <button class="mini-btn" data-act="rename" type="button">SAVE</button>
    </div>
    <div class="toggle-row">
      <div><div class="ic-title">Sound effects</div></div>
      <button class="switch ${state.sound ? 'on' : ''}" data-act="sound" type="button" aria-pressed="${state.sound}" aria-label="Sound effects"></button>
    </div>
    <button class="btn-ghost" data-act="share" type="button">SHARE YOUR WOLF 🐺</button>
    <button class="btn-ghost danger" data-act="reset" type="button">RESET ALL PROGRESS</button>
    <div class="legal-line"><a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="support.html">Support</a></div>
    <button class="btn-primary" data-act="ok" type="button">DONE</button>
  `, (wrap, close) => {
    $('[data-act="rename"]', wrap).onclick = () => {
      const v = $('#renameInput', wrap).value.trim().slice(0, 18);
      if (v) { state.name = v; save(); Sound.tap(); toast(`He answers to <b>${esc(v)}</b> now.`); renderHeader(); }
    };
    $('[data-act="sound"]', wrap).onclick = (e) => {
      state.sound = !state.sound; save();
      Sound.on(state.sound);
      e.currentTarget.classList.toggle('on', state.sound);
      e.currentTarget.setAttribute('aria-pressed', String(state.sound));
      if (state.sound) Sound.tap();
    };
    $('[data-act="share"]', wrap).onclick = () => shareCard();
    $('[data-act="reset"]', wrap).onclick = () => {
      close();
      confirmBox('Reset everything?', 'Deletes the wolf, all levels, the journal, everything stored on this device. There is no undo.', 'DELETE IT ALL', () => {
        resetAll(); location.reload();
      }, true);
    };
    $('[data-act="ok"]', wrap).onclick = close;
  });
}

// ─────────────────────────────────────────────
//  Onboarding — intent → limit → name → first feed (aha in session 1)
// ─────────────────────────────────────────────
let obStep = 0;
let obData = { intent: null, limit: 180, name: '' };

const OB_STEPS = [
  () => `
    <h1 class="ob-title">What brings you<br>to the den?</h1>
    <div class="intent-list">
      <button class="intent-card ${obData.intent === 'doomscrolling' ? 'sel' : ''}" data-intent="doomscrolling" type="button">📱 I doomscroll too much</button>
      <button class="intent-card ${obData.intent === 'focus' ? 'sel' : ''}" data-intent="focus" type="button">🧠 I want my focus back</button>
      <button class="intent-card ${obData.intent === 'discipline' ? 'sel' : ''}" data-intent="discipline" type="button">🗿 I'm building discipline</button>
    </div>`,
  () => `
    <h1 class="ob-title">Draw your line.</h1>
    <p class="ob-sub">Your daily screen-time limit. Stay under it and the wolf grows. Hard but real.</p>
    <div class="limit-big" id="obLimitBig">${fmtMin(obData.limit)}</div>
    <input type="range" id="obLimitRange" min="30" max="480" step="15" value="${obData.limit}" aria-label="Daily screen time limit">`,
  () => `
    <div class="ob-wolf"><img src="assets/wolf/painted-cut-0.png" alt="" class="ob-wolf-img"></div>
    <h1 class="ob-title">Name your pup.</h1>
    <p class="ob-sub">This is the wolf you answer to. Give him a name you won't want to let down.</p>
    <input class="ob-input" id="obName" type="text" maxlength="18" placeholder="Lupo" autocomplete="off" autocapitalize="words" spellcheck="false" aria-label="Wolf name" enterkeyhint="done" value="${esc(obData.name)}">`,
  () => `
    <div class="ob-wolf big"><img src="assets/wolf/painted-cut-0.png" alt="" class="ob-wolf-img" id="obFeedWolf"></div>
    <h1 class="ob-title">${esc(obData.name || 'Lupo')} is hungry.</h1>
    <p class="ob-sub">Feed him your first check-in. He levels up the moment you do.</p>`,
];

function renderObStep() {
  document.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('on', i <= obStep));
  $('#obBody').innerHTML = OB_STEPS[obStep]();
  const next = $('#obNext');
  next.textContent = obStep === 3 ? `FEED ${(obData.name || 'LUPO').toUpperCase()} 🍖` : 'CONTINUE';
  next.disabled = obStep === 0 && !obData.intent;

  document.querySelectorAll('[data-intent]').forEach(btn => {
    btn.onclick = () => {
      obData.intent = btn.dataset.intent;
      document.querySelectorAll('[data-intent]').forEach(b => b.classList.toggle('sel', b === btn));
      next.disabled = false;
      Sound.tap();
    };
  });
  const range = $('#obLimitRange');
  if (range) range.oninput = () => { obData.limit = Number(range.value); $('#obLimitBig').textContent = fmtMin(obData.limit); };
  const nameInput = $('#obName');
  if (nameInput) {
    nameInput.oninput = () => { obData.name = nameInput.value; };
    setTimeout(() => nameInput.focus(), 250);
  }
}

function startOnboarding() {
  $('#screen-onboarding').hidden = false;
  $('#appMain').hidden = true;
  obStep = 0;
  renderObStep();
  $('#obNext').onclick = () => {
    Sound.tap();
    if (obStep === 0 && !obData.intent) return;
    if (obStep === 2) {
      obData.name = ($('#obName').value || 'Lupo').trim().slice(0, 18) || 'Lupo';
    }
    if (obStep < 3) { obStep++; renderObStep(); return; }
    // final: commit + first feed = the aha
    state.intent = obData.intent;
    state.limitMin = obData.limit;
    state.name = obData.name || 'Lupo';
    state.onboarded = true;
    save();
    const wolfImg = $('#obFeedWolf');
    if (wolfImg) { wolfImg.classList.add('feed-pop'); }
    confetti.burstFrom(wolfImg || $('#obNext'), { count: 60 });
    Sound.check();
    engine.checkIn(); // +20 → crosses the 19-XP first level: instant level-up
    setTimeout(() => {
      $('#screen-onboarding').hidden = true;
      enterApp();
      toast(`Tonight, come back and log your screen time. That's how ${esc(state.name)} really grows.`, 5200);
    }, 900);
  };
}

// ─────────────────────────────────────────────
//  Tabs + boot
// ─────────────────────────────────────────────
const RENDER = { wolf: renderWolfScreen, today: renderTodayScreen, journey: renderJourneyScreen, den: renderDenScreen };

export function switchScreen(name) {
  activeScreen = name;
  const doSwap = () => {
    ['wolf', 'today', 'journey', 'den'].forEach(s => { $('#screen-' + s).hidden = s !== name; });
    document.querySelectorAll('.tab').forEach(t => {
      const on = t.dataset.screen === name;
      t.classList.toggle('active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    RENDER[name]();
  };
  if (document.startViewTransition) document.startViewTransition(doSwap);
  else doSwap();
}

export function renderAll() {
  renderHeader();
  RENDER[activeScreen]();
}

function enterApp() {
  $('#appMain').hidden = false;
  renderHeader();
  switchScreen('wolf');
  // hunt back from overnight?
  const item = engine.resolveHunt();
  if (item) showDiscovery(item);
  // migrated old-app user: one-time what's-new
  if (state.migratedFromV2 && !state.welcomedBack) {
    state.welcomedBack = true; save();
    showOverlay(`
      <div class="ov-kicker">LUPO GREW UP</div>
      <div class="ov-emoji">🐺</div>
      <div class="ov-title">${esc(state.name)} remembers you.</div>
      <div class="ov-body">Your wolf, streak, and earned days carried over. New: 500 permanent levels, overnight hunts, streak freezes, rest days, and a Den full of unlocks. Levels never reset. The wolf never dies.</div>
      <button class="btn-primary" data-act="ok" type="button">SHOW ME</button>
    `, (wrap, close) => { $('[data-act="ok"]', wrap).onclick = close; });
  }
}

export function init() {
  Sound.on(state.sound);

  // engine events → celebrations
  engine.on('levelup', ({ from, to }) => {
    const sFrom = XP.stageForLevel(from), sTo = XP.stageForLevel(to);
    if (sTo.idx > sFrom.idx) celebrateEvolution(sTo);
  });
  engine.on('milestone', ({ level, kind }) => {
    if (kind === 'rank') celebrateRank(level);
    else if (kind === 'cosmetic') celebrateCosmetic(level);
    else celebrateMicro(level);
  });
  engine.on('freeze', ({ left }) => toast(`🧊 A streak freeze kept the fire warm. ${left} left this month.`, 4500));
  engine.on('streaklost', () => toast(`The streak rests at zero — your levels don't. ${esc(state.name)} is still here.`, 4500));
  engine.on('discovery', () => {});
  engine.on('daychange', () => renderAll());

  $('#gearBtn').onclick = openSettings;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => { Sound.tap(); switchScreen(t.dataset.screen); });

  // splash out
  setTimeout(() => {
    $('#splash').classList.add('gone');
    $('#app').hidden = false;
    setTimeout(() => $('#splash').remove(), 600);
    if (!state.onboarded) startOnboarding();
    else enterApp();
  }, 700);
}
