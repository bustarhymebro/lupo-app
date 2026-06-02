// ═══════════════════════════════════════════════════════
//  LUPO WOLF CANVAS ENGINE
//  One detailed left-facing wolf, scaled + recolored per stage.
//  stage 0..4 → newborn pup .. adult wolf
// ═══════════════════════════════════════════════════════

function drawWolf(canvas, stageIndex, isOnboard) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const stage = stageIndex !== undefined ? stageIndex : 4;
  const stageScales = [0.40, 0.55, 0.70, 0.85, 1.0];
  const sc = stageScales[Math.min(stage, 4)];

  const furBase  = stage === 4 ? '#F2F2F2' : stage === 3 ? '#D8D8D8' : stage === 2 ? '#C0C0C0' : stage === 1 ? '#BBBBBB' : '#A0A0A0';
  const furLight = stage === 4 ? '#FFFFFF' : stage >= 3 ? '#E8E8E8' : '#C8C8C8';
  const furShadow= stage === 4 ? '#C8C8C8' : stage >= 3 ? '#B8B8B8' : '#909090';
  const eyeColor = stage >= 2 ? '#D4860A' : '#6B6B6B';
  const isAdult  = stage === 4;

  ctx.save();
  ctx.translate(W * 0.5, H * 0.5);
  ctx.scale(sc, sc);
  ctx.translate(-W * 0.5, -H * 0.5);

  // Gold aura glow for adult wolf
  if (isAdult) {
    ctx.save();
    ctx.shadowColor = 'rgba(245,166,35,0.18)';
    ctx.shadowBlur = 60;
    ctx.fillStyle = 'rgba(245,166,35,0.03)';
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.52, 140, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow
  const gs = ctx.createRadialGradient(W*0.47, H*0.92, 0, W*0.47, H*0.92, W*0.42);
  gs.addColorStop(0, 'rgba(0,0,0,0.45)');
  gs.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gs;
  ctx.beginPath();
  ctx.ellipse(W*0.47, H*0.92, W*0.40, 18, 0, 0, Math.PI*2);
  ctx.fill();

  const ox = isOnboard ? W*0.09 : W*0.06;
  const oy = H * 0.87;

  // ─── TAIL ───
  ctx.save();
  if (isAdult) { ctx.shadowColor = 'rgba(245,166,35,0.1)'; ctx.shadowBlur = 8; }
  const tailGrad = ctx.createLinearGradient(ox+240, oy-30, ox+310, oy-120);
  tailGrad.addColorStop(0, furShadow);
  tailGrad.addColorStop(0.5, furBase);
  tailGrad.addColorStop(1, furLight);
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(ox + 248, oy - 38);
  ctx.bezierCurveTo(ox + 265, oy - 55, ox + 290, oy - 80, ox + 305, oy - 110);
  ctx.bezierCurveTo(ox + 318, oy - 138, ox + 316, oy - 160, ox + 300, oy - 168);
  ctx.bezierCurveTo(ox + 284, oy - 176, ox + 268, oy - 162, ox + 260, oy - 144);
  ctx.bezierCurveTo(ox + 250, oy - 122, ox + 248, oy - 98, ox + 252, oy - 76);
  ctx.bezierCurveTo(ox + 256, oy - 60, ox + 258, oy - 48, ox + 254, oy - 40);
  ctx.bezierCurveTo(ox + 252, oy - 36, ox + 250, oy - 34, ox + 248, oy - 38);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = furLight; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4;
  [[ox+252,oy-42,ox+268,oy-75,ox+292,oy-112,ox+304,oy-138],
   [ox+249,oy-46,ox+264,oy-80,ox+285,oy-118,ox+297,oy-148],
   [ox+256,oy-40,ox+274,oy-70,ox+298,oy-106,ox+308,oy-132]
  ].forEach(([x0,y0,x1,y1,x2,y2,x3,y3]) => {
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.bezierCurveTo(x1,y1,x2,y2,x3,y3); ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // ─── BODY ───
  const bodyGrad = ctx.createLinearGradient(ox+80, oy-140, ox+80, oy-10);
  bodyGrad.addColorStop(0, furLight);
  bodyGrad.addColorStop(0.45, furBase);
  bodyGrad.addColorStop(1, furShadow);
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
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = furLight; ctx.lineWidth = 1.0; ctx.globalAlpha = 0.25;
  [[ox+150,oy-96,ox+185,oy-106,ox+218,oy-100],
   [ox+160,oy-92,ox+194,oy-100,ox+222,oy-94],
   [ox+120,oy-84,ox+130,oy-94,ox+142,oy-98],
   [ox+116,oy-76,ox+126,oy-86,ox+138,oy-92],
   [ox+110,oy-22,ox+140,oy-20,ox+170,oy-22],
   [ox+140,oy-22,ox+172,oy-20,ox+200,oy-22],
   [ox+86,oy-108,ox+96,oy-120,ox+108,oy-128],
   [ox+82,oy-102,ox+92,oy-114,ox+104,oy-124]
  ].forEach(([x0,y0,x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // ─── LEGS ───
  const legColorFar = furShadow;
  ctx.fillStyle = legColorFar;
  ctx.beginPath();
  ctx.moveTo(ox + 92, oy - 26);
  ctx.bezierCurveTo(ox + 89, oy - 15, ox + 87, oy - 5, ox + 86, oy + 4);
  ctx.bezierCurveTo(ox + 85, oy + 10, ox + 84, oy + 14, ox + 81, oy + 15);
  ctx.bezierCurveTo(ox + 77, oy + 16, ox + 74, oy + 13, ox + 74, oy + 7);
  ctx.bezierCurveTo(ox + 74, oy + 1, ox + 76, oy - 6, ox + 79, oy - 14);
  ctx.bezierCurveTo(ox + 82, oy - 20, ox + 86, oy - 24, ox + 92, oy - 26);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = furShadow;
  ctx.beginPath(); ctx.ellipse(ox + 78, oy + 14, 8, 4, -0.1, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = legColorFar;
  ctx.beginPath();
  ctx.moveTo(ox + 188, oy - 28);
  ctx.bezierCurveTo(ox + 192, oy - 14, ox + 194, oy - 2, ox + 194, oy + 8);
  ctx.bezierCurveTo(ox + 194, oy + 14, ox + 192, oy + 16, ox + 188, oy + 16);
  ctx.bezierCurveTo(ox + 184, oy + 16, ox + 182, oy + 14, ox + 182, oy + 7);
  ctx.bezierCurveTo(ox + 182, oy - 2, ox + 184, oy - 12, ox + 186, oy - 20);
  ctx.bezierCurveTo(ox + 187, oy - 25, ox + 188, oy - 28, ox + 188, oy - 28);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = furShadow;
  ctx.beginPath(); ctx.ellipse(ox + 186, oy + 15, 9, 4, 0.1, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = furBase;
  ctx.beginPath();
  ctx.moveTo(ox + 106, oy - 24);
  ctx.bezierCurveTo(ox + 103, oy - 12, ox + 101, oy - 1, ox + 100, oy + 8);
  ctx.bezierCurveTo(ox + 99, oy + 14, ox + 98, oy + 18, ox + 95, oy + 19);
  ctx.bezierCurveTo(ox + 91, oy + 20, ox + 88, oy + 17, ox + 88, oy + 11);
  ctx.bezierCurveTo(ox + 88, oy + 4, ox + 90, oy - 5, ox + 93, oy - 13);
  ctx.bezierCurveTo(ox + 96, oy - 19, ox + 100, oy - 23, ox + 106, oy - 24);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = furBase;
  ctx.beginPath(); ctx.ellipse(ox + 92, oy + 18, 9, 4.5, -0.1, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = furBase;
  ctx.beginPath();
  ctx.moveTo(ox + 210, oy - 34);
  ctx.bezierCurveTo(ox + 218, oy - 20, ox + 220, oy - 8, ox + 216, oy + 4);
  ctx.bezierCurveTo(ox + 212, oy + 14, ox + 206, oy + 18, ox + 200, oy + 18);
  ctx.bezierCurveTo(ox + 194, oy + 18, ox + 191, oy + 14, ox + 192, oy + 8);
  ctx.bezierCurveTo(ox + 193, oy + 0, ox + 197, oy - 10, ox + 200, oy - 18);
  ctx.bezierCurveTo(ox + 203, oy - 26, ox + 206, oy - 32, ox + 210, oy - 34);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = furBase;
  ctx.beginPath(); ctx.ellipse(ox + 197, oy + 17, 11, 5, 0.1, 0, Math.PI*2); ctx.fill();

  // ─── MANE / RUFF ───
  const maneGrad = ctx.createLinearGradient(ox+70, oy-130, ox+70, oy-80);
  maneGrad.addColorStop(0, furLight);
  maneGrad.addColorStop(1, furBase);
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

  ctx.strokeStyle = furLight; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
  [[ox+70,oy-118,ox+66,oy-100,ox+68,oy-84],
   [ox+74,oy-120,ox+70,oy-104,ox+72,oy-86],
   [ox+78,oy-122,ox+76,oy-106,ox+78,oy-88],
   [ox+100,oy-116,ox+104,oy-104,ox+102,oy-88],
   [ox+96,oy-118,ox+100,oy-106,ox+98,oy-90]
  ].forEach(([x0,y0,x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // ─── HEAD ───
  const headGrad = ctx.createLinearGradient(ox+40, oy-155, ox+145, oy-90);
  headGrad.addColorStop(0, furLight);
  headGrad.addColorStop(0.5, furBase);
  headGrad.addColorStop(1, furShadow);
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

  // Ears
  ctx.fillStyle = furShadow;
  ctx.beginPath();
  ctx.moveTo(ox + 110, oy - 158);
  ctx.bezierCurveTo(ox + 114, oy - 176, ox + 120, oy - 192, ox + 122, oy - 196);
  ctx.bezierCurveTo(ox + 128, oy - 192, ox + 132, oy - 176, ox + 128, oy - 158);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7A3535';
  ctx.beginPath();
  ctx.moveTo(ox + 113, oy - 160);
  ctx.bezierCurveTo(ox + 116, oy - 175, ox + 120, oy - 188, ox + 122, oy - 192);
  ctx.bezierCurveTo(ox + 126, oy - 188, ox + 129, oy - 175, ox + 126, oy - 160);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = furBase;
  ctx.beginPath();
  ctx.moveTo(ox + 82, oy - 160);
  ctx.bezierCurveTo(ox + 80, oy - 180, ox + 84, oy - 198, ox + 88, oy - 202);
  ctx.bezierCurveTo(ox + 92, oy - 198, ox + 96, oy - 180, ox + 92, oy - 160);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6B2E2E';
  ctx.beginPath();
  ctx.moveTo(ox + 84, oy - 161);
  ctx.bezierCurveTo(ox + 83, oy - 178, ox + 86, oy - 192, ox + 88, oy - 197);
  ctx.bezierCurveTo(ox + 91, oy - 192, ox + 93, oy - 178, ox + 91, oy - 161);
  ctx.closePath(); ctx.fill();

  // Nose
  ctx.fillStyle = '#111111';
  ctx.beginPath(); ctx.ellipse(ox + 38, oy - 82, 6, 4.5, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(ox + 39, oy - 86, 5, 3, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.ellipse(ox + 36, oy - 85, 2.5, 1.8, -0.3, 0, Math.PI*2); ctx.fill();

  // Mouth
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 38, oy - 72);
  ctx.bezierCurveTo(ox + 44, oy - 70, ox + 52, oy - 70, ox + 56, oy - 72);
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#0e0e0e';
  ctx.beginPath(); ctx.ellipse(ox + 70, oy - 132, 8, 6.5, -0.15, 0, Math.PI*2); ctx.fill();
  const eyeGrad = ctx.createRadialGradient(ox+69, oy-133, 0, ox+70, oy-132, 5.5);
  eyeGrad.addColorStop(0, '#FFB830');
  eyeGrad.addColorStop(0.5, eyeColor);
  eyeGrad.addColorStop(1, '#8B5500');
  ctx.fillStyle = eyeGrad;
  ctx.beginPath(); ctx.ellipse(ox + 70, oy - 132, 5.5, 4.5, -0.15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#070707';
  ctx.beginPath(); ctx.ellipse(ox + 70.5, oy - 132, 1.8, 3.5, -0.05, 0, Math.PI*2); ctx.fill();
  if (isAdult) {
    ctx.save();
    ctx.shadowColor = '#F5A623'; ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(245,166,35,0.15)';
    ctx.beginPath(); ctx.ellipse(ox + 70, oy - 132, 6, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.ellipse(ox + 67.5, oy - 135, 2, 1.6, -0.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(ox + 73, oy - 130, 1.2, 1, 0, 0, Math.PI*2); ctx.fill();

  // Facial marking
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.beginPath();
  ctx.moveTo(ox + 64, oy - 138);
  ctx.bezierCurveTo(ox + 58, oy - 128, ox + 52, oy - 116, ox + 46, oy - 106);
  ctx.bezierCurveTo(ox + 50, oy - 108, ox + 56, oy - 118, ox + 62, oy - 128);
  ctx.bezierCurveTo(ox + 66, oy - 134, ox + 68, oy - 138, ox + 64, oy - 138);
  ctx.closePath(); ctx.fill();

  // Chin patch
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath(); ctx.ellipse(ox + 60, oy - 80, 14, 8, -0.2, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}
