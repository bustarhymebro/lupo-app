// ═══════════════════════════════════════════════════════
//  LUPO — endless-growth habit app (web PWA)
// ═══════════════════════════════════════════════════════
'use strict';

// ── Growth model ──
const TIERS = [
  {at:0,name:'Newborn Pup'},{at:3,name:'Pup'},{at:7,name:'Whelp'},{at:12,name:'Yearling'},
  {at:18,name:'Scout'},{at:25,name:'Tracker'},{at:33,name:'Prowler'},{at:42,name:'Hunter'},
  {at:55,name:'Lone Wolf'},{at:70,name:'Pack Wolf'},{at:88,name:'Warrior'},{at:108,name:'Sentinel'},
  {at:130,name:'Elder'},{at:155,name:'Alpha'},{at:185,name:'Spirit Wolf'},{at:220,name:'Legend'},
];
function tierIdx(lvl){ let i=0; for(let k=0;k<TIERS.length;k++){ if(lvl>=TIERS[k].at) i=k; } return i; }

// 5 maturity bands drive mood flavor (reuse of the original tone)
const BAND_TAG = [
  'Fragile. Watching. Waiting for you to prove yourself.',
  "Eyes open. The pack awaits — if you're worthy.",
  'Testing his strength. Testing yours.',
  "Power building. Discipline sharpening. Don't stop now.",
  'He runs with no pack but the one he chose. You built this.',
];
const STAGE_MOOD_MSG = {
  0:{thriving:"You're keeping up. Don't let it slip.",good:"Decent start. He's watching you.",neutral:"Barely enough. He expects more.",disappointed:"You're already falling short.",struggling:"You're failing a pup who can't fight back yet."},
  1:{thriving:"He's starting to trust your discipline.",good:"Not bad. Keep the streak alive.",neutral:"He can feel your inconsistency.",disappointed:"He's losing faith in you.",struggling:"He whimpers when you don't show up."},
  2:{thriving:"He stands taller every time you follow through.",good:"Solid. He respects your consistency.",neutral:"You're coasting. He notices.",disappointed:"Weak days make a weak wolf.",struggling:"He's regressing because you are."},
  3:{thriving:"Raw power. Earned by real work.",good:"He runs harder when you push harder.",neutral:"This close to greatness — and you're phoning it in.",disappointed:"Don't waste what you built.",struggling:"A wolf this far along doesn't have to fall. You chose this."},
  4:{thriving:"This is what discipline looks like. Own it.",good:"He howls on your schedule. Keep it.",neutral:"A wolf this powerful deserves better habits than this.",disappointed:"You've come too far to go soft.",struggling:"He remembers every day you didn't show up."},
};
// maturity spans the full 0..1 morph across all named forms, so every tier looks distinct
function maturityAtLevel(lvl){ const i=tierIdx(lvl), nx=TIERS[i+1]; if(!nx) return 1; const f=(lvl-TIERS[i].at)/(nx.at-TIERS[i].at); return Math.min(1,(i+f)/(TIERS.length-1)); }
function maturityAtTier(i){ return i/(TIERS.length-1); }
const band = (lvl) => Math.min(Math.floor(maturityAtLevel(lvl) * 5), 4);

// ── Habits ──
// kind: 'limit' (stay under, manual confirm) | 'timer' (run a countdown) | 'check' (manual)
function fmtT(t,u){ if(u==='h'){ const w=Math.floor(t),m=Math.round((t-w)*60); return (w?w+'h':'')+(m?(w?' ':'')+m+'m':(w?'':'0m')); } return t+' min'; }
const HABITS = {
  screenTime:{ name:'Screen Time',      icon:'📵', required:true,  kind:'limit', def:3,  unit:'h', min:1,   max:8,   step:0.5, auto:'Auto-verified in the iOS app', label:t=>`Stay under ${fmtT(t,'h')}` },
  sleep:     { name:'Sleep',            icon:'🌙', required:false, kind:'timer', def:8,  unit:'h', min:4,   max:12,  step:0.5, label:t=>`${fmtT(t,'h')} of sleep` },
  focus:     { name:'Focus · Off Phone',icon:'🧠', required:false, kind:'timer', def:2,  unit:'h', min:0.5, max:8,   step:0.5, label:t=>`${fmtT(t,'h')} off your phone` },
  workout:   { name:'Workout',          icon:'💪', required:false, kind:'timer', def:30, unit:'m', min:10,  max:120, step:5,   label:t=>`${fmtT(t,'m')} active` },
  read:      { name:'Read',             icon:'📖', required:false, kind:'timer', def:20, unit:'m', min:5,   max:120, step:5,   label:t=>`${fmtT(t,'m')} reading` },
  water:     { name:'Hydrate',          icon:'💧', required:false, kind:'check', def:8,  unit:'cups', min:1, max:16, step:1,   label:t=>`${t} cups` },
};
const HABIT_ORDER = ['screenTime','sleep','focus','workout','read','water'];
function habitTarget(k){ const h=state.habits[k]; return (h && h.target!=null) ? h.target : HABITS[k].def; }
function habitLabel(k){ return HABITS[k].label(habitTarget(k)); }
function targetMs(k){ const t=habitTarget(k); return HABITS[k].unit==='h' ? t*3600000 : t*60000; }
function targetShort(k){ const t=habitTarget(k),u=HABITS[k].unit; return u==='cups'? t+' cups' : fmtT(t,u); }
function adjustTarget(k,d){ const h=HABITS[k]; let t=habitTarget(k)+d*h.step; t=Math.round(t/h.step*1e6)/1e6; t=Math.max(h.min,Math.min(h.max,t)); state.habits[k].target=t; save(); }

// ── State ──
const STORE_KEY = 'lupo.v2';
let state = null;
let pendingStageUp = false;

function defaultState(){
  return {
    onboarded:false,
    reminders:false,
    tutorialSeen:false,
    lastCelebratedDay:null,
    pet:{ name:'Lupo', stage:0, tierIdx:0, energy:0.5, mood:'neutral',
          consistentDays:0, totalDaysTracked:0,
          createdDate:new Date().toISOString(), lastUpdated:new Date().toISOString(),
          missedDaysStreak:0 },
    timer:null,
    habits:{ screenTime:{enabled:true,target:3}, sleep:{enabled:false,target:8}, focus:{enabled:false,target:2},
             workout:{enabled:false,target:30}, read:{enabled:false,target:20}, water:{enabled:false,target:8} },
    logs:{},
  };
}
function load(){
  try{ const raw = localStorage.getItem(STORE_KEY); state = raw ? JSON.parse(raw) : defaultState(); }
  catch(e){ state = defaultState(); }
  if(!state.logs) state.logs = {};
  if(!state.habits) state.habits = defaultState().habits;
  HABIT_ORDER.forEach(k => { if(!state.habits[k]) state.habits[k] = {enabled:false}; if(state.habits[k].target==null) state.habits[k].target = HABITS[k].def; });
  if(state.timer === undefined) state.timer = null;
  if(state.tutorialSeen === undefined) state.tutorialSeen = false;
  if(state.lastCelebratedDay === undefined) state.lastCelebratedDay = null;
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// ── Dates ──
function dateKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function addDays(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
function todayKey(){ return dateKey(new Date()); }

// ── Habit helpers ──
function enabledHabits(){ return HABIT_ORDER.filter(k => state.habits[k].enabled); }
function ensureLog(key){
  if(!state.logs[key]){ const e={}; enabledHabits().forEach(h=>e[h]=false); state.logs[key]=e; }
  enabledHabits().forEach(h=>{ if(!(h in state.logs[key])) state.logs[key][h]=false; });
  return state.logs[key];
}
function logAllRequiredDone(entry){
  if(!entry) return false;
  const req = enabledHabits().filter(k=>HABITS[k].required);
  if(req.length===0) return false;
  return req.every(k=>entry[k]===true);
}
function logCompletionRate(entry){
  const keys = enabledHabits(); if(keys.length===0) return 0;
  return keys.filter(k=>entry[k]===true).length / keys.length;
}
function logAllEnabledDone(entry){ const keys=enabledHabits(); return keys.length>0 && keys.every(k=>entry[k]===true); }

// ── Game logic ──
function moodForEnergy(e){ if(e>=0.75)return'thriving'; if(e>=0.5)return'good'; if(e>=0.35)return'neutral'; if(e>=0.2)return'disappointed'; return'struggling'; }
const levelOf = () => state.pet.consistentDays;

function checkForNewDay(){
  if(!state.onboarded) return;
  const today = startOfDay(new Date());
  let cursor = startOfDay(new Date(state.pet.lastUpdated));
  if(cursor >= today) return;
  const prevTier = state.pet.tierIdx;
  while(cursor < today){
    const entry = state.logs[dateKey(cursor)];
    const success = logAllRequiredDone(entry);
    state.pet.totalDaysTracked += 1;
    if(success){
      state.pet.consistentDays += 1;
      state.pet.missedDaysStreak = 0;
      state.pet.energy = Math.min(1, state.pet.energy + 0.2);
    }else{
      state.pet.missedDaysStreak += 1;
      state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 1);
      state.pet.energy = Math.max(0, state.pet.energy - 0.15);
      if(state.pet.missedDaysStreak >= 3) state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 2);
    }
    cursor = addDays(cursor,1);
  }
  state.pet.mood = moodForEnergy(state.pet.energy);
  state.pet.stage = band(levelOf());
  state.pet.tierIdx = tierIdx(levelOf());
  state.pet.lastUpdated = new Date().toISOString();
  ensureLog(todayKey());
  if(state.pet.tierIdx > prevTier) pendingStageUp = true;
  save();
}
function toggleHabit(k){ const e=ensureLog(todayKey()); e[k]=!e[k]; state.pet.mood=moodForEnergy(state.pet.energy); save(); }

// ── Timer (Forest-style countdown; persists via timestamps) ──
function startTimer(k){ state.timer={key:k,start:Date.now(),dur:targetMs(k)}; save(); }
function cancelTimer(){ state.timer=null; save(); }
function timerLeftMs(){ if(!state.timer) return 0; return Math.max(0, state.timer.dur-(Date.now()-state.timer.start)); }
function timerFrac(){ if(!state.timer) return 0; return Math.min(1,(Date.now()-state.timer.start)/state.timer.dur); }
function checkTimer(){ if(state.timer && timerLeftMs()<=0){ const k=state.timer.key; ensureLog(todayKey())[k]=true; state.timer=null; state.pet.mood=moodForEnergy(state.pet.energy); save(); return k; } return null; }
function fmtClock(ms){ const s=Math.max(0,Math.ceil(ms/1000)); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return (h?h+':'+String(m).padStart(2,'0'):String(m))+':'+String(sec).padStart(2,'0'); }
let tickStarted=false;
function startTick(){ if(tickStarted) return; tickStarted=true; setInterval(()=>{
  if(!state || !state.timer) return;
  const done=checkTimer();
  if(done){ haptic([12,40,18]); celebrateWolf('wolfHome'); if(!screens.habits.hidden) renderHabits(); if(!screens.home.hidden) renderHome(); maybeDayComplete(); return; }
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
function animateNumber(el,to,dur,suffix){ suffix=suffix||''; dur=dur||700; const s=performance.now();
  (function tick(now){ const p=Math.min(1,(now-s)/dur); el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suffix; if(p<1)requestAnimationFrame(tick); })(performance.now()); }
function setWolf(id,m){ LupoWolf.renderWolf(id,m); }
function celebrateWolf(id){ const el=document.getElementById(id); if(!el)return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(()=>el.classList.remove('pop'),700); }

function switchScreen(name){
  SCREENS.forEach(s => screens[s].hidden = (s!==name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen===name));
  haptic(8);
  RENDER[name]();
  playEnter(screens[name]);
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchScreen(t.dataset.screen)));

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
  document.getElementById('streakCount').textContent = lvl;
  document.getElementById('moodMsg').textContent = '"' + (STAGE_MOOD_MSG[b][p.mood] || '') + '"';
  renderTimerBanner('homeTimer');
  setWolf('wolfHome', maturityAtLevel(lvl));
  document.getElementById('stageLine').textContent = 'LV ' + lvl + ' · ' + tp.cur.name.toUpperCase();
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
  enabledHabits().slice(0,5).forEach(k=>{ const done=entry[k]===true; const it=document.createElement('div'); it.className='quick-item';
    it.innerHTML=`<div class="quick-ico ${done?'done':''}">${HABITS[k].icon}</div><div class="quick-dot ${done?'done':''}"></div>`; quick.appendChild(it); });

  const cta = document.getElementById('homeCta');
  if(logAllRequiredDone(entry)){ cta.innerHTML = `<div class="cta-done">✓ All done today. ${p.name} grew a little.</div>`; }
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
      if(p.dataset.act==='start'){ if(state.timer && !confirm('Another timer is running. Replace it?')) return; startTimer(k); }
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
  const p=card.querySelector('.timer-pill'); if(p) p.style.display=isDone?'none':'';
  haptic(nowAll&&!wasAll?[12,40,18]:12);
  if(nowAll&&!wasAll) celebrateWolf('wolfHome');
  maybeDayComplete();
  updateHabitCompletion(false);
}
function renderTimerBanner(elId){
  const el=document.getElementById(elId); if(!el) return;
  if(!state.timer){ el.innerHTML=''; return; }
  const k=state.timer.key, h=HABITS[k], C=(2*Math.PI*26).toFixed(2);
  el.innerHTML=`<div class="timer-card">
    <svg class="timer-ring" viewBox="0 0 60 60"><circle class="ring-bg" cx="30" cy="30" r="26"/><circle class="ring-fg" cx="30" cy="30" r="26" data-timer-ring stroke-dasharray="${C}" stroke-dashoffset="${((1-timerFrac())*C).toFixed(2)}"/></svg>
    <div class="timer-info"><div class="timer-name">${h.icon} ${h.name}</div><div class="timer-clock"><span data-timer-clock>${fmtClock(timerLeftMs())}</span> left</div><div class="timer-sub">Keep your phone down — your wolf is watching.</div></div>
    <button class="timer-stop" type="button">STOP</button>
  </div>`;
  el.querySelector('.timer-stop').addEventListener('click',()=>{ if(confirm('Give up this session? You get no credit.')){ cancelTimer(); haptic(10); renderTimerBanner(elId); if(!screens.habits.hidden) renderHabits(); } });
}
function updateHabitCompletion(initial){
  const entry=ensureLog(todayKey()), rate=logCompletionRate(entry);
  document.getElementById('completionPct').textContent=Math.round(rate*100)+'%';
  const fill=document.getElementById('completionFill');
  if(initial) requestAnimationFrame(()=> fill.style.width=(rate*100)+'%'); else fill.style.width=(rate*100)+'%';
  document.getElementById('successBanner').hidden=!logAllRequiredDone(entry);
}
document.getElementById('saveBtn').addEventListener('click',()=>{ save(); const b=document.getElementById('saveBtn'); const o=b.textContent; b.textContent='SAVED ✓'; haptic(12); setTimeout(()=>b.textContent=o,1200); });

// ═══════════════════════════════════════════════════════
//  JOURNEY
// ═══════════════════════════════════════════════════════
function renderJourney(){
  const lvl=levelOf(), tp=tierProgress();
  document.getElementById('journeySub').textContent='DAY '+state.pet.totalDaysTracked+' · '+TIERS.length+' FORMS TO MASTER';
  setWolf('wolfJourney', maturityAtLevel(lvl));
  document.getElementById('journeyLevel').textContent='LV '+lvl;
  document.getElementById('journeyTier').textContent=tp.cur.name.toUpperCase();
  if(!tp.next){ document.getElementById('journeyNextLabel').textContent='APEX FORM REACHED';
    document.getElementById('journeyNextVal').textContent='LEGEND';
    requestAnimationFrame(()=> document.getElementById('journeyFill').style.width='100%');
  }else{ document.getElementById('journeyNextLabel').textContent='NEXT: '+tp.next.name.toUpperCase();
    document.getElementById('journeyNextVal').textContent=tp.daysLeft+'d';
    requestAnimationFrame(()=> document.getElementById('journeyFill').style.width=(tp.frac*100)+'%');
  }
  const list=document.getElementById('tierList'); list.innerHTML='';
  TIERS.forEach((t,i)=>{
    const reached=lvl>=t.at, current=i===tp.idx;
    const row=document.createElement('div'); row.className='tier-row'+(current?' current':'')+(reached?' reached':'');
    row.innerHTML=`<div class="tier-thumb"><div class="tier-wolf"></div></div>
      <div class="tier-info"><div class="tier-name">${t.name}</div><div class="tier-lvl">LV ${t.at}</div></div>
      <div class="tier-mark">${reached?'✓':'🔒'}</div>`;
    list.appendChild(row);
    LupoWolf.renderWolf(row.querySelector('.tier-wolf'), maturityAtTier(i));
    row.querySelector('.tier-wolf').style.opacity = reached?'1':'0.4';
  });
  stagger([...list.children]);
}

// ═══════════════════════════════════════════════════════
//  STATS
// ═══════════════════════════════════════════════════════
function overallCompletion(){ const keys=Object.keys(state.logs).filter(k=>k!==todayKey()); if(!keys.length)return 0;
  return keys.reduce((a,k)=>a+logCompletionRate(state.logs[k]),0)/keys.length; }
function renderStats(){
  const p=state.pet, oc=overallCompletion(), lvl=levelOf(), tp=tierProgress();
  const grid=document.getElementById('statGrid');
  const cards=[
    {ico:'📅',label:'TOTAL DAYS',to:p.totalDaysTracked,suffix:'',color:'#fff'},
    {ico:'🔥',label:'STREAK',to:lvl,suffix:'',color:'#F5A623'},
    {ico:'⭐',label:'LEVEL',to:lvl,suffix:'',sub:tp.cur.name.toUpperCase(),color:'#F5A623'},
    {ico:'✓',label:'COMPLETION',to:Math.round(oc*100),suffix:'%',color:oc>0.7?'#22C55E':'#F5A623'},
  ];
  grid.innerHTML=cards.map(c=>`<div class="stat-card"><div class="stat-card-head"><span class="stat-card-ico">${c.ico}</span><span class="stat-card-label">${c.label}</span></div><div class="stat-card-val" data-to="${c.to}" data-suffix="${c.suffix}" style="color:${c.color}">0${c.suffix}</div>${c.sub?`<div class="stat-card-sub">${c.sub}</div>`:''}</div>`).join('');
  stagger([...grid.children]);
  grid.querySelectorAll('.stat-card-val').forEach((el,i)=>animateNumber(el,+el.dataset.to,700+i*70,el.dataset.suffix));

  const hm=document.getElementById('heatmap'); hm.innerHTML='';
  for(let off=13;off>=0;off--){ const d=addDays(startOfDay(new Date()),-off); const e=state.logs[dateKey(d)]; let color='var(--card3)';
    if(e){ if(logAllRequiredDone(e))color='rgba(34,197,94,0.75)'; else if(logCompletionRate(e)>0)color='rgba(245,166,35,0.6)'; else color='rgba(239,68,68,0.5)'; }
    const c=document.createElement('div'); c.className='heat-cell'; c.innerHTML=`<div class="heat-sq" style="background:${color}"></div><div class="heat-d">${d.getDate()}</div>`; hm.appendChild(c); }
  hm.querySelectorAll('.heat-sq').forEach((sq,i)=>setTimeout(()=>sq.classList.add('show'),i*35+50));

  const wl=document.getElementById('weekList'); wl.innerHTML=''; const eh=enabledHabits();
  for(let off=6;off>=0;off--){ const d=addDays(startOfDay(new Date()),-off); const e=state.logs[dateKey(d)];
    const lbl=d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase(); const row=document.createElement('div'); row.className='week-row';
    if(!e){ row.innerHTML=`<div class="week-day">${lbl}</div><div class="week-none">— no data</div>`; }
    else{ const dots=eh.map(k=>`<div class="week-dot" style="background:${e[k]?'var(--success)':'var(--gray3)'}"></div>`).join('');
      row.innerHTML=`<div class="week-day">${lbl}</div><div class="week-dots">${dots}</div><div class="week-end">${logAllRequiredDone(e)?'✅':'❌'}</div>`; }
    wl.appendChild(row); }
}

// ═══════════════════════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════════════════════
function renderProfile(){
  document.getElementById('renameInput').value = state.pet.name;
  const ml=document.getElementById('manageList'); ml.innerHTML='';
  HABIT_ORDER.forEach(k=>{
    const h=HABITS[k], on=state.habits[k].enabled, locked=h.required;
    const row=document.createElement('div'); row.className='manage-row';
    row.innerHTML=`<div class="manage-top">
        <div class="manage-ico">${h.icon}</div>
        <div class="manage-name">${h.name}${locked?' <span class="lock-tag">REQUIRED</span>':''}</div>
        <button class="switch ${on?'on':''}" ${locked?'disabled':''} aria-pressed="${on}"></button>
      </div>
      <div class="manage-bot">
        <div class="manage-target">${h.kind==='limit'?'Goal · under ':'Goal · '}${targetShort(k)}</div>
        <div class="stepper"><button class="step-btn" data-d="-1" type="button">–</button><span class="step-val">${targetShort(k)}</span><button class="step-btn" data-d="1" type="button">+</button></div>
      </div>`;
    row.querySelectorAll('.step-btn').forEach(b=> b.addEventListener('click',()=>{ adjustTarget(k,+b.dataset.d); haptic(8); renderProfile(); }));
    if(!locked) row.querySelector('.switch').addEventListener('click',()=>{ state.habits[k].enabled=!state.habits[k].enabled; ensureLog(todayKey()); save(); haptic(10); renderProfile(); });
    ml.appendChild(row);
  });
  const rt=document.getElementById('reminderToggle'); rt.classList.toggle('on',!!state.reminders); rt.setAttribute('aria-pressed',!!state.reminders);
}
document.getElementById('renameBtn').addEventListener('click',()=>{ const v=document.getElementById('renameInput').value.trim()||'Lupo'; state.pet.name=v; save(); haptic(12); const b=document.getElementById('renameBtn'); b.textContent='SAVED'; setTimeout(()=>b.textContent='SAVE',1000); });
document.getElementById('reminderToggle').addEventListener('click',async()=>{
  if(!state.reminders){ if('Notification' in window){ try{ await Notification.requestPermission(); }catch(e){} } state.reminders=true; }
  else state.reminders=false;
  save(); haptic(10); renderProfile();
});
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('Reset ALL progress? Your wolf goes back to a newborn pup. This cannot be undone.')){
    localStorage.removeItem(STORE_KEY); load(); startOnboarding();
  }
});

// ═══════════════════════════════════════════════════════
//  STAGE / FORM UP
// ═══════════════════════════════════════════════════════
function burstConfetti(host){
  const colors=['#F5A623','#FFCB45','#F3E9D8','#22C55E','#fff'];
  for(let i=0;i<30;i++){ const c=document.createElement('div'); c.className='confetti'; c.style.background=colors[i%colors.length]; host.appendChild(c);
    const ang=Math.random()*Math.PI*2, dist=80+Math.random()*170;
    c.animate([{transform:'translate(-50%,-50%) rotate(0)',opacity:1},{transform:`translate(${Math.cos(ang)*dist-50}%,${Math.sin(ang)*dist-50}%) rotate(${Math.random()*720-360}deg)`,opacity:0}],{duration:900+Math.random()*600,easing:'cubic-bezier(.2,.7,.3,1)'});
    setTimeout(()=>c.remove(),1600); }
}
function showStageUp(){
  const lvl=levelOf(), idx=tierIdx(lvl);
  document.querySelector('.stageup-kicker').textContent='NEW FORM';
  document.getElementById('stageUpName').textContent=TIERS[idx].name.toUpperCase();
  document.getElementById('stageUpTag').textContent=BAND_TAG[band(lvl)];
  setWolf('wolfStageUp', maturityAtLevel(lvl));
  document.getElementById('stageUp').hidden=false;
  haptic([18,60,30,60,40]); celebrateWolf('wolfStageUp');
  setTimeout(()=>burstConfetti(document.querySelector('.stageup-inner')),200);
}
document.getElementById('stageUpBtn').addEventListener('click',()=>{ document.getElementById('stageUp').hidden=true; haptic(10); });

// ── Day complete "good job" ──
function maybeDayComplete(){
  if(logAllEnabledDone(ensureLog(todayKey())) && state.lastCelebratedDay!==todayKey()){
    state.lastCelebratedDay=todayKey(); save(); showDayComplete(); return true;
  }
  return false;
}
function showDayComplete(){
  document.getElementById('dayCompleteSub').textContent = state.pet.name + " grew today. Come back tomorrow — don't break the chain.";
  document.getElementById('dayComplete').hidden=false;
  haptic([14,50,24,50,30]);
  setTimeout(()=>burstConfetti(document.querySelector('#dayComplete .stageup-inner')),150);
}
document.getElementById('dayCompleteBtn').addEventListener('click',()=>{ document.getElementById('dayComplete').hidden=true; haptic(10); });

// ── First-run tutorial ──
const TUT=[
  {m:0.0, t:'Meet your wolf.',        b:'Every day you keep your habits, he grows — pup to legend. Slip, and he regresses. He answers to you.'},
  {m:0.18,t:'Log your day.',          b:'In Habits, check things off or hit Start to run a timer — sleep, time off your phone, workouts. Finish them to feed him.'},
  {m:0.62,t:'Watch him evolve.',      b:'Journey shows every form ahead. Tiny gains daily across hundreds of levels — the streak is the whole game.'},
  {m:1.0, t:"Don't break the chain.", b:'Come back every single day. Miss too many and he fades. Ready?'},
];
let tutI=0;
function showTutorial(){ tutI=0; document.getElementById('tutorial').hidden=false; renderTut(); }
function renderTut(){
  const s=TUT[tutI];
  LupoWolf.renderWolf('tutWolf', s.m);
  document.getElementById('tutStep').textContent=(tutI+1)+' / '+TUT.length;
  document.getElementById('tutTitle').textContent=s.t;
  document.getElementById('tutBody').textContent=s.b;
  document.getElementById('tutNext').textContent = tutI===TUT.length-1 ? "LET'S GO" : 'NEXT';
}
document.getElementById('tutNext').addEventListener('click',()=>{ haptic(10);
  if(tutI<TUT.length-1){ tutI++; renderTut(); }
  else { document.getElementById('tutorial').hidden=true; state.tutorialSeen=true; save(); }
});

// ═══════════════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════════════
let obPage=0, obSelected=[];
function startOnboarding(){
  document.getElementById('appMain').hidden=true;
  document.getElementById('screen-onboarding').hidden=false;
  obPage=0; obSelected=[]; const hl=document.getElementById('obHabitList'); if(hl) delete hl.dataset.built;
  renderOnboarding(); setWolf('wolfOnboard', 1);
}
function renderOnboarding(){
  document.querySelectorAll('.ob-page').forEach(p=>p.hidden=(+p.dataset.page!==obPage));
  document.querySelectorAll('.ob-dot').forEach(d=>d.classList.toggle('active',+d.dataset.d===obPage));
  const next=document.getElementById('obNext'); next.textContent=obPage===2?'BEGIN':'CONTINUE';
  if(obPage===1){ setWolf('wolfName', 0.3); next.disabled=document.getElementById('petNameInput').value.trim().length===0; }
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
document.getElementById('petNameInput').addEventListener('input',()=>{ document.getElementById('obNext').disabled=document.getElementById('petNameInput').value.trim().length===0; });
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
function boot(){ load(); startTick(); if(!state.onboarded) startOnboarding(); else { checkForNewDay(); checkTimer(); enterApp(); } }
window.addEventListener('load', boot);
