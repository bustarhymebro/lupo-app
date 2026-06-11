## What this is

Full rebuild of the web app (`/app.html`) from the generic habit tracker to the wolf-first screen-time product defined in `docs/STRATEGY.md` ("decisions locked"). **Merging this deploys it live** (Pages serves `docs/` from `main`). The waitlist homepage is untouched.

## What shipped (Phase 0 + Phase 1 + part of Phase 2)

- **XP engine**: the locked logistic `stepCost` curve, 500 permanent levels (~95k XP total), 3-source daily budget (+20 check-in, +50 under-limit x streak multiplier capped x1.5, +10x3 optional habits), 180 XP/day cap
- **Forgiveness spine**: day rolls at 4 AM, 3 auto streak freezes/month, declarable rest days, no zero-resets, no death, no red-X copy
- **Appointment mechanic**: keeping the line sends the wolf on an overnight hunt; next morning he returns with a variable-rarity discovery (common to legendary), collected in the Den hunt journal
- **Milestones 5/25/100**: confetti + wolf flavor lines, cosmetic unlocks (den scenes / auras / portrait rings), rank ceremonies with canvas-generated shareable cards for @raiselupo
- **Ranks + moon phases**: Whelp, Yearling, Hunter, Alpha, Moonborn; moon-phase sub-tiers; prestige "New Moon Cycle" + Pack Hall at L500
- **New onboarding**: intent, draw your line, name the pup, first feed = instant first level-up (aha in session 1)
- **Living wolf**: breathing + jittered idle fidgets, mood states driven by behavior (proud/happy/waiting/drooping/lonely/resting/cozy), squash-and-stretch evolution ceremony
- **Migration**: existing `lupo.v2` users keep their wolf. Name, streaks, and earned days convert to XP; limit and habits carry over; one-time "Lupo grew up" welcome

## Verification

`tools/verify.py` (Playwright) walks onboarding, the full daily loop, hunt resolution, freeze consumption, high-level rendering, and v2 migration. All assertions green, zero console errors. The 16 screenshots in `tools/shots/` are from the final run; every screen was reviewed visually.

## Not in scope (next)

28-day Moon Seasons, notifications diet, Supabase backend, paywall, Pack tab, native Verified Mode.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
