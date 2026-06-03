// ═══════════════════════════════════════════════════════
//  LUPO. Endless-growth habit app (web PWA)
// ═══════════════════════════════════════════════════════
'use strict';

// ── Growth model ──
// Five painted forms (art Jake provided), with his names and the level each unlocks
// `at` = consistent days required; displayed level is days+1 so a new wolf is LV 1 and forms unlock on clean numbers (1/5/15/30/50)
const TIERS = [
  {at:0,  name:'Pup'},
  {at:4,  name:'Yearling'},
  {at:14, name:'Scout'},
  {at:29, name:'Hunter'},
  {at:49, name:'Alpha'},
];
function tierIdx(lvl){ let i=0; for(let k=0;k<TIERS.length;k++){ if(lvl>=TIERS[k].at) i=k; } return i; }
const PAINTED=['assets/wolf/painted-cut-0.png','assets/wolf/painted-cut-1.png','assets/wolf/painted-cut-2.png','assets/wolf/painted-cut-3.png','assets/wolf/painted-cut-4.png'];
function wolfImg(i){ i=Math.max(0,Math.min(4, i|0)); return (state && state.wolfArt && state.wolfArt[i]) || PAINTED[i]; }
function drawWolf(idOrEl, i){ const el=typeof idOrEl==='string'?document.getElementById(idOrEl):idOrEl; if(!el) return; const src=wolfImg(i); const key='w:'+src; if(el.dataset.w!==key){ el.dataset.w=key; el.innerHTML='<img class="wolf-svg-el wolf-photo" src="'+src+'" alt="" aria-hidden="true">'; } }

// 5 maturity bands drive mood flavor (reuse of the original tone)
const BAND_TAG = [
  'Fragile. Watching. Waiting for you to prove yourself.',
  "Eyes open. The pack awaits, if you're worthy.",
  'Testing his strength. Testing yours.',
  "Power building. Discipline sharpening. Don't stop now.",
  'He runs with no pack but the one he chose. You built this.',
];
const STAGE_MOOD_MSG = {
  0:{thriving:"You're keeping up. Don't let it slip.",good:"Decent start. He's watching you.",neutral:"Barely enough. He expects more.",disappointed:"You're already falling short.",struggling:"You're failing a pup who can't fight back yet."},
  1:{thriving:"He's starting to trust your discipline.",good:"Not bad. Keep the streak alive.",neutral:"He can feel your inconsistency.",disappointed:"He's losing faith in you.",struggling:"He whimpers when you don't show up."},
  2:{thriving:"He stands taller every time you follow through.",good:"Solid. He respects your consistency.",neutral:"You're coasting. He notices.",disappointed:"Weak days make a weak wolf.",struggling:"He's regressing because you are."},
  3:{thriving:"Raw power. Earned by real work.",good:"He runs harder when you push harder.",neutral:"This close to greatness, and you're phoning it in.",disappointed:"Don't waste what you built.",struggling:"A wolf this far along doesn't have to fall. You chose this."},
  4:{thriving:"This is what discipline looks like. Own it.",good:"He howls on your schedule. Keep it.",neutral:"A wolf this powerful deserves better habits than this.",disappointed:"You've come too far to go soft.",struggling:"He remembers every day you didn't show up."},
};
const band = (lvl) => tierIdx(lvl);

// ── Habits ──
// kind: 'limit' (stay under, manual confirm) | 'timer' (run a countdown) | 'check' (manual)
function fmtT(t,u){ if(u==='h'){ const w=Math.floor(t),m=Math.round((t-w)*60); return (w?w+'h':'')+(m?(w?' ':'')+m+'m':(w?'':'0m')); } return t+' min'; }
const HABITS = {
  screenTime:{ name:'Screen Time',      icon:'📵', required:true,  kind:'limit', def:3,  unit:'h', min:1,   max:8,   step:0.5, auto:'Auto-verified in the iOS app', label:t=>`Stay under ${fmtT(t,'h')}` },
  sleep:     { name:'Sleep',            icon:'🌙', required:false, kind:'timer', def:8,  unit:'h', min:4,   max:12,  step:0.5, label:t=>`${fmtT(t,'h')} of sleep` },
  focus:     { name:'Focus · Off Phone',icon:'🧠', required:false, kind:'timer', def:2,  unit:'h', min:0.5, max:8,   step:0.5, label:t=>`${fmtT(t,'h')} off your phone` },
  workout:   { name:'Workout',          icon:'💪', required:false, kind:'timer', def:30, unit:'m', min:10,  max:120, step:5,   label:t=>`${fmtT(t,'m')} active` },
  read:      { name:'Read',             icon:'📖', required:false, kind:'timer', def:20, unit:'m', min:5,   max:120, step:5,   label:t=>`${fmtT(t,'m')} reading` },
  water:     { name:'Hydrate',          icon:'💧', required:false, kind:'check', def:8,  unit:'cups', min:1, max:16, step:1,   label:()=>'Drink enough water' },
};
const HABIT_ORDER = ['screenTime','sleep','focus','workout','read','water'];
function habitTarget(k){ const h=state.habits[k]; return (h && h.target!=null) ? h.target : HABITS[k].def; }
function habitLabel(k){ return HABITS[k].label(habitTarget(k)); }
function targetMs(k){ const t=habitTarget(k); return HABITS[k].unit==='h' ? t*3600000 : t*60000; }
function targetShort(k){ const t=habitTarget(k),u=HABITS[k].unit; return u==='cups'? t+' cups' : fmtT(t,u); }
function adjustTarget(k,d){ const h=HABITS[k]; let t=habitTarget(k)+d*h.step; t=Math.round(t/h.step*1e6)/1e6; t=Math.max(h.min,Math.min(h.max,t)); state.habits[k].target=t; save(); }

// ── State ──
const BUILD = '34'; // shown on Profile so a screenshot reveals which build is actually loaded (diagnoses stale PWA cache)
const STORE_KEY = 'lupo.v2';
const ART_KEY = 'lupo.v2.art'; // bulky uploaded wolf art lives apart so it never crowds out the tiny streak data
let state = null;
let pendingStageUp = false;
// escape user-controlled text (the wolf's name) before it goes into innerHTML, so a name with < > & can't break or inject markup
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function defaultState(){
  return {
    onboarded:false,
    reminders:false,
    tutorialSeen:false,
    lastCelebratedDay:null,
    creditedDays:[],
    sound:true,
    wolfArt:{},
    pet:{ name:'Lupo', stage:0, tierIdx:0, maxTierIdx:0, energy:0.5, mood:'neutral',
          consistentDays:0, currentStreak:0, totalDaysTracked:0,
          createdDate:new Date().toISOString(), lastUpdated:new Date().toISOString(),
          lastScoredDay:dateKey(new Date()), missedDaysStreak:0 },
    timer:null,
    habits:{ screenTime:{enabled:true,target:3}, sleep:{enabled:false,target:8}, focus:{enabled:false,target:2},
             workout:{enabled:false,target:30}, read:{enabled:false,target:20}, water:{enabled:false,target:8} },
    logs:{},
  };
}
function load(){
  const def = defaultState();
  let parsed = null;
  try{ const raw = localStorage.getItem(STORE_KEY); if(raw) parsed = JSON.parse(raw); }
  catch(e){
    try{
      const raw=localStorage.getItem(STORE_KEY);
      // keep a single fresh backup, drop older ones so dead copies can't pile up against the quota
      Object.keys(localStorage).forEach(k=>{ if(k.indexOf(STORE_KEY+'.corrupt.')===0) localStorage.removeItem(k); });
      if(raw){ try{ localStorage.setItem(STORE_KEY+'.corrupt.'+Date.now(), raw); }catch(_){} }
      localStorage.removeItem(STORE_KEY); // clear the bad value so a clean default can persist
    }catch(_){}
    parsed = null;
  }
  state = Object.assign({}, def, parsed || {});
  state.pet = Object.assign({}, def.pet, (parsed && parsed.pet) || {});
  state.habits = (parsed && typeof parsed.habits==='object' && parsed.habits) || def.habits;
  if(!state.logs || typeof state.logs!=='object') state.logs = {};
  if(!state.wolfArt || typeof state.wolfArt!=='object') state.wolfArt = {};
  if(!Array.isArray(state.creditedDays)) state.creditedDays = [];
  HABIT_ORDER.forEach(k => { if(!state.habits[k]) state.habits[k]={enabled:false}; if(typeof state.habits[k].target!=='number') state.habits[k].target=HABITS[k].def; });
  if(HABITS.screenTime.required) state.habits.screenTime.enabled = true; // required habit is always on
  ['energy','consistentDays','currentStreak','totalDaysTracked','missedDaysStreak','stage','tierIdx','maxTierIdx'].forEach(f=>{ if(!Number.isFinite(state.pet[f])) state.pet[f]=def.pet[f]; });
  if(state.pet.maxTierIdx < state.pet.tierIdx) state.pet.maxTierIdx = state.pet.tierIdx; // never re-celebrate already-earned forms
  state.pet.energy = Math.max(0, Math.min(1, state.pet.energy));
  if(typeof state.pet.name!=='string' || !state.pet.name) state.pet.name='Lupo';
  let _lu = new Date(state.pet.lastUpdated);
  if(typeof state.pet.lastUpdated!=='string' || isNaN(_lu.getTime())){ _lu=new Date(); state.pet.lastUpdated=_lu.toISOString(); }
  if(typeof state.pet.lastScoredDay!=='string' || !/^\d{4}-\d\d-\d\d$/.test(state.pet.lastScoredDay)) state.pet.lastScoredDay = dateKey(startOfDay(_lu));
  if(state.timer && (typeof state.timer.dur!=='number' || typeof state.timer.start!=='number' || !HABITS[state.timer.key])) state.timer=null;
  if(typeof state.sound!=='boolean') state.sound=true;
  if(typeof state.tutorialSeen!=='boolean') state.tutorialSeen=false;
  if(typeof state.reminders!=='boolean') state.reminders=false;
  // Wolf art is stored in its own key. Read it; migrate it out of an old combined blob if needed.
  let artParsed=null;
  try{ const ar=localStorage.getItem(ART_KEY); if(ar) artParsed=JSON.parse(ar); }catch(_){}
  if(artParsed && typeof artParsed==='object'){ state.wolfArt=artParsed; }
  else if(parsed && parsed.wolfArt && typeof parsed.wolfArt==='object' && Object.keys(parsed.wolfArt).length){ state.wolfArt=parsed.wolfArt; saveArt(); }
  if(!state.wolfArt || typeof state.wolfArt!=='object') state.wolfArt={};
}
// Main state save. Excludes wolfArt (kept in its own key) so habit/streak data stays tiny and almost never hits quota.
function save(){ try{ const m={}; for(const k in state){ if(k!=='wolfArt') m[k]=state[k]; } localStorage.setItem(STORE_KEY, JSON.stringify(m)); return true; }catch(e){ notifyStorageFull(); return false; } }
function saveArt(){ try{ localStorage.setItem(ART_KEY, JSON.stringify(state.wolfArt||{})); return true; }catch(e){ notifyStorageFull(); return false; } }
let _storageWarned=false;
function notifyStorageFull(){
  if(_storageWarned) return; _storageWarned=true;
  try{
    const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','alert');
    t.textContent='Storage is full so your latest change may not be saved. Free up space or remove custom wolf art.';
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); _storageWarned=false; }, 6000);
  }catch(e){ _storageWarned=false; }
}

// ── Dates ──
function dateKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function addDays(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
function todayKey(){ return dateKey(new Date()); }

// ── Habit helpers ──
function enabledHabits(){ return HABIT_ORDER.filter(k => state.habits[k].enabled); }
function ensureLog(key){
  if(!state.logs[key]){ const e={}; if(key===todayKey()){ enabledHabits().forEach(h=>e[h]=false); } state.logs[key]=e; }
  if(key===todayKey()){ enabledHabits().forEach(h=>{ if(!(h in state.logs[key])) state.logs[key][h]=false; }); }
  return state.logs[key];
}
// score each day against the habits actually recorded in THAT day's entry (not today's live set)
function logKeys(entry){ return Object.keys(entry||{}).filter(k=>HABITS[k]); }
function logAllRequiredDone(entry){
  if(!entry) return false;
  const keys=logKeys(entry); const req=keys.filter(k=>HABITS[k].required);
  if(req.length) return req.every(k=>entry[k]===true);
  return keys.length>0 && keys.every(k=>entry[k]===true);
}
function logCompletionRate(entry){ const keys=logKeys(entry); if(!keys.length) return 0; return keys.filter(k=>entry[k]===true).length/keys.length; }
function logAllEnabledDone(entry){ const keys=logKeys(entry); return keys.length>0 && keys.every(k=>entry[k]===true); }

// ── Game logic ──
function moodForEnergy(e){ if(e>=0.75)return'thriving'; if(e>=0.5)return'good'; if(e>=0.35)return'neutral'; if(e>=0.2)return'disappointed'; return'struggling'; }
const levelOf = () => state.pet.consistentDays;
const displayLevel = () => state.pet.consistentDays + 1; // 1-based level shown to the user

function parseDayKey(k){ const p=String(k||'').split('-'); const d=new Date(+p[0],(+p[1]||1)-1,(+p[2]||1)); return isNaN(d.getTime())?startOfDay(new Date()):d; }
function checkForNewDay(){
  if(!state.onboarded) return;
  const today = startOfDay(new Date());
  let cursor = addDays(parseDayKey(state.pet.lastScoredDay), 1);
  if(cursor > today) cursor = new Date(today); // clock moved backward; nothing new to score
  if(cursor >= today) return; // nothing new to score; don't touch state or storage
  const prevTier = state.pet.tierIdx;
  // Snapshot so the whole scoring pass is all-or-nothing: if the write fails we roll back
  // and retry next launch instead of re-applying missed-day penalties every boot.
  const snap = { pet: Object.assign({}, state.pet), credited: state.creditedDays.slice() };
  while(cursor < today){
    const dk = dateKey(cursor);
    if(state.creditedDays.indexOf(dk) === -1){ // not already credited live that day
      state.pet.totalDaysTracked += 1;
      if(logAllRequiredDone(state.logs[dk])){
        state.pet.consistentDays += 1; state.pet.currentStreak += 1; state.pet.missedDaysStreak = 0; state.pet.energy = Math.min(1, state.pet.energy + 0.2);
        state.creditedDays.push(dk);
      } else {
        state.pet.missedDaysStreak += 1; state.pet.currentStreak = 0; state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 1); state.pet.energy = Math.max(0, state.pet.energy - 0.15);
        if(state.pet.missedDaysStreak >= 3) state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 2);
      }
    }
    state.pet.lastScoredDay = dk;
    cursor = addDays(cursor,1);
  }
  state.pet.mood = moodForEnergy(state.pet.energy);
  state.pet.stage = band(levelOf());
  state.pet.tierIdx = tierIdx(levelOf());
  state.pet.lastUpdated = new Date().toISOString();
  ensureLog(todayKey());
  if(!save()){ // couldn't persist; undo so we don't lose or double-apply the streak math
    state.pet = snap.pet; state.creditedDays = snap.credited;
    return;
  }
  // persisted, so it's now safe to trim history
  if(state.creditedDays.length > 120) state.creditedDays = state.creditedDays.slice(-120);
  const cut = dateKey(addDays(today, -90));
  Object.keys(state.logs).forEach(k=>{ if(k < cut) delete state.logs[k]; });
  if(state.pet.tierIdx > state.pet.maxTierIdx){ state.pet.maxTierIdx = state.pet.tierIdx; pendingStageUp = true; }
  save();
}
// Immediate same-day growth: finishing your required habits levels the wolf now.
function maybeCreditToday(){
  const tk = todayKey();
  if(state.creditedDays.indexOf(tk) !== -1) return false;
  if(!logAllRequiredDone(ensureLog(tk))) return false;
  state.creditedDays.push(tk);
  state.pet.consistentDays += 1;
  state.pet.currentStreak += 1;
  state.pet.totalDaysTracked += 1;
  state.pet.missedDaysStreak = 0;
  state.pet.energy = Math.min(1, state.pet.energy + 0.2);
  state.pet.mood = moodForEnergy(state.pet.energy);
  state.pet.stage = band(levelOf());
  state.pet.tierIdx = tierIdx(levelOf());
  const leveled = state.pet.tierIdx > state.pet.maxTierIdx; // only a brand-new form (not a re-climb) celebrates
  if(leveled){ state.pet._creditPrevMax = state.pet.maxTierIdx; state.pet.maxTierIdx = state.pet.tierIdx; }
  else { state.pet._creditPrevMax = null; }
  state.pet.lastUpdated = new Date().toISOString();
  save();
  if(!screens.home.hidden) renderHome();
  if(!screens.journey.hidden) renderJourney();
  let celebrated=false;
  if(leveled){ pendingStageUp=false; showStageUp(); celebrated=true; }
  else if(STREAK_MILESTONES.indexOf(state.pet.currentStreak)!==-1){ showStreakMilestone(state.pet.currentStreak); celebrated=true; }
  return celebrated; // a celebration overlay was shown, so callers suppress the generic day-complete popup
}
// Reverse a same-day credit when the user unchecks a required habit so the streak can't stay inflated.
function uncreditToday(){
  const tk=todayKey(); const i=state.creditedDays.indexOf(tk);
  if(i===-1) return false;
  state.creditedDays.splice(i,1);
  state.pet.consistentDays = Math.max(0, state.pet.consistentDays-1);
  state.pet.currentStreak = Math.max(0, state.pet.currentStreak-1);
  state.pet.totalDaysTracked = Math.max(0, state.pet.totalDaysTracked-1);
  state.pet.energy = Math.max(0, state.pet.energy-0.2);
  state.pet.mood = moodForEnergy(state.pet.energy);
  state.pet.stage = band(levelOf());
  state.pet.tierIdx = tierIdx(levelOf());
  if(typeof state.pet._creditPrevMax==='number'){ state.pet.maxTierIdx = state.pet._creditPrevMax; state.pet._creditPrevMax = null; } // restore exact pre-credit watermark so only a form earned by today's credit can re-celebrate
  state.pet.lastUpdated = new Date().toISOString();
  if(state.lastCelebratedDay===tk) state.lastCelebratedDay=null; // let the "good job" popup fire again if they re-complete
  save();
  if(!screens.home.hidden) renderHome();
  if(!screens.journey.hidden) renderJourney();
  return true;
}
function toggleHabit(k){ const e=ensureLog(todayKey()); e[k]=!e[k]; state.pet.mood=moodForEnergy(state.pet.energy); save(); }

// ── Timer (Forest-style countdown; persists via timestamps) ──
function startTimer(k){ state.timer={key:k,start:Date.now(),dur:targetMs(k),day:todayKey()}; save(); }
function cancelTimer(){ state.timer=null; save(); }
function timerLeftMs(){ if(!state.timer || !Number.isFinite(state.timer.dur) || !Number.isFinite(state.timer.start)) return 0; return Math.max(0, state.timer.dur-(Date.now()-state.timer.start)); }
function timerFrac(){ if(!state.timer || !Number.isFinite(state.timer.dur) || state.timer.dur<=0) return 0; return Math.min(1,(Date.now()-state.timer.start)/state.timer.dur); }
function checkTimer(){ if(state.timer && timerLeftMs()<=0){ const k=state.timer.key; const day=state.timer.day||todayKey(); const e=state.logs[day]||(state.logs[day]={}); e[k]=true; state.timer=null; state.pet.mood=moodForEnergy(state.pet.energy); save(); return k; } return null; }
function fmtClock(ms){ const s=Math.max(0,Math.ceil(ms/1000)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(sec).padStart(2,'0'); }
let tickStarted=false;
function startTick(){ if(tickStarted) return; tickStarted=true; setInterval(()=>{
  if(document.hidden || !state || !state.timer) return;
  const done=checkTimer();
  if(done){ haptic([12,40,18]); celebrateWolf('wolfHome'); const leveled=maybeCreditToday(); if(!screens.habits.hidden) renderHabits(); if(!screens.home.hidden) renderHome(); if(!leveled) maybeDayComplete(); return; }
  if(screens.home.hidden && screens.habits.hidden) return; // no visible timer banner to update this tick
  const left=fmtClock(timerLeftMs()), off=String((1-timerFrac())*(2*Math.PI*26));
  document.querySelectorAll('[data-timer-clock]').forEach(el=> el.textContent=left);
  document.querySelectorAll('[data-timer-ring]').forEach(el=> el.style.strokeDashoffset=off);
},1000); }

// ═══════════════════════════════════════════════════════
//  NAVIGATION + helpers
// ═══════════════════════════════════════════════════════
const SCREENS = ['home','habits','journey','stats','profile'];
const screens = {}; SCREENS.forEach(s => screens[s] = document.getElementById('screen-'+s));
const RENDER = { home:renderHome, habits:renderHabits, journey:renderJourney, stats:renderStats, profile:renderProfile };

function haptic(ms){ try{ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.isActive)) navigator.vibrate(ms); }catch(e){} }
function playEnter(el){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
function stagger(nodes, base){ base=base||0; nodes.forEach((k,i)=>{ k.classList.remove('rise'); k.style.animationDelay=(base+i*50)+'ms'; void k.offsetWidth; k.classList.add('rise'); }); }
function animateNumber(el,to,dur,suffix){ suffix=suffix||''; dur=dur||700;
  if(el._numRaf){ cancelAnimationFrame(el._numRaf); el._numRaf=null; } // never let two count-ups fight over the same element
  if(reduceMotion()){ el.textContent=Math.round(to)+suffix; return; }
  const s=performance.now();
  (function tick(now){ const p=Math.min(1,(now-s)/dur); el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suffix; if(p<1) el._numRaf=requestAnimationFrame(tick); else el._numRaf=null; })(performance.now()); }
function handleWolfUpload(file, band){
  const r=new FileReader();
  r.onload=()=>{ const img=new Image();
    img.onload=()=>{ const max=440; const sc=Math.min(1, max/Math.max(img.width,img.height));
      const cw=Math.round(img.width*sc), ch=Math.round(img.height*sc);
      const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
      cv.getContext('2d').drawImage(img,0,0,cw,ch);
      let url; try{ url=cv.toDataURL('image/jpeg',0.85); }catch(e){ url=r.result; }
      if(!state.wolfArt) state.wolfArt={};
      const prev=state.wolfArt[band]; state.wolfArt[band]=url;
      if(!saveArt()){ if(prev===undefined) delete state.wolfArt[band]; else state.wolfArt[band]=prev; alert('That image is too large to store. Try a smaller one.'); return; }
      haptic(12); renderProfile();
    };
    img.src=r.result;
  };
  r.readAsDataURL(file);
}
function reduceMotion(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
function sparkBurst(el){
  if(!el || reduceMotion()) return; const r=el.getBoundingClientRect(); const host=document.getElementById('app'); if(!host) return;
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  for(let i=0;i<9;i++){ const s=document.createElement('div'); s.className='spark'; s.textContent=i%2?'✦':'★';
    s.style.left=cx+'px'; s.style.top=cy+'px'; host.appendChild(s);
    const ang=Math.random()*Math.PI*2, dist=28+Math.random()*46;
    s.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(ang)*dist}px),calc(-50% + ${Math.sin(ang)*dist}px)) scale(1.15) rotate(${Math.random()*180-90}deg)`,opacity:0}],{duration:620+Math.random()*320,easing:'cubic-bezier(.2,.7,.3,1)'});
    setTimeout(()=>s.remove(),980); }
}
function celebrateWolf(id){ const el=document.getElementById(id); if(!el)return; const cut=el.querySelector('.wolf-cut'); const t=cut||el; const cls=cut?'pet':'pop'; t.classList.remove('pet','pop'); void t.offsetWidth; t.classList.add(cls); setTimeout(()=>t.classList.remove('pet','pop'),700); }
function sceneStars(){ const pos=[[16,20],[38,12],[66,16],[82,28],[26,38],[58,32],[74,46]]; return pos.map(([l,t])=>`<span class="scene-star" style="left:${l}%;top:${t}%;animation-delay:${((l%5)*0.4).toFixed(1)}s"></span>`).join(''); }
function sceneMotes(){ const pos=[[28,66],[46,74],[62,62],[72,80],[34,84],[56,88]]; return pos.map(([l,t],k)=>`<span class="mote" style="left:${l}%;top:${t}%;animation-delay:${(k*2.7).toFixed(1)}s"></span>`).join(''); }
function drawWolfScene(idOrEl,i){ const el=typeof idOrEl==='string'?document.getElementById(idOrEl):idOrEl; if(!el)return; const src=wolfImg(i); const key='s:'+src;
  if(el.dataset.w!==key){ el.dataset.w=key; el.innerHTML=`<div class="scene"><div class="scene-moon"></div>${sceneStars()}${sceneMotes()}<div class="scene-ridge back"></div><div class="scene-ridge"></div><div class="scene-ground"></div><img class="wolf-cut" src="${src}" alt="Lupo"></div>`; }
  const sc=el.querySelector('.scene'); if(sc){ sc.dataset.tod=todBucket(); if(state&&state.pet&&state.pet.mood) sc.dataset.mood=state.pet.mood; } }
function petWolf(){
  celebrateWolf('wolfHome'); haptic(14); if(window.Sound) Sound.tap();
  sparkBurst(document.querySelector('#wolfHome .wolf-cut'));
  if(reduceMotion()) return;
  const card=document.querySelector('.wolf-card'); if(!card) return;
  const glyphs=['♥','✦','★','♥'];
  for(let i=0;i<4;i++){ const h=document.createElement('div'); h.className='pet-heart'; h.textContent=glyphs[i];
    h.style.left=(36+Math.random()*28)+'%'; h.style.animationDelay=(i*60)+'ms'; card.appendChild(h);
    setTimeout(()=>h.remove(),1200); }
}

function switchScreen(name){
  SCREENS.forEach(s => screens[s].hidden = (s!==name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen===name));
  haptic(8);
  RENDER[name]();
  playEnter(screens[name]);
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchScreen(t.dataset.screen)));

// real-world time of day shifts the sky tint (stays in the navy family)
function todBucket(){ const h=new Date().getHours(); if(h<5)return'night'; if(h<8)return'dawn'; if(h<17)return'day'; if(h<20)return'dusk'; return'night'; }
// progress-to-next-tier helper
function tierProgress(){
  const lvl = levelOf(), idx = tierIdx(lvl), cur = TIERS[idx], next = TIERS[idx+1];
  if(!next) return { idx, cur, next:null, frac:1, daysLeft:0 };
  return { idx, cur, next, frac:(lvl-cur.at)/(next.at-cur.at), daysLeft:next.at-lvl };
}

// ═══════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════
function fmtDate(d){ return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}); }
function renderHome(){
  const p = state.pet, lvl = levelOf(), tp = tierProgress(), b = band(lvl);
  document.getElementById('homeName').textContent = p.name.toUpperCase();
  document.getElementById('homeDate').textContent = fmtDate(new Date());
  document.getElementById('streakCount').textContent = p.currentStreak;
  { const sb=document.getElementById('streakBadge'); if(sb) sb.setAttribute('aria-label', p.currentStreak + ' day streak'); }
  document.getElementById('moodMsg').textContent = '"' + (STAGE_MOOD_MSG[b][p.mood] || '') + '"';
  renderTimerBanner('homeTimer');
  drawWolfScene('wolfHome', tierIdx(lvl));
  const hw=document.getElementById('wolfHome'); if(hw && !hw.dataset.pet){ hw.dataset.pet='1'; hw.style.cursor='pointer';
    hw.setAttribute('role','button'); hw.setAttribute('tabindex','0');
    hw.addEventListener('click', petWolf);
    hw.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){ e.preventDefault(); petWolf(); } }); }
  if(hw) hw.setAttribute('aria-label','Pet '+(p.name||'your wolf'));
  document.getElementById('stageLine').textContent = 'LV ' + displayLevel() + ' · ' + tp.cur.name.toUpperCase();
  document.getElementById('stageTag').textContent = BAND_TAG[b];

  animateNumber(document.getElementById('energyVal'), Math.round(p.energy*100), 700, '%');
  const ef = document.getElementById('energyFill'); requestAnimationFrame(()=> ef.style.width=(p.energy*100)+'%');

  if(!tp.next){
    document.getElementById('progressLabel').textContent = 'APEX FORM';
    document.getElementById('progressDays').textContent = 'LEGEND';
    requestAnimationFrame(()=> document.getElementById('progressFill').style.width='100%');
  }else{
    document.getElementById('progressLabel').textContent = 'NEXT: ' + tp.next.name.toUpperCase();
    document.getElementById('progressDays').textContent = tp.daysLeft + (tp.daysLeft===1?' DAY':' DAYS');
    const pf = document.getElementById('progressFill'); requestAnimationFrame(()=> pf.style.width=(tp.frac*100)+'%');
  }

  const entry = ensureLog(todayKey());
  const quick = document.getElementById('quickRow'); quick.innerHTML='';
  enabledHabits().slice(0,6).forEach(k=>{ const done=entry[k]===true; const it=document.createElement('div'); it.className='quick-item';
    it.innerHTML=`<div class="quick-ico ${done?'done':''}">${HABITS[k].icon}</div><div class="quick-dot ${done?'done':''}"></div>`; quick.appendChild(it); });

  const cta = document.getElementById('homeCta');
  if(logAllEnabledDone(entry)){ cta.innerHTML = `<div class="cta-done">✓ All done today. ${esc(p.name)} grew stronger.</div>`; }
  else if(logAllRequiredDone(entry)){ cta.innerHTML = `<div class="cta-done partial">✓ ${esc(p.name)} is fed. Finish the rest for a full day.</div>`; }
  else { cta.innerHTML = `<button class="btn-primary cta-log" type="button">LOG TODAY</button>`; cta.querySelector('button').addEventListener('click',()=>switchScreen('habits')); }
}

// ═══════════════════════════════════════════════════════
//  HABITS
// ═══════════════════════════════════════════════════════
function renderHabits(){
  document.getElementById('habitsDate').textContent = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  renderTimerBanner('habitsTimer');
  const entry = ensureLog(todayKey());
  const list = document.getElementById('habitList'); list.innerHTML='';
  enabledHabits().forEach(k=>{
    const h=HABITS[k], done=entry[k]===true, isTimer=h.kind==='timer';
    const activeForThis = state.timer && state.timer.key===k;
    const card=document.createElement('div'); card.className='habit-card'+(done?' done':'')+(activeForThis?' running':'');
    let pill='';
    if(isTimer){
      if(activeForThis) pill=`<button class="timer-pill stop" data-act="cancel"><span data-timer-clock>${fmtClock(timerLeftMs())}</span></button>`;
      else pill=`<button class="timer-pill" data-act="start" ${done?'style="display:none"':''}>▶ Start</button>`;
    }
    card.innerHTML=`<div class="habit-card-ico">${h.icon}</div>
      <div class="habit-card-body"><div class="habit-card-name">${h.name}</div><div class="habit-card-target">${habitLabel(k)}</div>${h.auto?`<div class="habit-card-auto">${h.auto}</div>`:''}</div>
      ${pill}
      <div class="habit-check ${done?'checked':''}"><svg viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    ['.habit-card-body','.habit-card-ico','.habit-check'].forEach(sel=>{ const n=card.querySelector(sel); if(n) n.addEventListener('click',()=>toggleAndRefresh(k,card)); });
    const p=card.querySelector('.timer-pill');
    if(p) p.addEventListener('click',(ev)=>{ ev.stopPropagation();
      if(p.dataset.act==='start'){ if(state.timer && !confirm('Another timer is running. Replace it?')) return; startTimer(k); if(window.Sound) Sound.start(); }
      else cancelTimer();
      haptic(12); renderHabits();
    });
    list.appendChild(card);
  });
  stagger([...list.children]);
  updateHabitCompletion(true);
}
function toggleAndRefresh(k,card){
  const wasAll=logAllRequiredDone(ensureLog(todayKey()));
  toggleHabit(k);
  const e2=ensureLog(todayKey()), isDone=e2[k]===true, nowAll=logAllRequiredDone(e2);
  card.classList.toggle('done',isDone);
  const cb=card.querySelector('.habit-check'); if(cb) cb.classList.toggle('checked',isDone);
  if(isDone){ if(window.Sound) Sound.check(); sparkBurst(card.querySelector('.habit-check')); }
  const p=card.querySelector('.timer-pill'); if(p) p.style.display=isDone?'none':'';
  haptic(nowAll&&!wasAll?[12,40,18]:12);
  let leveled=false;
  if(nowAll&&!wasAll){ celebrateWolf('wolfHome'); leveled = maybeCreditToday(); }
  else if(!nowAll&&wasAll){ uncreditToday(); }
  if(!leveled) maybeDayComplete();
  updateHabitCompletion(false);
}
function renderTimerBanner(elId){
  const el=document.getElementById(elId); if(!el) return;
  if(!state.timer){ el.innerHTML=''; return; }
  const k=state.timer.key, h=HABITS[k], C=(2*Math.PI*26).toFixed(2);
  el.innerHTML=`<div class="timer-card">
    <svg class="timer-ring" viewBox="0 0 60 60"><circle class="ring-bg" cx="30" cy="30" r="26"/><circle class="ring-fg" cx="30" cy="30" r="26" data-timer-ring stroke-dasharray="${C}" stroke-dashoffset="${((1-timerFrac())*C).toFixed(2)}"/></svg>
    <div class="timer-info"><div class="timer-name">${h.icon} ${h.name}</div><div class="timer-clock"><span data-timer-clock>${fmtClock(timerLeftMs())}</span> left</div><div class="timer-sub">Keep your phone down. Your wolf is watching.</div></div>
    <button class="timer-stop" type="button">STOP</button>
  </div>`;
  el.querySelector('.timer-stop').addEventListener('click',()=>{ if(confirm('Give up this session? You get no credit.')){ cancelTimer(); haptic(10); renderTimerBanner(elId); if(!screens.habits.hidden) renderHabits(); } });
}
function updateHabitCompletion(initial){
  const entry=ensureLog(todayKey()), rate=logCompletionRate(entry);
  document.getElementById('completionPct').textContent=Math.round(rate*100)+'%';
  const fill=document.getElementById('completionFill');
  if(initial) requestAnimationFrame(()=> fill.style.width=(rate*100)+'%'); else fill.style.width=(rate*100)+'%';
  document.getElementById('successBanner').hidden=!logAllEnabledDone(entry);
}
document.getElementById('saveBtn').addEventListener('click',()=>{ save(); const b=document.getElementById('saveBtn'); const o=b.textContent; b.textContent='SAVED ✓'; haptic(12); setTimeout(()=>b.textContent=o,1200); });

// ═══════════════════════════════════════════════════════
//  JOURNEY
// ═══════════════════════════════════════════════════════
function renderJourney(){
  const lvl=levelOf(), tp=tierProgress();
  document.getElementById('journeySub').textContent='DAY '+state.pet.totalDaysTracked+' · '+TIERS.length+' FORMS TO MASTER';
  drawWolfScene('wolfJourney', tierIdx(lvl));
  document.getElementById('journeyLevel').textContent='LV '+displayLevel();
  document.getElementById('journeyTier').textContent=tp.cur.name.toUpperCase();
  if(!tp.next){ document.getElementById('journeyNextLabel').textContent='APEX FORM REACHED';
    document.getElementById('journeyNextVal').textContent='LEGEND';
    requestAnimationFrame(()=> document.getElementById('journeyFill').style.width='100%');
  }else{ document.getElementById('journeyNextLabel').textContent='NEXT: '+tp.next.name.toUpperCase();
    document.getElementById('journeyNextVal').textContent=tp.daysLeft+'d';
    requestAnimationFrame(()=> document.getElementById('journeyFill').style.width=(tp.frac*100)+'%');
  }
  const list=document.getElementById('tierList'); list.innerHTML=''; list.classList.add('path'); list.setAttribute('role','list');
  TIERS.forEach((t,i)=>{
    const reached=lvl>=t.at, current=i===tp.idx;
    const row=document.createElement('div'); row.className='path-row '+(i%2?'right':'left'); row.setAttribute('role','listitem');
    const cls='path-node'+(current?' current':'')+(reached?' reached':' locked');
    const aria=t.name+(reached?', unlocked':', locked, unlocks at level '+(t.at+1))+(current?', current form':'');
    row.innerHTML=`<div class="${cls}" role="group" aria-label="${aria}">
        ${current?'<span class="node-you">YOU</span>':''}
        <div class="node-disc"><div class="node-wolf"></div>${reached?'':'<div class="node-lock" aria-hidden="true">🔒</div>'}</div>
        <div class="node-name">${t.name}</div>
        <div class="node-lvl">${reached?'UNLOCKED':'LV '+(t.at+1)}</div>
      </div>`;
    list.appendChild(row);
    drawWolf(row.querySelector('.node-wolf'), i);
    row.querySelector('.node-wolf').style.opacity = reached?'1':'0.5';
  });
  stagger([...list.children]);
}

// ═══════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════
// a day "has data" only once at least one habit was actually completed; an untouched (all-false) today does not count
function dayHasData(k){ const e=state.logs[k]; return !!e && logKeys(e).some(h=>e[h]===true); }
// average completion over days with real data; an untouched today is excluded so a perfect record never drops at midnight. null = nothing to show yet.
function overallCompletion(){
  const tk=todayKey();
  const keys=Object.keys(state.logs).filter(k=>{ const e=state.logs[k]; if(!logKeys(e).length) return false; if(k===tk && logCompletionRate(e)===0) return false; return true; });
  if(!keys.length) return null;
  return keys.reduce((a,k)=>a+logCompletionRate(state.logs[k]),0)/keys.length;
}
function renderStats(){
  const p=state.pet, oc=overallCompletion(), lvl=levelOf(), tp=tierProgress();
  const grid=document.getElementById('statGrid');
  const compTo = oc===null ? '—' : Math.round(oc*100);
  const cards=[
    {ico:'📅',label:'TOTAL DAYS',to:p.totalDaysTracked,suffix:'',color:'#fff'},
    {ico:'🔥',label:'STREAK',to:p.currentStreak,suffix:'',color:'#F5A623'},
    {ico:'⭐',label:'LEVEL',to:displayLevel(),suffix:'',sub:tp.cur.name.toUpperCase(),color:'#F5A623'},
    {ico:'✓',label:'COMPLETION',to:compTo,suffix:(oc===null?'':'%'),color:(oc!==null&&oc>0.7)?'#22C55E':'#F5A623'},
  ];
  grid.innerHTML=cards.map(c=>`<div class="stat-card"><div class="stat-card-head"><span class="stat-card-ico">${c.ico}</span><span class="stat-card-label">${c.label}</span></div><div class="stat-card-val" data-to="${c.to}" data-suffix="${c.suffix}" style="color:${c.color}">${Number.isFinite(+c.to)?'0'+c.suffix:c.to}</div>${c.sub?`<div class="stat-card-sub">${c.sub}</div>`:''}</div>`).join('');
  stagger([...grid.children]);
  grid.querySelectorAll('.stat-card-val').forEach((el,i)=>{ const to=+el.dataset.to; if(Number.isFinite(to)) animateNumber(el,to,700+i*70,el.dataset.suffix); else el.textContent=el.dataset.to; });

  const hm=document.getElementById('heatmap'); hm.innerHTML='';
  for(let off=13;off>=0;off--){ const d=addDays(startOfDay(new Date()),-off); const isToday=off===0; const e=state.logs[dateKey(d)]; let color='var(--card3)';
    if(e){ if(logAllRequiredDone(e))color='rgba(34,197,94,0.75)'; else if(logCompletionRate(e)>0)color='rgba(245,166,35,0.6)'; else if(!isToday)color='rgba(239,68,68,0.5)'; } // today is never marked failed before it's over
    const c=document.createElement('div'); c.className='heat-cell'; c.innerHTML=`<div class="heat-sq${isToday?' today':''}" style="background:${color}"></div><div class="heat-d">${d.getDate()}</div>`; hm.appendChild(c); }
  hm.querySelectorAll('.heat-sq').forEach((sq,i)=>setTimeout(()=>sq.classList.add('show'),i*35+50));

  const wl=document.getElementById('weekList'); wl.innerHTML=''; const eh=enabledHabits();
  const everCompleted=Object.keys(state.logs).some(dayHasData);
  if(!everCompleted){
    wl.innerHTML=`<div class="week-empty">No history yet. Feed ${esc(p.name)} today and your streak starts right here.</div>`;
    return;
  }
  const created=startOfDay(new Date(state.pet.createdDate||state.pet.lastUpdated||Date.now()));
  for(let off=6;off>=0;off--){ const d=addDays(startOfDay(new Date()),-off); if(d<created) continue; // wolf didn't exist yet
    const isToday=dateKey(d)===todayKey(); const e=state.logs[dateKey(d)];
    const lbl=d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase(); const row=document.createElement('div'); row.className='week-row';
    if(!e){ row.innerHTML=`<div class="week-day">${lbl}</div><div class="week-none">NO DATA</div>`; }
    else{ const dots=eh.map(k=>`<div class="week-dot" style="background:${e[k]?'var(--success)':'var(--gray3)'}"></div>`).join('');
      const mark=logAllRequiredDone(e)?'✅':(isToday?'·':'❌');
      row.innerHTML=`<div class="week-day">${lbl}</div><div class="week-dots">${dots}</div><div class="week-end">${mark}</div>`; }
    wl.appendChild(row); }
}

// ═══════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════
const ART_LABELS=['Pup','Yearling','Scout','Hunter','Alpha'];
function renderProfile(){
  document.getElementById('renameInput').value = state.pet.name;
  const as=document.getElementById('artSlots');
  if(as){ as.innerHTML='';
    for(let b=0;b<5;b++){ const art=state.wolfArt && state.wolfArt[b];
      const slot=document.createElement('label'); slot.className='art-slot'+(art?' filled':'');
      slot.innerHTML=(art?`<img src="${art}" alt="">`:`<div class="as-plus">+</div>`)+`<div class="as-lbl">${ART_LABELS[b].toUpperCase()}</div><input type="file" accept="image/*" hidden>`;
      slot.querySelector('input').addEventListener('change',e=>{ const f=e.target.files&&e.target.files[0]; if(f) handleWolfUpload(f,b); });
      as.appendChild(slot);
    }
  }
  const ml=document.getElementById('manageList'); ml.innerHTML='';
  HABIT_ORDER.forEach(k=>{
    const h=HABITS[k], on=state.habits[k].enabled, locked=h.required;
    const row=document.createElement('div'); row.className='manage-row';
    row.innerHTML=`<div class="manage-top">
        <div class="manage-ico">${h.icon}</div>
        <div class="manage-name">${h.name}${locked?' <span class="lock-tag">REQUIRED</span>':''}</div>
        <button class="switch ${on?'on':''}" ${locked?'disabled':''} aria-pressed="${on}" aria-label="${h.name}${locked?' (required, always on)':''}"></button>
      </div>
      ${h.kind==='check'
        ? `<div class="manage-bot"><div class="manage-target">Check it off each day</div></div>`
        : `<div class="manage-bot">
        <div class="manage-target">${h.kind==='limit'?'Goal · under ':'Goal · '}${targetShort(k)}</div>
        <div class="stepper"><button class="step-btn" data-d="-1" type="button">–</button><span class="step-val">${targetShort(k)}</span><button class="step-btn" data-d="1" type="button">+</button></div>
      </div>`}`;
    row.querySelectorAll('.step-btn').forEach(b=> b.addEventListener('click',()=>{ adjustTarget(k,+b.dataset.d); haptic(8); renderProfile(); }));
    if(!locked) row.querySelector('.switch').addEventListener('click',()=>{ state.habits[k].enabled=!state.habits[k].enabled; ensureLog(todayKey()); save(); haptic(10); renderProfile(); });
    ml.appendChild(row);
  });
  { const bt=document.getElementById('buildTag'); if(bt) bt.textContent='build '+BUILD; }
  const rt=document.getElementById('reminderToggle'); rt.classList.toggle('on',!!state.reminders); rt.setAttribute('aria-pressed',!!state.reminders);
  const st=document.getElementById('soundToggle'); if(st){ st.classList.toggle('on',!!state.sound); st.setAttribute('aria-pressed',!!state.sound); }
}
document.getElementById('soundToggle').addEventListener('click',()=>{ state.sound=!state.sound; if(window.Sound) Sound.on(state.sound); save(); haptic(10); if(state.sound && window.Sound) Sound.tap(); renderProfile(); });
document.getElementById('clearArtBtn').addEventListener('click',()=>{ state.wolfArt={}; saveArt(); haptic(10); renderProfile(); });
document.getElementById('renameBtn').addEventListener('click',()=>{ const v=document.getElementById('renameInput').value.trim()||'Lupo'; state.pet.name=v; save(); haptic(12); const b=document.getElementById('renameBtn'); b.textContent='SAVED'; setTimeout(()=>b.textContent='SAVE',1000); });
document.getElementById('reminderToggle').addEventListener('click',async()=>{
  haptic(10);
  if(!state.reminders){
    if(!('Notification' in window)){ const ios=/iphone|ipad|ipod/i.test(navigator.userAgent); alert(ios ? 'To get reminders on iPhone, add Lupo to your home screen first (tap Share, then Add to Home Screen), then open it from there.' : 'This browser does not support notifications.'); return; }
    let p = Notification.permission;
    if(p !== 'granted') { try { p = await Notification.requestPermission(); } catch(e){ p='denied'; } }
    if(p === 'granted'){
      state.reminders = true;
      try{ new Notification('Lupo', { body: (state.pet.name||'Your wolf') + ' will nudge you to keep your streak.', icon:'icon-192.png' }); }catch(e){}
      scheduleReminder();
    } else { alert('Allow notifications in your browser settings to turn on reminders.'); }
  } else {
    state.reminders = false;
    if(reminderTimer){ clearTimeout(reminderTimer); reminderTimer=null; }
  }
  save(); renderProfile();
});
// Local evening nudge that fires if the app is open and today is not complete yet.
let reminderTimer=null;
function scheduleReminder(){
  if(reminderTimer){ clearTimeout(reminderTimer); reminderTimer=null; }
  if(!state.reminders || !('Notification' in window) || Notification.permission!=='granted') return;
  const now=new Date(); const target=new Date(now.getFullYear(),now.getMonth(),now.getDate(),20,0,0);
  if(target<=now) target.setDate(target.getDate()+1);
  reminderTimer=setTimeout(()=>{
    if(state.reminders && !logAllRequiredDone(ensureLog(todayKey()))){
      try{ new Notification('Lupo', { body:(state.pet.name||'Your wolf')+" hasn't been fed today. Keep the streak alive.", icon:'icon-192.png' }); }catch(e){}
    }
    scheduleReminder();
  }, Math.min(target-now, 2147483000));
}
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('Reset ALL progress? Your wolf goes back to a newborn pup. This cannot be undone.')){
    localStorage.removeItem(STORE_KEY); localStorage.removeItem(ART_KEY); load(); startOnboarding();
  }
});

// ═══════════════════════════════════════════════════════
//  STAGE / FORM UP
// ═══════════════════════════════════════════════════════
function burstConfetti(host){
  if(reduceMotion()) return;
  const colors=['#F5A623','#FFCB45','#F3E9D8','#22C55E','#fff'];
  for(let i=0;i<30;i++){ const c=document.createElement('div'); c.className='confetti'; c.style.background=colors[i%colors.length]; host.appendChild(c);
    const ang=Math.random()*Math.PI*2, dist=80+Math.random()*170;
    c.animate([{transform:'translate(-50%,-50%) rotate(0)',opacity:1},{transform:`translate(${Math.cos(ang)*dist-50}%,${Math.sin(ang)*dist-50}%) rotate(${Math.random()*720-360}deg)`,opacity:0}],{duration:900+Math.random()*600,easing:'cubic-bezier(.2,.7,.3,1)'});
    setTimeout(()=>c.remove(),1600); }
}
// ── Accessible modal overlays (focus move + trap, Escape to close, background inert) ──
let _modalReturn=null;
const MODAL_LABEL={stageUp:'stageUpName',dayComplete:'dayCompleteMsg',tutorial:'tutTitle',streakUp:'streakUpTitle'};
function openModal(id){
  const m=document.getElementById(id); if(!m) return;
  m.hidden=false; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  if(MODAL_LABEL[id]) m.setAttribute('aria-labelledby',MODAL_LABEL[id]);
  const am=document.getElementById('appMain'); if(am && !am.hidden) am.setAttribute('aria-hidden','true');
  _modalReturn=document.activeElement;
  const f=m.querySelector('button, [href], input, [tabindex]'); if(f) setTimeout(()=>{ try{ f.focus(); }catch(e){} },30);
}
function closeModal(id){
  const m=document.getElementById(id); if(!m) return; m.hidden=true;
  const am=document.getElementById('appMain'); if(am) am.removeAttribute('aria-hidden');
  if(_modalReturn && _modalReturn.focus){ try{ _modalReturn.focus(); }catch(e){} } _modalReturn=null;
}
document.addEventListener('keydown',(e)=>{
  const open=document.querySelector('.stageup:not([hidden])'); if(!open) return;
  if(e.key==='Escape'){
    if(open.id==='tutorial'){ closeModal('tutorial'); if(state){ state.tutorialSeen=true; save(); } }
    else closeModal(open.id);
    haptic(10); return;
  }
  if(e.key==='Tab'){
    const f=[...open.querySelectorAll('button, [href], input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && !el.hidden);
    if(!f.length) return; const first=f[0], last=f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
});
function showStageUp(){
  const lvl=levelOf(), idx=tierIdx(lvl);
  document.querySelector('.stageup-kicker').textContent='NEW FORM';
  document.getElementById('stageUpName').textContent=TIERS[idx].name.toUpperCase();
  document.getElementById('stageUpTag').textContent=BAND_TAG[band(lvl)];
  drawWolfScene('wolfStageUp', tierIdx(lvl));
  openModal('stageUp');
  haptic([18,60,30,60,40]); if(window.Sound) Sound.level(); celebrateWolf('wolfStageUp');
  if(!reduceMotion()){ const su=document.getElementById('stageUp'); if(su){ const bl=document.createElement('div'); bl.className='su-bloom'; su.appendChild(bl); setTimeout(()=>bl.remove(),950); } }
  setTimeout(()=>burstConfetti(document.querySelector('.stageup-inner')),200);
}
document.getElementById('stageUpBtn').addEventListener('click',()=>{ closeModal('stageUp'); haptic(10); });

// ── Day complete "good job" ──
function maybeDayComplete(){
  if(logAllEnabledDone(ensureLog(todayKey())) && state.lastCelebratedDay!==todayKey()){
    state.lastCelebratedDay=todayKey(); save(); showDayComplete(); return true;
  }
  return false;
}
function showDayComplete(){
  document.getElementById('dayCompleteSub').textContent = state.pet.name + " grew stronger today. Come back tomorrow and keep the streak alive.";
  openModal('dayComplete');
  haptic([14,50,24,50,30]); if(window.Sound) Sound.day();
  setTimeout(()=>burstConfetti(document.querySelector('#dayComplete .stageup-inner')),150);
}
document.getElementById('dayCompleteBtn').addEventListener('click',()=>{ closeModal('dayComplete'); haptic(10); });

// ── Streak milestones (the streak is the whole game, so big days get their own moment) ──
const STREAK_MILESTONES=[3,7,14,30,60,100,180,365];
function streakLine(n){
  if(n>=365) return 'A full year. You became someone else doing this.';
  if(n>=180) return 'Half a year of showing up. Relentless.';
  if(n>=100) return 'One hundred days. This is legendary.';
  if(n>=60) return 'Sixty days straight. Unbreakable.';
  if(n>=30) return 'Thirty days. This is just who you are now.';
  if(n>=14) return 'Two weeks locked in. The habit is yours.';
  if(n>=7) return 'A full week. Lupo trusts you now.';
  return 'Three days in a row. The chain is forming.';
}
function showStreakMilestone(n){
  document.getElementById('streakUpNum').textContent=n;
  document.getElementById('streakUpTitle').textContent = (n===1?'DAY STREAK':'DAY STREAK');
  document.getElementById('streakUpSub').textContent = streakLine(n);
  openModal('streakUp');
  haptic([16,55,28,55,34]); if(window.Sound) Sound.day();
  if(!reduceMotion()){ const su=document.getElementById('streakUp'); if(su){ const bl=document.createElement('div'); bl.className='su-bloom'; su.appendChild(bl); setTimeout(()=>bl.remove(),950); } }
  setTimeout(()=>burstConfetti(document.querySelector('#streakUp .stageup-inner')),160);
}
document.getElementById('streakUpBtn').addEventListener('click',()=>{ closeModal('streakUp'); haptic(10); });

// ── First-run tutorial ──
const TUT=[
  {i:0, t:'Meet your wolf.',        b:'Every day you keep your habits, he grows from a pup to full grown. Slip, and he regresses. He answers to you.'},
  {i:1, t:'Log your day.',          b:'In Habits, check things off or hit Start to run a timer for sleep, time off your phone, or workouts. Finish them to feed him.'},
  {i:3, t:'Watch him grow up.',     b:'Journey shows all five forms ahead, from Pup to Full Grown. Tiny gains daily. The streak is the whole game.'},
  {i:4, t:"Don't break the chain.", b:'Come back every single day. Miss too many and he fades. Ready?'},
];
let tutI=0;
function showTutorial(){ tutI=0; openModal('tutorial'); renderTut(); }
function renderTut(){
  const s=TUT[tutI];
  drawWolfScene('tutWolf', s.i);
  document.getElementById('tutStep').textContent=(tutI+1)+' / '+TUT.length;
  document.getElementById('tutTitle').textContent=s.t;
  document.getElementById('tutBody').textContent=s.b;
  document.getElementById('tutNext').textContent = tutI===TUT.length-1 ? "LET'S GO" : 'NEXT';
}
document.getElementById('tutNext').addEventListener('click',()=>{ haptic(10);
  if(tutI<TUT.length-1){ tutI++; renderTut(); }
  else { closeModal('tutorial'); state.tutorialSeen=true; save(); }
});

// ═══════════════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════════════
let obPage=0, obSelected=[];
function startOnboarding(){
  document.getElementById('appMain').hidden=true;
  document.getElementById('screen-onboarding').hidden=false;
  obPage=0; obSelected=[]; const hl=document.getElementById('obHabitList'); if(hl) delete hl.dataset.built;
  renderOnboarding(); drawWolfScene('wolfOnboard', 4);
}
function renderOnboarding(){
  document.querySelectorAll('.ob-page').forEach(p=>p.hidden=(+p.dataset.page!==obPage));
  document.querySelectorAll('.ob-dot').forEach(d=>d.classList.toggle('active',+d.dataset.d===obPage));
  const next=document.getElementById('obNext'); next.textContent=obPage===2?'BEGIN':'CONTINUE';
  if(obPage===1){ drawWolfScene('wolfName', 0); const empty=document.getElementById('petNameInput').value.trim().length===0; next.disabled=empty; const nh=document.getElementById('nameHint'); if(nh) nh.hidden=!empty; }
  else next.disabled=false;
  if(obPage===2 && !document.getElementById('obHabitList').dataset.built) buildHabitChooser();
}
function buildHabitChooser(){
  const list=document.getElementById('obHabitList'); list.dataset.built='1'; list.innerHTML='';
  HABIT_ORDER.forEach(k=>{ const h=HABITS[k], locked=h.required;
    const row=document.createElement('button'); row.type='button'; row.className='ob-habit'+(locked?' on locked':'');
    row.innerHTML=`<div class="ob-habit-ico">${h.icon}</div><div class="ob-habit-body"><div class="ob-habit-name">${h.name}</div><div class="ob-habit-desc">${habitLabel(k)}</div>${locked?'<div class="ob-lock">ALWAYS ON</div>':''}</div>
      <div class="ob-check"><svg viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    if(!locked) row.addEventListener('click',()=>{ const on=row.classList.toggle('on'); if(on)obSelected.push(k); else obSelected=obSelected.filter(x=>x!==k); haptic(8); });
    list.appendChild(row); });
}
document.getElementById('petNameInput').addEventListener('input',()=>{ const empty=document.getElementById('petNameInput').value.trim().length===0; document.getElementById('obNext').disabled=empty; const nh=document.getElementById('nameHint'); if(nh) nh.hidden=!empty; });
// Enter advances onboarding so the iOS keyboard never hides the CONTINUE button on the name step
document.getElementById('petNameInput').addEventListener('keydown',(e)=>{ if(e.key==='Enter' && obPage===1 && document.getElementById('petNameInput').value.trim()){ e.preventDefault(); document.getElementById('petNameInput').blur(); document.getElementById('obNext').click(); } });
document.getElementById('obSkip').addEventListener('click',()=>{ obPage=2; renderOnboarding(); });
document.getElementById('obNext').addEventListener('click',()=>{ haptic(10); if(obPage<2){ obPage++; renderOnboarding(); return; }
  completeOnboarding(document.getElementById('petNameInput').value.trim()||'Lupo', obSelected); });
function completeOnboarding(name, selected){
  state=defaultState(); state.onboarded=true; state.pet.name=name;
  HABIT_ORDER.forEach(k=>{ state.habits[k].enabled = HABITS[k].required || selected.includes(k); });
  state.pet.lastUpdated=new Date().toISOString(); state.pet.createdDate=new Date().toISOString();
  ensureLog(todayKey()); save(); haptic([12,50,20]); enterApp();
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
function enterApp(){
  document.getElementById('screen-onboarding').hidden=true;
  document.getElementById('appMain').hidden=false;
  switchScreen('home');
  if(pendingStageUp){ pendingStageUp=false; showStageUp(); }
  else if(!state.tutorialSeen){ showTutorial(); }
}
// the wolf fidgets on its own so it always feels alive
setInterval(()=>{ if(!state || document.hidden || screens.home.hidden || reduceMotion()) return; const cut=document.querySelector('#wolfHome .wolf-cut'); if(cut && Math.random()<0.6){ cut.classList.remove('pet'); void cut.offsetWidth; cut.classList.add('pet'); setTimeout(()=>cut.classList.remove('pet'),650); } }, 8000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && state && state.onboarded){
  const done=checkTimer(); checkForNewDay();
  if(done){ haptic(12); if(window.Sound) Sound.check(); celebrateWolf('wolfHome'); const leveled=maybeCreditToday(); if(!leveled) maybeDayComplete(); } // a timer that finished while the phone was locked still credits + celebrates on resume
  if(state.reminders) scheduleReminder();
  if(!screens.habits.hidden) renderHabits();
  if(!screens.home.hidden) renderHome();
  if(pendingStageUp && !document.querySelector('.stageup:not([hidden])')){ pendingStageUp=false; showStageUp(); }
} });
function boot(){ load(); if(window.Sound) Sound.on(state.sound); startTick();
  if(!state.onboarded){ startOnboarding(); }
  else { checkTimer(); checkForNewDay(); if(state.reminders) scheduleReminder(); enterApp(); } }
window.addEventListener('load', boot);
