// ═══════════════════════════════════════════════════════
//  LUPO wolf renderer — painted stage art + always-on idle life + moods.
//  A frozen character reads as a sticker; the wolf is never perfectly still.
// ═══════════════════════════════════════════════════════

import { state } from './state.js';
import * as XP from './xp.js';

const ART = i => `assets/wolf/painted-cut-${i}.png`;

// Mount a living wolf into a container. Returns a handle with update()/react()/destroy().
export function mountWolf(el, opts = {}) {
  el.classList.add('wolf-stage');
  el.innerHTML = `
    <div class="wolf-aura" aria-hidden="true"></div>
    <div class="wolf-body">
      <img class="wolf-img" alt="" draggable="false">
      <div class="wolf-zzz" aria-hidden="true" hidden>💤</div>
    </div>`;
  const body = el.querySelector('.wolf-body');
  const img = el.querySelector('.wolf-img');
  const zzz = el.querySelector('.wolf-zzz');
  const aura = el.querySelector('.wolf-aura');

  let fidgetTimer = 0, destroyed = false;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scheduleFidget() {
    if (destroyed || reduced || opts.still) return;
    fidgetTimer = setTimeout(() => {
      if (destroyed) return;
      const moves = ['fidget-tilt', 'fidget-shift', 'fidget-perk'];
      const m = moves[(Math.random() * moves.length) | 0];
      body.classList.add(m);
      setTimeout(() => body.classList.remove(m), 900);
      scheduleFidget();
    }, 6000 + Math.random() * 6000); // jittered 6–12s so it never repeats on a beat
  }

  function update() {
    const L = XP.levelForXp(state.xp);
    const stage = XP.stageForLevel(L);
    const src = ART(stage.idx);
    if (!img.src.endsWith(src)) img.src = src;
    const mood = opts.mood ? opts.mood() : 'waiting';
    el.dataset.mood = mood;
    zzz.hidden = mood !== 'resting';
    // equipped aura
    const a = state.equipped.aura;
    aura.dataset.aura = a || '';
    el.dataset.frame = state.equipped.frame || '';
  }

  // tap reaction: optimistic micro-celebration — fire before anything saves
  function react(kind = 'happy') {
    if (reduced) return;
    const cls = kind === 'big' ? 'react-big' : 'react-bounce';
    body.classList.remove('react-bounce', 'react-big');
    void body.offsetWidth; // restart the animation
    body.classList.add(cls);
    setTimeout(() => body.classList.remove(cls), 800);
  }

  // evolution hero moment: anticipation → burst → settle
  function evolve(newStageIdx, done) {
    body.classList.add('evolve-crouch');
    setTimeout(() => {
      img.src = ART(newStageIdx);
      body.classList.remove('evolve-crouch');
      body.classList.add('evolve-burst');
      el.classList.add('evolve-flash');
      setTimeout(() => {
        body.classList.remove('evolve-burst');
        el.classList.remove('evolve-flash');
        if (done) done();
      }, 700);
    }, reduced ? 0 : 420);
  }

  update();
  scheduleFidget();
  return {
    el, update, react, evolve,
    destroy() { destroyed = true; clearTimeout(fidgetTimer); },
  };
}
