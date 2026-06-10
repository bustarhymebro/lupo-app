// ═══════════════════════════════════════════════════════
//  LUPO engine — day roll, XP awards, streaks/freezes/rest, hunts.
//  Three loop rules (locked): never reset to zero growth, never kill the wolf,
//  loss aversion lives in the wolf's mood — not a red streak counter.
// ═══════════════════════════════════════════════════════

import { state, save, dayKey, monthKey, addDaysKey, daysBetween, dayRecord } from './state.js';
import * as XP from './xp.js';

// Events the UI subscribes to: levelup {levels}, milestone {level,kind}, discovery {item},
// freeze {used}, streak {n}, daychange {}
const listeners = {};
export function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
function emit(evt, payload) { (listeners[evt] || []).forEach(fn => { try { fn(payload); } catch (_) {} }); }

export function today() { return dayKey(); }
export function todayRec() { return dayRecord(state, today()); }

// ── Freeze replenishment: 3 per calendar month, automatic ──
function replenishFreezes() {
  const mk = monthKey();
  if (state.freezeMonth !== mk) { state.freezeMonth = mk; state.freezes = 3; }
}

// ── Day roll: walk every day between the last processed day and today ──
// A missed day consumes a freeze if one exists (streak survives), otherwise the
// streak rests at zero. XP is never deducted. A clock jumped > 60 days just fast-forwards.
export function rollDays() {
  const tk = today();
  replenishFreezes();
  if (!state.lastSeenDay) { state.lastSeenDay = tk; save(); return; }
  if (state.lastSeenDay === tk) return;

  let gap = daysBetween(state.lastSeenDay, tk);
  if (gap < 0) { state.lastSeenDay = tk; save(); return; } // clock moved backwards: trust the wall clock, never re-credit
  if (gap > 60) { state.lastSeenDay = addDaysKey(tk, -60); gap = 60; } // cap the walk against clock jumps

  let cursor = state.lastSeenDay;
  let usedFreeze = false, broke = false;
  while (cursor !== tk) {
    // close out `cursor` (a now-finished day), then advance
    const rec = state.days[cursor];
    const kept = !!(rec && rec.under === true);
    const rest = !!(rec && rec.rest);
    if (!kept && !rest) {
      replenishFreezes();
      if (state.freezes > 0 && state.streak > 0) {
        state.freezes--;
        usedFreeze = true;
        dayRecord(state, cursor).frozen = true;
      } else if (state.streak > 0) {
        state.streak = 0;
        broke = true;
      }
    }
    cursor = addDaysKey(cursor, 1);
  }
  state.lastSeenDay = tk;
  save();
  if (usedFreeze) emit('freeze', { left: state.freezes });
  if (broke) emit('streaklost', {});
  emit('daychange', {});
}

// ── Hunt resolution: a kept day sends the wolf hunting overnight; the next
// open after the day rolls produces a variable discovery (the pull, not push). ──
const DISCOVERIES = {
  common: [
    { icon: '🦴', text: '{n} dug up an old bone and carried it home, very pleased.' },
    { icon: '🪶', text: '{n} brought back a raven feather. A trade was involved, apparently.' },
    { icon: '🌲', text: '{n} marked a new trail through the pines. Territory is growing.' },
    { icon: '🪨', text: '{n} found a smooth river stone. It now lives in the den.' },
    { icon: '🐾', text: '{n} followed deer tracks for a mile and came back smug.' },
  ],
  journal: [
    { icon: '📜', text: '{n} learned the smell of rain before it falls.' },
    { icon: '📜', text: '{n} learned to walk on ice without slipping. Mostly.' },
    { icon: '📜', text: '{n} learned which owl is a friend. (None. Owls are rude.)' },
    { icon: '📜', text: '{n} learned patience watching the river. The fish disagreed.' },
  ],
  uncommon: [
    { icon: '🍂', text: '{n} found a glade where the leaves never fall. He kept one anyway.' },
    { icon: '🌕', text: '{n} howled at the moon and, for one second, it felt like it answered.' },
    { icon: '🦌', text: '{n} stood nose-to-nose with a stag. Neither blinked. Both grew.' },
  ],
  rare: [
    { icon: '✨', text: 'A fleck of silver appeared in {n}\'s coat overnight. It was not there before.' },
    { icon: '🌠', text: '{n} watched a star fall and memorized where it landed.' },
  ],
  legendary: [
    { icon: '🐺', text: '{n} met an old white wolf on the ridge. They spoke. He won\'t say about what.' },
  ],
};
function rollDiscovery() {
  const r = Math.random();
  let pool;
  if (r < 0.01) pool = DISCOVERIES.legendary;
  else if (r < 0.05) pool = DISCOVERIES.rare;
  else if (r < 0.15) pool = DISCOVERIES.uncommon;
  else if (r < 0.40) pool = DISCOVERIES.journal;
  else pool = DISCOVERIES.common;
  const rarity = pool === DISCOVERIES.legendary ? 'legendary' : pool === DISCOVERIES.rare ? 'rare'
    : pool === DISCOVERIES.uncommon ? 'uncommon' : pool === DISCOVERIES.journal ? 'journal' : 'common';
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { rarity, icon: pick.icon, text: pick.text.replace('{n}', state.name) };
}

export function resolveHunt() {
  if (!state.hunt || state.hunt.resolved) return null;
  if (state.hunt.day === today()) return null; // still out hunting until the day rolls
  const item = Object.assign({ day: state.hunt.day }, rollDiscovery());
  state.discoveries.unshift(item);
  if (state.discoveries.length > 200) state.discoveries.length = 200;
  state.hunt = null;
  save();
  emit('discovery', { item });
  return item;
}

// ── XP award core: daily cap, prestige boost, level-up + milestone events ──
function awardXp(amount) {
  const rec = todayRec();
  const boosted = Math.round(amount * XP.cycleBoost(state.cycle));
  const room = Math.max(0, XP.DAILY_CAP - rec.xp);
  const grant = Math.min(boosted, room);
  if (grant <= 0) return 0;

  const before = XP.levelForXp(state.xp);
  state.xp += grant;
  rec.xp += grant;
  const after = XP.levelForXp(state.xp);

  if (after > before) {
    const levels = [];
    for (let L = before + 1; L <= after; L++) levels.push(L);
    emit('levelup', { levels, from: before, to: after });
    for (const L of levels) {
      if (L > state.seenLevel) {
        state.seenLevel = L;
        const kind = XP.milestoneKind(L);
        if (kind) emit('milestone', { level: L, kind });
      }
    }
  }
  save();
  return grant;
}

// ── The three daily actions ──

// 1. Check-in / feed the wolf (+20). The Fogg celebration tap.
export function checkIn() {
  const rec = todayRec();
  if (rec.checkin || rec.rest) return { ok: false };
  rec.checkin = true;
  const xp = awardXp(XP.XP_CHECKIN);
  save();
  return { ok: true, xp };
}

// 2. Log today as under the limit (+50 × streak multiplier). The heartbeat.
export function logUnderLimit() {
  const rec = todayRec();
  if (rec.under !== null || rec.rest) return { ok: false };
  rec.under = true;
  state.streak += 1;
  if (state.streak > state.bestStreak) state.bestStreak = state.streak;
  const xp = awardXp(Math.round(XP.XP_UNDER_LIMIT * XP.streakMult(state.streak)));
  state.hunt = { day: today(), resolved: false }; // wolf leaves on the overnight hunt
  save();
  emit('streak', { n: state.streak });
  return { ok: true, xp, streak: state.streak };
}

// Honest breach. No punishment beyond a paused day — the day roll decides
// whether a freeze covers the streak.
export function logOverLimit() {
  const rec = todayRec();
  if (rec.under !== null || rec.rest) return { ok: false };
  rec.under = false;
  save();
  return { ok: true };
}

// 3. Optional habit check (+10 each, max 3 enabled).
export function checkHabit(id) {
  const rec = todayRec();
  if (rec.rest || !state.habits.includes(id) || rec.habits[id]) return { ok: false };
  rec.habits[id] = true;
  const xp = awardXp(XP.XP_HABIT);
  save();
  return { ok: true, xp };
}

// ── Rest day: declared for today, before any XP lands. No XP, streak intact. ──
export function declareRestDay() {
  const rec = todayRec();
  if (rec.rest || rec.under !== null || rec.checkin) return { ok: false };
  rec.rest = true;
  save();
  return { ok: true };
}

// ── Prestige: Begin a New Moon Cycle at L500 ──
export function beginNewCycle() {
  if (XP.levelForXp(state.xp) < XP.MAX_LEVEL) return { ok: false };
  state.packHall.unshift({ name: state.name, cycle: state.cycle, level: XP.MAX_LEVEL, date: today() });
  state.cycle += 1;
  state.xp = 0;
  state.seenLevel = 1;
  save();
  return { ok: true, cycle: state.cycle };
}

// ── Wolf mood — the loss-aversion surface. Order matters. ──
export function wolfMood() {
  const rec = state.days[today()];
  if (rec && rec.rest) return 'resting';
  if (rec && rec.under === true) return 'proud';
  if (rec && rec.checkin) return 'happy';
  // how long since the wolf was last fed anything?
  let last = null;
  for (let i = 1; i <= 14; i++) {
    const k = addDaysKey(today(), -i);
    const r = state.days[k];
    if (r && (r.checkin || r.under === true || r.rest)) { last = i; break; }
  }
  if (last === null && Object.keys(state.days).length === 0) return 'waiting';
  if (last !== null && last >= 3) return 'lonely';
  if (last !== null && last >= 1) {
    const y = state.days[addDaysKey(today(), -1)];
    if (y && (y.under === true || y.rest)) return 'waiting';
    if (y && y.frozen) return 'cozy';
    return 'drooping';
  }
  return 'waiting';
}

export const MOOD_LINES = {
  waiting: ['{n} is waiting by the door.', '{n} heard your footsteps. Ears up.'],
  happy: ['{n} is fed and glad you came.', '{n} did a little spin when he saw you.'],
  proud: ['{n} is glowing. You kept the line today.', '{n} walks taller because of you.'],
  resting: ['{n} is resting today. You\'re still on track.', 'Rest day. {n} approves of recovery.'],
  cozy: ['{n} kept the fire warm while you were away.', 'A freeze kept the streak safe. {n} barely noticed.'],
  drooping: ['{n} drooped a little yesterday. He perks up the second you act.', '{n} waited up. Today counts double in spirit.'],
  lonely: ['{n} has been lonely. He never left the door.', '{n} kept your spot warm. Welcome back.'],
};
export function moodLine() {
  const mood = wolfMood();
  const lines = MOOD_LINES[mood];
  // stable within a day so it doesn't shuffle on every render
  const seed = today().split('-').reduce((a, b) => a + Number(b), 0);
  return lines[seed % lines.length].replace(/\{n\}/g, state.name);
}

// What's left to earn today — drives the Today tab + home CTA.
export function todaySummary() {
  const rec = todayRec();
  const mult = XP.streakMult(state.streak + (rec.under === true ? 0 : 1));
  return {
    rec,
    rest: rec.rest,
    checkin: rec.checkin,
    under: rec.under,
    habitsDone: state.habits.filter(id => rec.habits[id]).length,
    habitsTotal: state.habits.length,
    xpToday: rec.xp,
    nextUnderXp: Math.round(XP.XP_UNDER_LIMIT * mult),
    huntOut: !!(state.hunt && !state.hunt.resolved && state.hunt.day === today()),
    huntBack: !!(state.hunt && state.hunt.day !== today()),
  };
}
