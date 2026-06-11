// ═══════════════════════════════════════════════════════
//  LUPO XP engine — pure math + progression data. No DOM, no storage.
//  Source of truth: STRATEGY.md §2 (decisions locked).
// ═══════════════════════════════════════════════════════

export const MAX_LEVEL = 500;

// XP required to go from level L to L+1. Logistic: ~19 at L1, plateaus ~220 by ~L150.
export function stepCost(L) {
  return Math.round(10 + 210 / (1 + Math.exp(-0.045 * (L - 70))));
}

// THRESHOLDS[L] = total XP needed to have reached level L (L is 1-based; THRESHOLDS[1] = 0).
export const THRESHOLDS = (() => {
  const t = new Array(MAX_LEVEL + 1).fill(0);
  for (let L = 2; L <= MAX_LEVEL; L++) t[L] = t[L - 1] + stepCost(L - 1);
  return t;
})();

export const TOTAL_XP = THRESHOLDS[MAX_LEVEL]; // ≈95k

export function levelForXp(xp) {
  if (xp >= TOTAL_XP) return MAX_LEVEL;
  let lo = 1, hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (THRESHOLDS[mid] <= xp) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// Progress within the current level: {have, need, pct}
export function levelProgress(xp) {
  const L = levelForXp(xp);
  if (L >= MAX_LEVEL) return { level: L, have: 0, need: 0, pct: 1 };
  const have = xp - THRESHOLDS[L];
  const need = stepCost(L);
  return { level: L, have, need, pct: Math.min(1, have / need) };
}

// ── Daily XP budget (the only 3 sources) ──
export const XP_CHECKIN = 20;
export const XP_UNDER_LIMIT = 50;
export const XP_HABIT = 10;
export const MAX_HABITS = 3;
export const DAILY_CAP = 180;

// Streak multiplier applies to the +50 only. Hard cap x1.5.
export function streakMult(streakDays) {
  if (streakDays >= 30) return 1.5;
  if (streakDays >= 7) return 1.25;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

// Prestige boost: +5% per completed Moon Cycle, capped +25%.
export function cycleBoost(cycle) {
  return 1 + Math.min(5, cycle) * 0.05;
}

// ── Art stages (5 painted forms) ──
export const STAGES = [
  { idx: 0, name: 'Newborn Pup', from: 1, to: 10 },
  { idx: 1, name: 'Young Pup', from: 11, to: 40 },
  { idx: 2, name: 'Adolescent', from: 41, to: 120 },
  { idx: 3, name: 'Sub-Adult', from: 121, to: 300 },
  { idx: 4, name: 'Adult Wolf', from: 301, to: 500 },
];
export function stageForLevel(L) {
  for (let i = STAGES.length - 1; i >= 0; i--) if (L >= STAGES[i].from) return STAGES[i];
  return STAGES[0];
}

// ── Ranks (every 100) + moon phases (25-level bands) ──
export const RANKS = ['Whelp', 'Yearling', 'Hunter', 'Alpha', 'Moonborn'];
export function rankForLevel(L) {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((L - 1) / 100))];
}
const PHASES = ['New Moon', 'Waxing Moon', 'Half Moon', 'Waning Moon'];
export function phaseForLevel(L) {
  if (L % 100 === 0) return 'Full Moon';
  return PHASES[Math.floor(((L - 1) % 100) / 25)];
}
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI'];
export function rankTitle(L, cycle) {
  return rankForLevel(L) + (cycle > 0 ? (ROMAN[Math.min(cycle, 5)] || ' V+') : '');
}

// ── Milestone classification for a freshly reached level ──
// 'rank' (every 100) > 'cosmetic' (every 25) > 'micro' (every 5) > null
export function milestoneKind(L) {
  if (L % 100 === 0) return 'rank';
  if (L % 25 === 0) return 'cosmetic';
  if (L % 5 === 0) return 'micro';
  return null;
}

// ── Cosmetics catalog — one unlock per 25 levels, in this order ──
// type: env (home scene) | aura (wolf glow) | frame (portrait ring)
export const COSMETICS = [
  { id: 'env-forest', type: 'env', name: 'Moonlit Forest', at: 25 },
  { id: 'aura-ember', type: 'aura', name: 'Ember Aura', at: 50 },
  { id: 'frame-bronze', type: 'frame', name: 'Bronze Ring', at: 75 },
  { id: 'env-snow', type: 'env', name: 'First Snow', at: 100 },
  { id: 'aura-frost', type: 'aura', name: 'Frost Aura', at: 125 },
  { id: 'frame-silver', type: 'frame', name: 'Silver Ring', at: 150 },
  { id: 'env-aurora', type: 'env', name: 'Aurora Sky', at: 175 },
  { id: 'aura-gold', type: 'aura', name: 'Golden Aura', at: 200 },
  { id: 'frame-gold', type: 'frame', name: 'Gold Ring', at: 225 },
  { id: 'env-desert', type: 'env', name: 'Desert Night', at: 250 },
  { id: 'aura-violet', type: 'aura', name: 'Twilight Aura', at: 275 },
  { id: 'frame-moon', type: 'frame', name: 'Moonstone Ring', at: 300 },
  { id: 'env-storm', type: 'env', name: 'Storm Ridge', at: 325 },
  { id: 'aura-blood', type: 'aura', name: 'Blood Moon Aura', at: 350 },
  { id: 'frame-fang', type: 'frame', name: 'Fang Ring', at: 375 },
  { id: 'env-bloodmoon', type: 'env', name: 'Blood Moon', at: 400 },
  { id: 'aura-spectral', type: 'aura', name: 'Spectral Aura', at: 425 },
  { id: 'frame-runic', type: 'frame', name: 'Runic Ring', at: 450 },
  { id: 'env-cosmos', type: 'env', name: 'Star Field', at: 475 },
  { id: 'aura-mythic', type: 'aura', name: 'Mythic Aura', at: 500 },
];
export function cosmeticAt(L) { return COSMETICS.find(c => c.at === L) || null; }

// ── Wolf flavor lines for micro milestones (every 5 levels) ──
export const FLAVOR = [
  '{n} sniffs the wind. Something is changing.',
  '{n} stands a little taller today.',
  "{n}'s eyes catch the moonlight differently now.",
  '{n} practiced a howl when no one was watching.',
  '{n} circles twice and settles, proud.',
  "{n}'s paws look slightly too big. He'll grow into them.",
  '{n} watches you put the phone down. He approves.',
  '{n} found a stick. It is the best stick.',
  "{n}'s coat is thickening. Winters won't scare him.",
  '{n} dreamt of running. His legs twitched all night.',
  '{n} is learning patience. From you, apparently.',
  '{n} nudges your hand. Keep going.',
];
export function flavorLine(name, L) {
  return FLAVOR[(L / 5) % FLAVOR.length | 0].replace('{n}', name);
}
