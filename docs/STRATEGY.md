# LUPO â€” Product, Growth & Backend Brief

*Version 1.0 â€” Product Lead decision doc. Decisions are final unless flagged OPEN. Build off this.*

---

## 0. Thesis (one paragraph)

Lupo is a **virtual-pet discipline app** where you raise a wolf through **hundreds of permanent micro-levels** by staying under a daily screen-time limit. The wolf â€” not a number â€” is the retention object. Progress **never resets, the wolf never dies**, and there is **always a next milestone <1 week away**. The web PWA ships now on the honor system; native iOS adds Apple-verified screen-time later as the paid "Verified Mode" upgrade. We monetize cosmetics + verification on a generous-free-core model, and grow through @raiselupo UGC + a referral waitlist that becomes the iOS launch spike.

---

## 1. Core Engagement Loop

**The daily loop (build this exactly):**

1. **Morning pull** â€” push at the user's personal active time: *"Your wolf is waiting by the door ðŸº"* (â‰¤10 words, â‰¤5/week cap).
2. **Check in / feed** â€” one tap. Wolf reacts visibly (bounce, ears up). This tap = +20 XP and is the Fogg celebration moment.
3. **Stay under the limit** â€” the heartbeat behavior. Logged manually (PWA) or auto-verified (iOS).
4. **Reward tick** â€” staying under = +50 XP, a visible micro-level, and the wolf goes on a **timed overnight hunt/patrol** (appointment mechanic).
5. **Next-morning discovery** â€” the wolf returns with a *variable* reward (found item, coat fleck, journal snippet, rare evolution moment). This is the curiosity-driven second open â€” **pull, not push.**

**Three non-negotiable loop rules:**
- **Never reset to zero, never let the wolf die.** A missed day = wolf droops + tired, growth **pauses**, hunt is skipped. It waits and resumes the instant you return. Levels are banked forever.
- **Variable rewards.** Most days = predictable small tick; unpredictably layer surprises (rare coat, "wolf learned something," hidden milestone). Predictability kills the dopamine loop.
- **Loss aversion lives in the wolf's mood, not a streak number.** Lead with "my wolf is drooping," not a red streak counter.

**Forgiveness baked in from day one:** day rolls at **4 AM** (not midnight) for night users; **3 Streak Freezes/month** auto-replenished; a user-declarable **Rest Day** (no XP, no penalty, streak intact); framing always = *"Your wolf rested today â€” you're still on track."* Never red-X, never guilt copy.

---

## 2. Progression Design (concrete numbers)

### XP curve â€” ship this formula
```js
stepCost(L) = Math.round(10 + 210 / (1 + Math.exp(-0.045 * (L - 70))))
```
Saturating/logistic, **not** exponential. Rises from ~19 XP/level at L1 to a **plateau of ~220 XP/level by ~L150 and holds there forever**. Cache cumulative thresholds in a 500-int array (~95,000 XP total to L500). This is the **anti-cliff moat**: late game becomes a calm "one level every ~2 engaged days, forever" metronome â€” infinite but always close.

### Daily XP budget â€” exactly 3 sources (keep it simple)
| Source | XP | Notes |
|---|---|---|
| Stayed under screen-time limit | **+50** | The heartbeat. Must stay the biggest single source. |
| Up to 3 optional habit checks | +10 each (+30 max) | Secondary, never required. |
| Daily check-in / feed-the-wolf tap | +20 | The celebration tap. |

Streak multiplier **on the +50 only**: x1.0 (d1â€“2) â†’ x1.1 (d3â€“6) â†’ x1.25 (d7â€“29) â†’ x1.5 (d30+). **Hard cap x1.5.** Floor day â‰ˆ 50 XP, engaged â‰ˆ 100 XP, max â‰ˆ 150 XP. **Cap total at ~180 XP/day** so a binge can't skip the journey.

### What this feels like (engaged ~100 XP/day)
Day 1 â†’ **L7** Â· Week 1 â†’ **L26** Â· Month 1 â†’ **L62** Â· Month 3 â†’ **L104** (crosses triple digits â€” big beat) Â· Month 6 â†’ **L148** Â· Year 1 â†’ **L233** Â· Year 2 â†’ **L399** Â· L500 prestige â‰ˆ **2.6 years**.

### Art stages (5 exist) â€” front-load visual change
| Stage | Levels | When |
|---|---|---|
| Newborn Pup | 1â€“10 | Day 1 |
| Young Pup | 11â€“40 | Week 1â€“2 |
| Adolescent | 41â€“120 | ~Month 1â€“3 |
| Sub-Adult | 121â€“300 | ~Month 3â€“6 |
| Adult Wolf | 301â€“500 | ~Month 6+ |

Body morph happens mostly in the **first ~4 months** while motivation is fragile. After ~L300 the visible engine hands off to **cosmetics/aura/environment variety** â€” this kills the "wolf is full-grown so I'm done" version of the cliff.

### Milestone cadence â€” nested 5 / 25 / 100
- **Every 5 levels (micro):** confetti + 1 line of wolf flavor text.
- **Every 25 (minor):** a cosmetic unlock (collar, accessory, background, new howl).
- **Every 100 (major):** named **Rank** promotion + animated ceremony + auto-generated **shareable card for @raiselupo**.

A reward is never more than ~1â€“4 days away early, ~2â€“9 days at plateau.

### Tier naming (Rank every 100, moon-phase sub-tier every 25)
L1â€“100 **Whelp** Â· L101â€“200 **Yearling** Â· L201â€“300 **Hunter** Â· L301â€“400 **Alpha** Â· L401â€“500 **Elder / Moonborn**. Within each rank, 25-level bands = **New â†’ Waxing â†’ Half â†’ Waning â†’ Full Moon** (users say *"I'm a Waxing Hunter"*).

### Endgame = prestige (the infinite bar)
At **L500**, offer **"Begin a New Moon Cycle."** The wolf keeps a **permanent visual marker** (Cycle 1 silver-tipped fur â†’ 2 scarred veteran â†’ 3 constellation pelt â†’ 4 spectral â†’ 5 mythic) plus a **+5% early-XP boost per cycle, capped at +25%**. Reset is **optional and visibly rewarded**; the previous wolf's portrait is saved in a **Pack Hall** gallery. Rank prefixes a cycle marker: *Moonborn II*.

### Seasons (re-engagement layer)
**28-day "Moon Seasons"** with a light themed track *on top of* the permanent level track. Hit ~20/28 under-limit days â†’ seasonal cosmetic. Gives lapsed users a fresh near-term goal **without invalidating their wolf.**

---

## 3. Tab / IA Structure

Five tabs. Wolf is home, everything else supports it.

1. **Wolf (Home)** â€” the living wolf, current state/mood, level + progress-to-next-level bar, "next milestone" teaser, the feed/check-in tap, and today's hunt status/discovery. This is 80% of sessions.
2. **Today** â€” set/confirm screen-time limit, log under-limit (PWA) or verified status badge (iOS), up to 3 optional habit checks, Streak Freeze / Rest Day controls.
3. **Journey** â€” the full level track, current Rank/moon-phase, milestone roadmap (visible NEXT named stages), and **Pack Hall** (prestige gallery).
4. **Den / Customize** â€” cosmetics: pelts, collars, accessories, environments (forest/snow/aurora/desert night), weather, howls, idle animations, seasonal drops. Earned + premium.
5. **Pack (later)** â€” social: pack members, shared streaks, "Maya kept her wolf fed 12 days," gentle accountability. Ship after solo loop proves out.

**Home-screen widget** is a priority surface, not a tab: a living wolf reflecting the user's customizations + current state, sitting next to the social icons they're avoiding â€” a passive re-engagement channel and in-context pattern-interrupt.

---

## 4. Screen Time Plan + Backend

### The honest two-tier story
- **PWA (now): honor system.** Browsers have zero access to OS usage. Manual self-reported logging. Market it as the **honor-system tier** and the on-ramp.
- **Native iOS (later): Verified Mode.** Apple Family Controls / DeviceActivity. This is the flagship **paid** reason to download native: *"the wolf can't be fooled anymore."*

### How verification actually works (design around the constraints)
- **You cannot read exact minutes.** Apple's report extension is network-sandboxed. The **only** server signal is a **threshold-crossed boolean.**
- **Design: one threshold = the daily cap.** Register a single `DeviceActivityEvent` at the user's committed limit over a midnightâ€“midnight schedule. By day's end: **no event fired = clean (wolf grows); event fired = breached (growth stalls).** No minute-reading needed â€” fits Lupo's mental model exactly.
- **Treat the signal as noisy.** `eventDidReachThreshold` has documented false fires (0-min fires on iOS 26.2), double-fires, missed fires. Send **both** the threshold flag **and** the user-visible report total for self-confirmation; reconcile server-side; prefer the report total when present.
- **Anti-cheat = accountability, not enforcement.** One Settings toggle revokes everything with no notice to us. If authorization flips to denied, mark the day **unverified** and **pause the verified badge** rather than crediting growth. The real deterrent is **social** (pack visibility, the wolf visibly going hungry) â€” not a lock we cannot build.
- **Never store ApplicationTokens server-side** (iOS silently re-issues them). Keep `FamilyActivitySelection` on-device; store only abstract config (cap in minutes, schedule, day result).

### Hard dependency â€” request the entitlement NOW
**Dom (Apple Developer Account Holder, not just Admin)** must submit the `com.apple.developer.family-controls` distribution request, separately for the **main app + each extension** (DeviceActivityMonitor + DeviceActivityReport). Budget **1â€“5 weeks**. Justify as **individual digital wellbeing** (`.individual` authorization) â€” **never** "parental control" (triggers Guideline 5.5 / MDM scrutiny). This gates the iOS ship date â€” start before you need it.

### Backend: Supabase (serverless)
Relational social/leaderboard needs make Postgres the right call.
- **Tables:** `profiles`, `wolves` (level/xp/state/cycle), `daily_logs` (date, source: `manual|verified`, breached bool, minutes_estimate nullable), `streaks`, `packs`, `pack_members`.
- **Row Level Security ON** â€” each user sees only their rows + their pack's shared rows. (Missing RLS leaks data in a social app.)
- **Leaderboards:** Postgres view, `RANK() OVER (ORDER BY xp DESC)`.
- **Edge Functions (Deno):** nightly streak resolution, push fan-out, verification-event validation.
- **Push:** Expo Push / APNs triggered from Edge Functions â€” morning reminder, `eventWillReachThresholdWarning` "you're N min from your limit," streak-at-risk, "Streak Freeze used â€” you're safe," milestone-imminent. Free tier (50k MAU / 500MB / 500k fn calls) covers well past launch.
- **Native path:** React Native + `kingstinct/react-native-device-activity` is the fastest route to the Family Controls layer; keep it a thin add-on, not a PWA rewrite.

---

## 5. Monetization + Launch (@raiselupo)

### Model â€” soft hybrid, generous free core
- **Free forever:** full wolf-raising loop, manual logging, all levels, base evolution. This *is* the retention + virality engine.
- **Premium (trial-gated):** advanced wolf customization/skins, deeper stats + **streak insurance**, multiple wolves/evolutions, and **on iOS, automatic Screen Time verification** as the headline paid feature.

### Pricing â€” barbell market, take the open mid-tier
- **Hero: $49.99/yr** (under Opal's $99.99, premium vs one sec's $24.99). Show **annual first.**
- **Decoy: $9.99/mo** (makes annual obvious â€” anchor, not the push).
- **Lifetime: $79â€“99 one-time** for the discipline crowd who hate subscriptions. *(OPEN: validate lifetime cannibalization.)*

### Trial â€” long, because the habit needs time to form
**14-day trial (test up to 30).** Long trials convert ~42â€“45% vs ~26% for 3â€“7 day. Fire the **freeâ†’trial prompt after the user's first 3-day streak** (attachment is real). Almost everyone underuses trial length â€” this is free conversion.

### Onboarding (aha must land <60 min, ideally session 1)
1. Ask intent (doomscrolling / focus / discipline).
2. Micro-commitments: set limit with a slider, pick wolf, **name it.**
3. Deliver aha: log day one â†’ wolf takes its first micro-level.
4. Fire paywall **at this emotional peak**, headline personalized: *"[WolfName] is ready to grow with you."*

84% of trial cancels happen Day 0â€“1 â€” **don't bury the aha behind a long quiz.**

### Post-purchase (defend the ~35% Month-1 annual churn)
Immediate **premium onboarding moment** after payment: unlock a special skin/evolution, show the premium stat dashboard live. Then streak-loss re-engagement pushes.

### ASO
- **Title:** *Lupo: Raise a Wolf, Beat Screen Time*
- **Subtitle:** *Screen time limit, focus & discipline habit tracker.*
- **Screenshots (first 2 carry it â€” 7-sec decision):** (1) wolf glowing/leveling â€” *"Raise your wolf by staying off your phone."* (2) limit/streak dashboard â€” *"Stay under your screen time limit daily."* Apple OCR-indexes captions since June 2025 â†’ keyword-rich captions = free ranking.

### Content engine (@raiselupo)
- **Post 3+/week** (proven growth threshold). **UGC/app-demo POV, not polished brand ads** (UGC ~4x engagement, demos ~45% higher install rate).
- **One signature repeatable format:** *"My wolf evolved because I cut screen time from 6h â†’ 2h"* before/after streak reveals. The 100-level ceremonies + prestige markers are built-in shareable moments.
- **Position as a game you win by being disciplined** (Finch's $30M-ARR playbook), not a "screen time app."
- **Bio link â†’ fast energy-matched waitlist page**, not a generic homepage. Reuse top organic clips as paid ads later.

### Waitlist = the PWAâ†’iOS bridge
Run a **referral-position waitlist now** (GetLaunchList / Viral Loops): public signup counter (social proof), **referral queue-jumping for early-access wolf skins** (scarcity), email capture for iOS launch. **Every PWA user + TikTok follower funnels into this list â€” it's the iOS launch-day install spike.**

---

## 6. Build Roadmap (web app first)

**Phase 0 â€” Core loop MVP (build first, in order):**
1. Wolf Home tab: living wolf + mood states (happy / drooping / resting), level + progress bar, feed/check-in tap with visible reaction.
2. XP engine: ship the `stepCost` formula, 500-level cumulative cache, the 3-source daily budget, streak multiplier (cap x1.5), daily cap (~180).
3. Today tab: set screen-time limit, manual under-limit log, 3 optional habit checks.
4. Onboarding: intent â†’ set limit â†’ pick + **name wolf** â†’ first log â†’ first level-up (aha in session 1).
5. **5 art stages wired to levels** + the 5/25/100 milestone celebrations.

**Phase 1 â€” Retention spine:**
6. Forgiveness system: 4 AM day-roll, 3 Streak Freezes/month, Rest Day, "wolf rested" framing.
7. Appointment mechanic: overnight hunt â†’ next-morning variable discovery.
8. Variable rewards layer (rare coats, hidden milestones, surprise moments).
9. Notifications (strict diet â‰¤5/week, personal active time, care-framed, â‰¤10 words).
10. Journey tab: full level track, Ranks/moon phases, next-milestone roadmap.

**Phase 2 â€” Economy + growth surfaces:**
11. Den/Customize tab + earnable cosmetics (cosmetics every 25, monthly seasonal).
12. Home-screen widget (PWA).
13. 28-day Moon Seasons track.
14. Shareable milestone cards (auto-gen for @raiselupo) + referral waitlist live.

**Phase 3 â€” Monetize + social:**
15. Supabase backend + auth + RLS + daily_logs sync.
16. Soft paywall (14-day trial, $49.99/yr hero, $9.99/mo decoy, lifetime), personalized onboarding paywall, post-purchase premium moment.
17. Pack tab (social accountability) + leaderboard view.
18. Prestige / New Moon Cycle endgame + Pack Hall gallery.

**Phase 4 â€” Native iOS Verified Mode (start entitlement request during Phase 0):**
19. RN app + `react-native-device-activity`, one-threshold-=-cap verification, server reconciliation, verified badge, unverified-on-revoke handling. Ship as the paid upgrade event.

---

### Decisions locked
Logistic XP curve Â· 3-source daily budget Â· 5/25/100 cadence Â· wolf-mood loss-aversion (no zero-resets, no death) Â· 4 AM roll + 3 freezes + Rest Day Â· one-threshold verification Â· accountability-not-enforcement Â· Supabase + RLS Â· soft hybrid paywall Â· $49.99/yr hero + 14-day trial Â· UGC-first @raiselupo + referral waitlist.

### OPEN items
Lifetime-tier cannibalization Â· exact trial length (14 vs 30 â€” A/B) Â· Android verification path (defer until iOS Verified Mode proves retention lift) Â· whether Pack ships pre- or post-monetization.
