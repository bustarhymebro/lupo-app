// ═══════════════════════════════════════════════════════
//  LUPO state — persistence, defaults, v2→v3 migration, 4 AM clock.
// ═══════════════════════════════════════════════════════

import { levelForXp } from './xp.js';

export const STORE_KEY = 'lupo.v3';
const LEGACY_KEY = 'lupo.v2';
const LEGACY_ART_KEY = 'lupo.v2.art';

// ── 4 AM day-roll clock ──
// The "day" belongs to whoever is still awake: a date only rolls over at 4 AM local.
export function dayKey(d = new Date()) {
  const shifted = new Date(d.getTime() - 4 * 3600000);
  return shifted.getFullYear() + '-' +
    String(shifted.getMonth() + 1).padStart(2, '0') + '-' +
    String(shifted.getDate()).padStart(2, '0');
}
export function monthKey(d = new Date()) { return dayKey(d).slice(0, 7); }
export function addDaysKey(key, n) {
  const [y, m, dd] = key.split('-').map(Number);
  const d = new Date(y, m - 1, dd + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function daysBetween(a, b) { // b - a in whole days
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000);
}

// ── Habit catalog (optional checks, pick up to 3) ──
export const HABIT_CATALOG = [
  { id: 'workout', name: 'Move your body', icon: '💪' },
  { id: 'read', name: 'Read 10 pages', icon: '📖' },
  { id: 'sleep', name: 'Lights out on time', icon: '🌙' },
  { id: 'water', name: 'Drink enough water', icon: '💧' },
  { id: 'focus', name: 'One deep-work block', icon: '🧠' },
  { id: 'outside', name: 'Get outside', icon: '🌤️' },
];

export function defaultState() {
  return {
    v: 3,
    onboarded: false,
    intent: null,                 // 'doomscrolling' | 'focus' | 'discipline'
    name: 'Lupo',
    createdAt: new Date().toISOString(),
    xp: 0,                        // lifetime XP this cycle — never decreases
    cycle: 0,                     // completed Moon Cycles (prestige)
    seenLevel: 1,                 // highest level already celebrated
    days: {},                     // dayKey -> day record
    lastSeenDay: null,            // last day the roll-forward processed
    streak: 0,
    bestStreak: 0,
    freezes: 3,
    freezeMonth: null,            // 'YYYY-MM' freezes were last replenished
    limitMin: 180,                // daily screen-time cap in minutes
    habits: ['workout', 'read', 'water'], // enabled optional habit ids (max 3)
    hunt: null,                   // { day, resolved:false } — set when a day is kept
    discoveries: [],              // [{day, rarity, icon, text}] newest first
    equipped: { env: null, aura: null, frame: null },
    packHall: [],                 // [{name, cycle, level, date}]
    sound: true,
    welcomedBack: false,          // v2-migration "what's new" shown
    migratedFromV2: false,
  };
}

// Day record helper
export function dayRecord(state, key) {
  if (!state.days[key]) state.days[key] = { checkin: false, under: null, habits: {}, rest: false, frozen: false, xp: 0 };
  return state.days[key];
}

export let state = null;

export function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}

export function load() {
  const def = defaultState();
  let parsed = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    // keep one backup of the corrupt blob, then start clean
    try {
      const raw = localStorage.getItem(STORE_KEY);
      Object.keys(localStorage).forEach(k => { if (k.indexOf(STORE_KEY + '.corrupt.') === 0) localStorage.removeItem(k); });
      if (raw) { try { localStorage.setItem(STORE_KEY + '.corrupt.' + Date.now(), raw); } catch (_) {} }
    } catch (_) {}
    parsed = null;
  }

  state = Object.assign({}, def, parsed || {});
  // type guards — a hand-edited or partial blob must never crash the app
  if (typeof state.xp !== 'number' || !isFinite(state.xp) || state.xp < 0) state.xp = 0;
  if (!Number.isInteger(state.cycle) || state.cycle < 0) state.cycle = 0;
  if (!Number.isInteger(state.seenLevel) || state.seenLevel < 1) state.seenLevel = 1;
  if (!state.days || typeof state.days !== 'object') state.days = {};
  if (!Number.isInteger(state.streak) || state.streak < 0) state.streak = 0;
  if (!Number.isInteger(state.bestStreak) || state.bestStreak < state.streak) state.bestStreak = state.streak;
  if (!Number.isInteger(state.freezes) || state.freezes < 0 || state.freezes > 3) state.freezes = Math.max(0, Math.min(3, state.freezes | 0));
  if (typeof state.limitMin !== 'number' || state.limitMin < 30 || state.limitMin > 720) state.limitMin = 180;
  if (!Array.isArray(state.habits)) state.habits = def.habits;
  state.habits = state.habits.filter(id => HABIT_CATALOG.some(h => h.id === id)).slice(0, 3);
  if (!Array.isArray(state.discoveries)) state.discoveries = [];
  if (!Array.isArray(state.packHall)) state.packHall = [];
  if (!state.equipped || typeof state.equipped !== 'object') state.equipped = def.equipped;
  if (typeof state.name !== 'string' || !state.name.trim()) state.name = 'Lupo';
  state.name = state.name.slice(0, 18);
  if (typeof state.sound !== 'boolean') state.sound = true;
  if (state.hunt && (typeof state.hunt.day !== 'string')) state.hunt = null;

  if (!parsed) migrateFromV2();
  return state;
}

// One-time migration: an old habit-tracker wolf carries its name, streak,
// and earned days (≈90 XP per credited day) into the new engine.
function migrateFromV2() {
  let old = null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) old = JSON.parse(raw);
  } catch (_) { return; }
  if (!old || typeof old !== 'object' || !old.pet) return;

  const pet = old.pet || {};
  if (typeof pet.name === 'string' && pet.name.trim()) state.name = pet.name.slice(0, 18);
  state.streak = Number.isInteger(pet.currentStreak) ? Math.max(0, pet.currentStreak) : 0;
  state.bestStreak = Math.max(state.streak, Number.isInteger(pet.bestStreak) ? pet.bestStreak : 0);
  const earnedDays = Array.isArray(old.creditedDays) ? old.creditedDays.length : 0;
  state.xp = Math.min(earnedDays * 90, 30000); // engaged-day average; cap well below the 500 wall
  if (typeof pet.createdDate === 'string') state.createdAt = pet.createdDate;
  // old screen-time target was hours
  const st = old.habits && old.habits.screenTime;
  if (st && typeof st.target === 'number' && st.target >= 1 && st.target <= 12) state.limitMin = st.target * 60;
  // carry up to 3 old optional habits across
  const map = { workout: 'workout', read: 'read', water: 'water', sleep: 'sleep', focus: 'focus' };
  const carried = Object.keys(map).filter(k => old.habits && old.habits[k] && old.habits[k].enabled).slice(0, 3);
  if (carried.length) state.habits = carried.map(k => map[k]);
  if (typeof old.sound === 'boolean') state.sound = old.sound;
  state.onboarded = !!old.onboarded;
  state.migratedFromV2 = true;
  state.welcomedBack = false;
  state.seenLevel = levelForXp(state.xp); // carried-over levels were already lived, not new milestones
  // never roll back through the user's old history — start the engine today
  state.lastSeenDay = dayKey();
  save();
}

// Full reset honors the privacy promise: every Lupo key goes.
export function resetAll() {
  try {
    [STORE_KEY, LEGACY_KEY, LEGACY_ART_KEY, 'lupo.waitlist'].forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).forEach(k => { if (k.indexOf('lupo.') === 0) localStorage.removeItem(k); });
  } catch (_) {}
}
