# LUPO Wolf â€” Build Plan

The wolf reads "flat/AI" because it's a hand-coded SVG: flat fills, no rig, no easing, no secondary motion. Better SVG paths won't fix this. The fix is a real animation rig plus behavioral reactivity. Below is a decisive, implementable plan for a static web PWA.

---

## 1. Rendering: use Rive (one `.riv` file), with a sprite-sheet fallback

**Recommendation: Rive.** It is purpose-built for exactly this â€” one reactive, full-body character that grows and changes state, running in a browser. Why Rive over the alternatives:

- **Solves the "flat" problem at the root.** You get a real bone rig with easing, squash-and-stretch, and secondary motion (tail, ears, fur) instead of static vector paths.
- **Painterly without redrawing per frame.** Use Rive's hybrid vector + raster meshes: crisp vector silhouette, with hand-painted fur/shading bitmaps mapped onto triangulated meshes. UVs stretch the paint *with* the body as bones move â€” production-grade fur that stays interactive and tiny.
- **Growth is a single input, not a dissolve.** Wire one Number input `growthLevel` (0â€“100) to a 1D blend. Keyframe the rig at pup (growth=0) and adult (growth=100) â€” Rive interpolates head ratio, leg length, snout, body mass in between. This is the #1 thing to get right; cross-fading a baby PNG into an adult PNG looks cheap.
- **State machine drives everything from app data.** Use Rive Data Binding to feed streak count, habit-complete bool, and growth stage; the machine picks the animation.
- **Tiny + fast.** `.riv` files are ~5â€“15x smaller than Lottie and run ~60fps (vs Lottie ~17fps). WASM runtime ~78â€“200KB, loaded once and cached by the service worker.

**Why not the others:** Lottie is a timeline player (no real state logic, ~17fps, buggy gradients, no raster-mesh fur). Hand-coded SVG is the current problem. Raw AI-generated frames drift in consistency and bloat the PWA. Use AI only to generate the *concept/reference art*, then trace it into the Rive rig.

**Web wiring (React):**
```js
const { rive, RiveComponent } = useRive({ src:'wolf.riv', stateMachines:'Main', autoplay:true });
const growth = useStateMachineInput(rive, 'Main', 'growthLevel'); // 0â€“100
const happy  = useStateMachineInput(rive, 'Main', 'isHappy');     // bool/trigger
```
Non-React: `@rive-app/canvas` or `@rive-app/webgl2`. Lazy-load the runtime after first paint; show a static hero pup illustration until ready; pause the canvas on `visibilitychange` to save battery.

**Fallback (if Rive is off the table): PNG sprite sheets.** Bake each growth stage's loops to a PNG atlas, animate with CSS `steps()` on `background-position` or a tiny canvas blitter (the Habitica/EverWing approach). Zero runtime lib, best raw FPS, trivially painterly per baked frame. Trade-offs: heavier assets, no smooth morph â€” growth becomes discrete stage swaps at milestones. Acceptable as a low-risk MVP. **Do not go back to hand-coded SVG path animation.**

---

## 2. Idle + evolution animations to implement

**Build a two-layer state machine (Duolingo pattern):**
- **Layer A â€” body/pose:** `idle`, `happy-bounce`, `sad-droop`, `sleeping`, `lonely`, `celebrate-evolution`.
- **Layer B â€” face (runs independently so the face stays alive during any body pose):** blink, eye darts, ear twitch, mouth. This separation is what keeps the wolf from ever looking frozen.

**Idle loop â€” this does the heavy lifting and is what separates premium from flat:**
- **Always-on base:** continuous subtle breathing (chest/belly riseâ€“fall, ~3â€“4s) + a tiny weight shift/sway. The wolf is *never* perfectly still â€” a frozen character reads as a sticker.
- **Randomized fidgets on a ~6â€“12s jittered timer** (rotate among several so it never repeats on a fixed beat): blink (randomize 4â€“6s), ear flick, tail wag, head tilt, look-around, scratch, yawn.
- **Per-stage idle sets:** each growth stage gets its own proportions *and* its own idle (a pup's fidgets differ from an adult's). Don't reuse one idle scaled up.

**Reaction states (blend back into idle â€” never snap):**
- Habit kept / streak up â†’ happy-bounce or proud idle.
- Habit missed / phone pickup detected â†’ droopy/sad/whimper.
- Long absence â†’ lonely. **The wolf IS the streak meter** (loss aversion) â€” a neglected wolf visibly droops/dims; a thriving one grows.

**Evolution moment (the single highest-retention "hero moment" â€” make it gated, rare, celebrated, never a silent swap):**
1. **Anticipation:** brief crouch/squash.
2. **Burst:** particles + light flare + scale-up overshoot.
3. **Settle:** ease into the new stage's idle.
4. **Sound:** triumphant sting fires on the same frame.

Stages: **pup â†’ juvenile â†’ adolescent â†’ young adult â†’ adult** (4â€“5), each re-illustrated with its own proportions (pup = oversized head/eyes/paws, round body; adult = leaner, taller, longer snout/legs). Gate evolution behind a milestone so it feels earned.

---

## 3. Sound effects

**Approach: synthesize the UI sounds with the Web Audio API; use 1â€“2 small files only for the rich evolution sting.** Synthesis means zero files, zero network weight, instant playback â€” ideal for a PWA. Wrap it in **Howler.js (~7KB)** if you'd rather not hand-roll iOS unlock, pooling, sprites, and global mute.

**The vocabulary (keep frequent sounds short, soft, warm; reserve richness for rare moments â€” Material's rule):**

| Event | Sound | How |
|---|---|---|
| Habit toggle (tap) | ~60ms neutral click | triangle/sine osc 880Hz, gain `0.0001 â†’ 0.3 â†’ 0.0001` exponential ramp |
| Habit checked off | friendly 2-note "bloop-bleep" | sine 660Hz then 880Hz, ~70ms each, slight overlap |
| Day complete / all habits | warm 3-note major chime | arpeggiated C-E-G (523/659/784Hz), ~60â€“90ms apart, soft attack + ~250ms decay |
| **Evolution (hero, rare)** | ~0.6â€“1.0s fanfare + sparkle | ascending 4â€“5 note pentatonic run + white-noise sparkle through bandpass (~3â€“6kHz, Q~5) decaying ~400ms; optional filtered whoosh |
| Habit missed | gentle low "thunk" (or silent) | **never a harsh buzzer** â€” this is a discipline app; don't punish |

**Non-negotiables:**
- **Envelope = the whole game:** start gain near `0.0001` (never literal 0), 5â€“15ms attack, `exponentialRampToValueAtTime` decay. This kills the click/pop artifact.
- **iOS unlock (required, or it's dead silent on iPhone PWAs â€” no autoplay exemption):** on first `touchstart`/`click`, call `audioCtx.resume()` and play one silent buffer, once, globally.
- **Persistent mute toggle** in `localStorage`; separate toggle for any ambient bed (off by default). Master gain low (~0.2â€“0.3).
- **Pair with `navigator.vibrate([10])`** on tap and a longer pattern on evolution (Android only â€” iOS Safari ignores it, so sound/visual must stand alone on iPhone).
- **Respect `prefers-reduced-motion`** before celebratory sound, and repetition fatigue â€” keep the completion jingle tiny so it survives play #100.

---

## 4. Top 8 "juice" upgrades for a premium feel

1. **Squash & stretch on the wolf** â€” the single biggest "not flat" upgrade. Animate `scaleX/scaleY` asymmetrically with `transform-origin: center bottom` (stays glued to the ground). Include a brief ~10% anticipation squash before a bounce launch to sell weight. Use 25â€“50% of exaggerated demo values, never 100%.
2. **Always-on idle life** (cheapest, highest-impact fix even before the art swap): breathing `@keyframes` + random-jitter blink/tail/ear loops via `setInterval` with jitter.
3. **Optimistic micro-celebration on tap** (Duolingo): the instant a habit is checked, fire the wolf's happy reaction + particle burst + sound *before* any save/sync resolves. Cuts perceived wait dramatically.
4. **Spring/jelly easing** via the native CSS `linear()` timing function. Store 3â€“4 spring tokens (bouncy/gentle/wobbly) from kvin.me/css-springs as design tokens; fallback to `cubic-bezier(0.34,1.56,0.64,1)` (easeOutBack) inside `@supports`.
5. **Particle bursts** with **canvas-confetti** (~6KB CDN). Fire from the wolf's `getBoundingClientRect` center; habit-complete = `{particleCount:60, spread:70, scalar:0.9}`; use ðŸ¾ paw-print confetti via `shapeFromText`; evolution = 2â€“3 staggered calls for a fireworks feel. Always pass `disableForReducedMotion:true`, keep <100 particles.
6. **Native View Transitions API** for screen changes â€” `document.startViewTransition()`; give the wolf and nav matching `view-transition-name` so the wolf morphs smoothly across screens instead of hard-cutting. Removes the "web page reload" feel in the PWA.
7. **Counter pop on streak/XP** â€” scale-up + gold color flash + slide the old digit out when the number increments, paired with a tick sound. Small, reads as premium.
8. **Reserved screen shake on evolution only** â€” short (~400ms), subtle (2â€“3px), applied to a wrapper (not `body`, to avoid scroll jank). Restraint is the polish signal.

**Performance/accessibility guardrails (these gate whether the above reads as premium or cheap):** animate **only `transform` and `opacity`** (GPU compositor); add `will-change: transform` just before an animation and remove it after; target 60fps. Gate all non-essential motion behind `@media (prefers-reduced-motion: reduce)`.

---

## 5. Where to get free / affordable assets

**Character animation (Rive):**
- **Rive Community** (rive.app/community) and **Rive Marketplace** (rive.app/marketplace/tag/Character) â€” free pre-rigged character examples to learn the pupâ†’adult 1D-blend and two-layer state-machine setup.
- For the hero wolf itself: **hire a Rive character animator** on top of illustrated reference art (the path Duolingo and Finch both took). This is the one place worth paying â€” the hero character carries the product.

**Lottie (only for non-interactive flourishes like confetti/sparkles, not the wolf):**
- LottieFiles.com + IconScout (filter by style). A free generic wolf exists at lottiefiles.com/4439-wolf as a placeholder, but it is *not* a babyâ†’adult rig.
- Ship as **dotLottie** (`@lottiefiles/dotlottie-web`) to bundle multiple clips + theme recolor slots; shrink with TinyLottie.

**Sound (prefer CC0 â€” truly attribution-free â€” and track licenses for a commercial product):**
- **Kenney "Interface Sounds" (100, CC0)** kenney.nl/assets/interface-sounds and **"UI Audio" (50, CC0)** â€” best first stop, no attribution.
- **Pixabay Sound Effects** (free commercial, no attribution) and **OpenGameArt CC0**.
- **Freesound.org** â€” filter to **CC0**; great for a real wolf yip/howl accent on evolution. (CC-BY requires crediting the author â€” avoid unless you'll track it.)
- **jsfxr** (browser) to prototype the level-up/confirm blips before synthesizing them live.

**Libraries to add:** `@rive-app/canvas` (or `react-canvas`), `howler` (~7KB), `canvas-confetti` (~6KB). Total runtime cost is dominated by the one-time, cached Rive WASM â€” everything else is negligible.

---

**Build order:** (1) swap the SVG for a Rive rig with breathing + randomized idle fidgets â€” this alone kills the "flat/AI" complaint; (2) wire `growthLevel` + the two-layer state machine to habit data so the wolf reacts; (3) build the gated evolution hero moment (anticipation â†’ burst â†’ settle + sting); (4) layer in Web Audio SFX and the 8 juice upgrades; (5) cache all assets in the service worker for offline.
