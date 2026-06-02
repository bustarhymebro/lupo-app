// ═══════════════════════════════════════════════════════
//  LUPO WOLF — animated canvas character
//  One detailed left-facing wolf, scaled + recolored per stage,
//  with idle breathing, blinking, tail sway, mood droop, celebrate.
// ═══════════════════════════════════════════════════════
(function (global) {
  'use strict';

  function palette(stage) {
    return {
      furBase:  stage === 4 ? '#F2F2F2' : stage === 3 ? '#D8D8D8' : stage === 2 ? '#C0C0C0' : stage === 1 ? '#BBBBBB' : '#A0A0A0',
      furLight: stage === 4 ? '#FFFFFF' : stage >= 3 ? '#E8E8E8' : '#C8C8C8',
      furShadow:stage === 4 ? '#C8C8C8' : stage >= 3 ? '#B8B8B8' : '#909090',
      eyeColor: stage >= 2 ? '#D4860A' : '#6B6B6B',
      isAdult:  stage === 4,
    };
  }

  // ad = { t, isOnboard, breath, blink, droop, tailRot, glow }
  function draw(ctx, W, H, stage, ad) {
    ctx.clearRect(0, 0, W, H);
    const stageScales = [0.40, 0.55, 0.70, 0.85, 1.0];
    const sc = stageScales[Math.min(stage, 4)] * (ad.breath || 1);
    const P = palette(stage);
    const { furBase, furLight, furShadow, eyeColor, isAdult } = P;
    const droop = ad.droop || 0;

    ctx.save();
    ctx.translate(W * 0.5, H * 0.5 + droop);
    ctx.scale(sc, sc);
    ctx.translate(-W * 0.5, -H * 0.5);

    // aura glow (adult + celebrate)
    const glow = (isAdult ? 0.18 : 0) + (ad.glow || 0);
    if (glow > 0.001) {
      ctx.save();
      ctx.shadowColor = `rgba(245,166,35,${Math.min(0.6, glow)})`;
      ctx.shadowBlur = 60 + (ad.glow || 0) * 120;
      ctx.fillStyle = `rgba(245,166,35,${0.03 + (ad.glow || 0) * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.52, 140, 110, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ground shadow
    const gs = ctx.createRadialGradient(W * 0.47, H * 0.92, 0, W * 0.47, H * 0.92, W * 0.42);
    gs.addColorStop(0, 'rgba(0,0,0,0.45)');
    gs.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gs;
    ctx.beginPath();
    ctx.ellipse(W * 0.47, H * 0.92, W * 0.40, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const ox = ad.isOnboard ? W * 0.09 : W * 0.06;
    const oy = H * 0.87;

    // ─── TAIL (sways) ───
    ctx.save();
    const tbx = ox + 250, tby = oy - 50;
    ctx.translate(tbx, tby);
    ctx.rotate(ad.tailRot || 0);
    ctx.translate(-tbx, -tby);
    if (isAdult) { ctx.shadowColor = 'rgba(245,166,35,0.1)'; ctx.shadowBlur = 8; }
    const tailGrad = ctx.createLinearGradient(ox + 240, oy - 30, ox + 310, oy - 120);
    tailGrad.addColorStop(0, furShadow); tailGrad.addColorStop(0.5, furBase); tailGrad.addColorStop(1, furLight);
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.moveTo(ox + 248, oy - 38);
    ctx.bezierCurveTo(ox + 265, oy - 55, ox + 290, oy - 80, ox + 305, oy - 110);
    ctx.bezierCurveTo(ox + 318, oy - 138, ox + 316, oy - 160, ox + 300, oy - 168);
    ctx.bezierCurveTo(ox + 284, oy - 176, ox + 268, oy - 162, ox + 260, oy - 144);
    ctx.bezierCurveTo(ox + 250, oy - 122, ox + 248, oy - 98, ox + 252, oy - 76);
    ctx.bezierCurveTo(ox + 256, oy - 60, ox + 258, oy - 48, ox + 254, oy - 40);
    ctx.bezierCurveTo(ox + 252, oy - 36, ox + 250, oy - 34, ox + 248, oy - 38);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // ─── BODY ───
    const bodyGrad = ctx.createLinearGradient(ox + 80, oy - 140, ox + 80, oy - 10);
    bodyGrad.addColorStop(0, furLight); bodyGrad.addColorStop(0.45, furBase); bodyGrad.addColorStop(1, furShadow);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(ox + 82, oy - 32);
    ctx.bezierCurveTo(ox + 78, oy - 52, ox + 76, oy - 70, ox + 80, oy - 88);
    ctx.bezierCurveTo(ox + 72, oy - 98, ox + 66, oy - 106, ox + 68, oy - 118);
    ctx.bezierCurveTo(ox + 70, oy - 128, ox + 80, oy - 138, ox + 96, oy - 140);
    ctx.bezierCurveTo(ox + 110, oy - 142, ox + 125, oy - 136, ox + 134, oy - 128);
    ctx.bezierCurveTo(ox + 144, oy - 120, ox + 148, oy - 108, ox + 148, oy - 96);
    ctx.bezierCurveTo(ox + 168, oy - 102, ox + 200, oy - 106, ox + 228, oy - 98);
    ctx.bezierCurveTo(ox + 248, oy - 92, ox + 258, oy - 80, ox + 260, oy - 68);
    ctx.bezierCurveTo(ox + 264, oy - 58, ox + 262, oy - 48, ox + 254, oy - 40);
    ctx.bezierCurveTo(ox + 238, oy - 38, ox + 210, oy - 34, ox + 185, oy - 30);
    ctx.bezierCurveTo(ox + 160, oy - 26, ox + 132, oy - 22, ox + 110, oy - 20);
    ctx.bezierCurveTo(ox + 96, oy - 20, ox + 84, oy - 24, ox + 82, oy - 32);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = furLight; ctx.lineWidth = 1.0; ctx.globalAlpha = 0.22;
    [[ox+150,oy-96,ox+185,oy-106,ox+218,oy-100],[ox+120,oy-84,ox+130,oy-94,ox+142,oy-98],
     [ox+110,oy-22,ox+140,oy-20,ox+170,oy-22],[ox+86,oy-108,ox+96,oy-120,ox+108,oy-128]
    ].forEach(([x0,y0,x1,y1,x2,y2])=>{ ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke(); });
    ctx.globalAlpha = 1;

    // ─── LEGS ───
    ctx.fillStyle = furShadow;
    leg(ctx, [[ox+92,oy-26],[ox+89,oy-15,ox+87,oy-5,ox+86,oy+4],[ox+85,oy+10,ox+84,oy+14,ox+81,oy+15],[ox+77,oy+16,ox+74,oy+13,ox+74,oy+7],[ox+74,oy+1,ox+76,oy-6,ox+79,oy-14],[ox+82,oy-20,ox+86,oy-24,ox+92,oy-26]]);
    paw(ctx, ox+78, oy+14, 8, 4, -0.1, furShadow);
    leg(ctx, [[ox+188,oy-28],[ox+192,oy-14,ox+194,oy-2,ox+194,oy+8],[ox+194,oy+14,ox+192,oy+16,ox+188,oy+16],[ox+184,oy+16,ox+182,oy+14,ox+182,oy+7],[ox+182,oy-2,ox+184,oy-12,ox+186,oy-20],[ox+187,oy-25,ox+188,oy-28,ox+188,oy-28]]);
    paw(ctx, ox+186, oy+15, 9, 4, 0.1, furShadow);
    ctx.fillStyle = furBase;
    leg(ctx, [[ox+106,oy-24],[ox+103,oy-12,ox+101,oy-1,ox+100,oy+8],[ox+99,oy+14,ox+98,oy+18,ox+95,oy+19],[ox+91,oy+20,ox+88,oy+17,ox+88,oy+11],[ox+88,oy+4,ox+90,oy-5,ox+93,oy-13],[ox+96,oy-19,ox+100,oy-23,ox+106,oy-24]]);
    paw(ctx, ox+92, oy+18, 9, 4.5, -0.1, furBase);
    leg(ctx, [[ox+210,oy-34],[ox+218,oy-20,ox+220,oy-8,ox+216,oy+4],[ox+212,oy+14,ox+206,oy+18,ox+200,oy+18],[ox+194,oy+18,ox+191,oy+14,ox+192,oy+8],[ox+193,oy+0,ox+197,oy-10,ox+200,oy-18],[ox+203,oy-26,ox+206,oy-32,ox+210,oy-34]]);
    paw(ctx, ox+197, oy+17, 11, 5, 0.1, furBase);

    // ─── MANE ───
    const maneGrad = ctx.createLinearGradient(ox+70, oy-130, ox+70, oy-80);
    maneGrad.addColorStop(0, furLight); maneGrad.addColorStop(1, furBase);
    ctx.fillStyle = maneGrad;
    ctx.beginPath();
    ctx.moveTo(ox + 68, oy - 118);
    ctx.bezierCurveTo(ox + 64, oy - 108, ox + 60, oy - 96, ox + 62, oy - 84);
    ctx.bezierCurveTo(ox + 63, oy - 76, ox + 67, oy - 70, ox + 76, oy - 66);
    ctx.bezierCurveTo(ox + 84, oy - 62, ox + 92, oy - 60, ox + 100, oy - 64);
    ctx.bezierCurveTo(ox + 108, oy - 68, ox + 114, oy - 78, ox + 114, oy - 88);
    ctx.bezierCurveTo(ox + 114, oy - 98, ox + 110, oy - 108, ox + 104, oy - 116);
    ctx.bezierCurveTo(ox + 96, oy - 126, ox + 84, oy - 132, ox + 72, oy - 128);
    ctx.bezierCurveTo(ox + 68, oy - 126, ox + 66, oy - 122, ox + 68, oy - 118);
    ctx.closePath(); ctx.fill();

    // ─── HEAD ───
    const headGrad = ctx.createLinearGradient(ox+40, oy-155, ox+145, oy-90);
    headGrad.addColorStop(0, furLight); headGrad.addColorStop(0.5, furBase); headGrad.addColorStop(1, furShadow);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(ox + 134, oy - 118);
    ctx.bezierCurveTo(ox + 136, oy - 130, ox + 130, oy - 148, ox + 118, oy - 158);
    ctx.bezierCurveTo(ox + 106, oy - 166, ox + 90, oy - 168, ox + 76, oy - 162);
    ctx.bezierCurveTo(ox + 62, oy - 156, ox + 52, oy - 144, ox + 48, oy - 130);
    ctx.bezierCurveTo(ox + 44, oy - 120, ox + 42, oy - 112, ox + 40, oy - 104);
    ctx.bezierCurveTo(ox + 38, oy - 96, ox + 37, oy - 90, ox + 38, oy - 86);
    ctx.bezierCurveTo(ox + 36, oy - 82, ox + 35, oy - 76, ox + 38, oy - 72);
    ctx.bezierCurveTo(ox + 41, oy - 68, ox + 46, oy - 66, ox + 52, oy - 68);
    ctx.bezierCurveTo(ox + 62, oy - 70, ox + 76, oy - 74, ox + 90, oy - 78);
    ctx.bezierCurveTo(ox + 106, oy - 82, ox + 120, oy - 88, ox + 130, oy - 96);
    ctx.bezierCurveTo(ox + 136, oy - 102, ox + 138, oy - 110, ox + 134, oy - 118);
    ctx.closePath(); ctx.fill();

    // ears
    ctx.fillStyle = furShadow;
    tri(ctx, [[ox+110,oy-158],[ox+114,oy-176,ox+120,oy-192,ox+122,oy-196],[ox+128,oy-192,ox+132,oy-176,ox+128,oy-158]]);
    ctx.fillStyle = '#7A3535';
    tri(ctx, [[ox+113,oy-160],[ox+116,oy-175,ox+120,oy-188,ox+122,oy-192],[ox+126,oy-188,ox+129,oy-175,ox+126,oy-160]]);
    ctx.fillStyle = furBase;
    tri(ctx, [[ox+82,oy-160],[ox+80,oy-180,ox+84,oy-198,ox+88,oy-202],[ox+92,oy-198,ox+96,oy-180,ox+92,oy-160]]);
    ctx.fillStyle = '#6B2E2E';
    tri(ctx, [[ox+84,oy-161],[ox+83,oy-178,ox+86,oy-192,ox+88,oy-197],[ox+91,oy-192,ox+93,oy-178,ox+91,oy-161]]);

    // nose
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(ox+38, oy-82, 6, 4.5, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(ox+39, oy-86, 5, 3, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(ox+36, oy-85, 2.5, 1.8, -0.3, 0, Math.PI*2); ctx.fill();
    // mouth
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox+38, oy-72); ctx.bezierCurveTo(ox+44, oy-70, ox+52, oy-70, ox+56, oy-72); ctx.stroke();

    // ── EYE (blink-aware) ──
    const ex = ox + 70, ey = oy - 132;
    if (ad.blink) {
      ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 6, ey); ctx.quadraticCurveTo(ex, ey + 3, ex + 6, ey - 1); ctx.stroke();
    } else {
      ctx.fillStyle = '#0e0e0e'; ctx.beginPath(); ctx.ellipse(ex, ey, 8, 6.5, -0.15, 0, Math.PI*2); ctx.fill();
      const eyeGrad = ctx.createRadialGradient(ex-1, ey-1, 0, ex, ey, 5.5);
      eyeGrad.addColorStop(0, '#FFB830'); eyeGrad.addColorStop(0.5, eyeColor); eyeGrad.addColorStop(1, '#8B5500');
      ctx.fillStyle = eyeGrad; ctx.beginPath(); ctx.ellipse(ex, ey, 5.5, 4.5, -0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#070707'; ctx.beginPath(); ctx.ellipse(ex+0.5, ey, 1.8, 3.5, -0.05, 0, Math.PI*2); ctx.fill();
      if (isAdult) {
        ctx.save(); ctx.shadowColor = '#F5A623'; ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(245,166,35,0.15)'; ctx.beginPath(); ctx.ellipse(ex, ey, 6, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(ex-2.5, ey-3, 2, 1.6, -0.4, 0, Math.PI*2); ctx.fill();
    }

    // chin patch
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(ox+60, oy-80, 14, 8, -0.2, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  function leg(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
    ctx.closePath(); ctx.fill();
  }
  function paw(ctx, x, y, rx, ry, rot, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI*2); ctx.fill(); }
  function tri(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[1][2], pts[1][3], pts[1][4], pts[1][5]);
    ctx.bezierCurveTo(pts[2][0], pts[2][1], pts[2][2], pts[2][3], pts[2][4], pts[2][5]);
    ctx.closePath(); ctx.fill();
  }

  function isSad(mood) { return mood === 'disappointed' || mood === 'struggling'; }

  // animated controller bound to a canvas
  function mount(canvas, stage, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    const st = { stage: stage, mood: opts.mood || 'neutral', isOnboard: !!opts.isOnboard };
    let raf = 0, t0 = performance.now();
    let nextBlink = 1200 + Math.random() * 2600, blinkStart = -1;
    let celebrate0 = -1;

    function frame(now) {
      const ms = now - t0;
      const t = ms / 1000;
      // blink scheduling
      let blink = false;
      if (blinkStart < 0 && ms > nextBlink) blinkStart = ms;
      if (blinkStart >= 0) {
        const b = ms - blinkStart;
        if (b < 150) blink = true;
        else { blinkStart = -1; nextBlink = ms + 1800 + Math.random() * 3200; }
      }
      const sad = isSad(st.mood);
      const breath = 1 + (sad ? 0.008 : 0.018) * Math.sin(t * (sad ? 1.4 : 1.9));
      const droop = sad ? 8 : 0;
      const tailRot = sad ? 0.03 * Math.sin(t * 1.1) : 0.10 * Math.sin(t * 1.7);
      let glow = 0;
      if (celebrate0 >= 0) {
        const c = (now - celebrate0) / 900;
        if (c >= 1) celebrate0 = -1; else glow = Math.sin(c * Math.PI);
      }
      draw(ctx, canvas.width, canvas.height, st.stage, { t, isOnboard: st.isOnboard, breath: breath + glow * 0.06, blink, droop, tailRot, glow });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      setStage(s) { st.stage = s; },
      setMood(m) { st.mood = m; },
      celebrate() { celebrate0 = performance.now(); },
      stop() { cancelAnimationFrame(raf); },
    };
  }

  // single static render (for small thumbnails)
  function still(canvas, stage, opts) {
    opts = opts || {};
    draw(canvas.getContext('2d'), canvas.width, canvas.height, stage, { t: 0, isOnboard: !!opts.isOnboard, breath: 1, blink: false, droop: 0, tailRot: 0.05, glow: 0 });
  }

  global.LupoWolf = { mount, still, draw };
  // back-compat shim
  global.drawWolf = function (canvas, stage, isOnboard) { if (canvas) still(canvas, stage, { isOnboard }); };
})(window);
