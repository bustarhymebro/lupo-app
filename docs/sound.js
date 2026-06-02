// ═══════════════════════════════════════════════════════
//  LUPO sound. Web Audio synthesis, no files. iOS-unlock + mute.
// ═══════════════════════════════════════════════════════
(function (g) {
  'use strict';
  let ctx, master, unlocked = false, enabled = true;
  function ac(){ if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null; ctx=new AC(); master=ctx.createGain(); master.gain.value=0.26; master.connect(ctx.destination); } return ctx; }
  function unlock(){ const c=ac(); if(!c) return; if(c.state==='suspended') c.resume(); if(unlocked) return;
    try{ const b=c.createBuffer(1,1,22050), s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); }catch(e){} unlocked=true; }
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('touchstart', unlock, {passive:true});

  function tone(freq, start, dur, type, peak){ const c=ac(); if(!c) return;
    const o=c.createOscillator(), gn=c.createGain(); o.type=type||'sine'; o.frequency.value=freq;
    o.connect(gn); gn.connect(master); const t=c.currentTime+start;
    gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(peak||0.3,t+0.012); gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t); o.stop(t+dur+0.03); }
  function sparkle(start, dur){ const c=ac(); if(!c) return;
    const b=c.createBuffer(1, Math.floor(c.sampleRate*dur), c.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=c.createBufferSource(); src.buffer=b; const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=4800; bp.Q.value=6;
    const gn=c.createGain(); src.connect(bp); bp.connect(gn); gn.connect(master); const t=c.currentTime+start;
    gn.gain.setValueAtTime(0.0001,t); gn.gain.exponentialRampToValueAtTime(0.16,t+0.02); gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.start(t); src.stop(t+dur+0.03); }

  g.Sound = {
    on(v){ enabled=!!v; },
    isOn(){ return enabled; },
    tap(){ if(enabled) tone(820,0,0.07,'triangle',0.20); },
    check(){ if(!enabled) return; tone(660,0,0.08,'sine',0.24); tone(880,0.06,0.1,'sine',0.20); },
    start(){ if(enabled) tone(440,0,0.12,'sine',0.18); },
    day(){ if(!enabled) return; [523,659,784].forEach((f,i)=>tone(f,i*0.085,0.2,'sine',0.22)); },
    level(){ if(!enabled) return; [523,659,784,1046].forEach((f,i)=>tone(f,i*0.09,0.22,'triangle',0.24)); sparkle(0.18,0.4); },
  };
})(window);
