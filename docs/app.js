// ═══════════════════════════════════════════════════════
//  LUPO — app logic (ported from the Swift AppViewModel)
// ═══════════════════════════════════════════════════════
'use strict';

// ── Data: stages ──
const STAGES = [
  { key:'newbornPup', name:'Newborn Pup', days:0,
    tag:'Fragile. Watching. Waiting for you to prove yourself.' },
  { key:'youngPup', name:'Young Pup', days:7,
    tag:'Eyes open. The pack awaits — if you\'re worthy.' },
  { key:'adolescent', name:'Adolescent', days:14,
    tag:'Testing his strength. Testing yours.' },
  { key:'subAdult', name:'Sub-Adult', days:28,
    tag:'Power building. Discipline sharpening. Don\'t stop now.' },
  { key:'adultWolf', name:'Adult Wolf', days:42,
    tag:'He runs with no pack but the one he chose. You built this.' },
];

const STAGE_MOOD_MSG = {
  0:{thriving:"You're keeping up. Don't let it slip.",good:"Decent start. He's watching you.",neutral:"Barely enough. He expects more.",disappointed:"You're already falling short.",struggling:"You're failing a pup who can't fight back yet."},
  1:{thriving:"He's starting to trust your discipline.",good:"Not bad. Keep the streak alive.",neutral:"He can feel your inconsistency.",disappointed:"He's losing faith in you.",struggling:"He whimpers when you don't show up."},
  2:{thriving:"He stands taller every time you follow through.",good:"Solid. He respects your consistency.",neutral:"You're coasting. He notices.",disappointed:"Weak days make a weak wolf.",struggling:"He's regressing because you are."},
  3:{thriving:"Raw power. Earned by real work.",good:"He runs harder when you push harder.",neutral:"This close to greatness — and you're phoning it in.",disappointed:"Don't waste what you built.",struggling:"A wolf this far along doesn't have to fall. You chose this."},
  4:{thriving:"This is what discipline looks like. Own it.",good:"He howls on your schedule. Keep it.",neutral:"A wolf this powerful deserves better habits than this.",disappointed:"You've come too far to go soft.",struggling:"He remembers every day you didn't show up."},
};

const MOODS = {
  thriving:    { color:'#22C55E' },
  good:        { color:'#F5A623' },
  neutral:     { color:'#A0A0A0' },
  disappointed:{ color:'#EF4444' },
  struggling:  { color:'#7F1D1D' },
};

// ── Data: habits ──
const HABITS = {
  screenTime:{ name:'Screen Time', icon:'📵', target:3.0,  unit:'hrs', required:true,
               targetLabel:'Under 3 hrs', auto:'Tracked automatically on native app' },
  sleep:     { name:'Sleep',       icon:'🌙', target:7.5,  unit:'hrs', required:false,
               targetLabel:'7.5 hrs minimum' },
  workout:   { name:'Workout',     icon:'💪', target:30.0, unit:'min', required:false,
               targetLabel:'30 min active' },
  focus:     { name:'Focus',       icon:'🧠', target:2.0,  unit:'hrs', required:false,
               targetLabel:'2 hrs deep work' },
};
const HABIT_ORDER = ['screenTime','sleep','workout','focus'];

// ── State ──
const STORE_KEY = 'lupo.v1';
let state = null;

function defaultState(){
  return {
    onboarded:false,
    pet:{ name:'Lupo', stage:0, energy:0.5, mood:'neutral',
          consistentDays:0, totalDaysTracked:0,
          createdDate:new Date().toISOString(), lastUpdated:new Date().toISOString(),
          missedDaysStreak:0 },
    habits:{ screenTime:{enabled:true,target:3.0}, sleep:{enabled:false,target:7.5},
             workout:{enabled:false,target:30.0}, focus:{enabled:false,target:2.0} },
    logs:{}, // { 'YYYY-MM-DD': { screenTime:true, sleep:false, ... } }
  };
}

function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    state = raw ? JSON.parse(raw) : defaultState();
  }catch(e){ state = defaultState(); }
  if(!state.logs) state.logs = {};
}
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

// ── Date helpers (local) ──
function dateKey(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function startOfDay(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function addDays(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
function todayKey(){ return dateKey(new Date()); }

// ── Habit helpers ──
function enabledHabits(){ return HABIT_ORDER.filter(k => state.habits[k].enabled); }
function ensureLog(key){
  if(!state.logs[key]){
    const entry = {};
    enabledHabits().forEach(h => entry[h] = false);
    state.logs[key] = entry;
  }
  // make sure every currently-enabled habit exists in the entry
  enabledHabits().forEach(h => { if(!(h in state.logs[key])) state.logs[key][h] = false; });
  return state.logs[key];
}
function logAllRequiredDone(entry){
  if(!entry) return false;
  const req = enabledHabits().filter(k => HABITS[k].required);
  if(req.length === 0) return false;
  return req.every(k => entry[k] === true);
}
function logCompletionRate(entry){
  const keys = enabledHabits();
  if(keys.length === 0) return 0;
  const done = keys.filter(k => entry[k] === true).length;
  return done / keys.length;
}

// ── Game logic ──
function stageForDays(days){
  for(let i = STAGES.length - 1; i >= 0; i--){ if(days >= STAGES[i].days) return i; }
  return 0;
}
function moodForEnergy(e){
  if(e >= 0.75) return 'thriving';
  if(e >= 0.5)  return 'good';
  if(e >= 0.35) return 'neutral';
  if(e >= 0.2)  return 'disappointed';
  return 'struggling';
}
function progressToNextStage(){
  const s = state.pet.stage;
  if(s >= STAGES.length - 1) return 1;
  const cur = STAGES[s].days, nextReq = STAGES[s+1].days;
  const range = nextReq - cur;
  if(range <= 0) return 1;
  return Math.max(0, Math.min(1, (state.pet.consistentDays - cur) / range));
}
function daysUntilNextStage(){
  const s = state.pet.stage;
  if(s >= STAGES.length - 1) return null;
  return Math.max(0, STAGES[s+1].days - state.pet.consistentDays);
}

let pendingStageUp = false;

// Close out every day that fully elapsed since lastUpdated.
function checkForNewDay(){
  if(!state.onboarded) return;
  const today = startOfDay(new Date());
  let cursor = startOfDay(new Date(state.pet.lastUpdated));
  if(cursor >= today) return;

  const prevStage = state.pet.stage;

  while(cursor < today){
    const key = dateKey(cursor);
    const entry = state.logs[key];
    const success = logAllRequiredDone(entry);

    state.pet.totalDaysTracked += 1;
    if(success){
      state.pet.consistentDays += 1;
      state.pet.missedDaysStreak = 0;
      state.pet.energy = Math.min(1, state.pet.energy + 0.2);
      state.pet.stage = stageForDays(state.pet.consistentDays);
    }else{
      state.pet.missedDaysStreak += 1;
      state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 1);
      state.pet.energy = Math.max(0, state.pet.energy - 0.15);
      if(state.pet.missedDaysStreak >= 3 && state.pet.stage > 0){
        state.pet.stage -= 1;
        state.pet.consistentDays = Math.max(0, state.pet.consistentDays - 3);
      }
    }
    cursor = addDays(cursor, 1);
  }

  state.pet.mood = moodForEnergy(state.pet.energy);
  state.pet.lastUpdated = new Date().toISOString();
  ensureLog(todayKey());
  if(state.pet.stage > prevStage) pendingStageUp = true;
  save();
}

function toggleHabit(habitKey){
  const entry = ensureLog(todayKey());
  entry[habitKey] = !entry[habitKey];
  // energy nudges with same-day completion so the wolf reacts immediately
  state.pet.mood = moodForEnergy(state.pet.energy);
  save();
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
const screens = {
  home:   document.getElementById('screen-home'),
  habits: document.getElementById('screen-habits'),
  stats:  document.getElementById('screen-stats'),
};
let currentScreen = 'home';
const wolves = {}; // animated wolf controllers

function haptic(ms){ try{ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.isActive)) navigator.vibrate(ms); }catch(e){} }
function playEnter(el){ el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
function stagger(nodes, base){
  base = base || 0;
  nodes.forEach((k,i) => { k.classList.remove('rise'); k.style.animationDelay = (base + i*55) + 'ms'; void k.offsetWidth; k.classList.add('rise'); });
}
function animateNumber(el, to, dur, suffix){
  suffix = suffix || ''; dur = dur || 700;
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * eased) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function switchScreen(name){
  currentScreen = name;
  Object.entries(screens).forEach(([k,el]) => el.hidden = (k !== name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
  haptic(8);
  if(name === 'home') renderHome();
  if(name === 'habits') renderHabits();
  if(name === 'stats') renderStats();
  playEnter(screens[name]);
}
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => switchScreen(tab.dataset.screen));
});

// ═══════════════════════════════════════════════════════
//  RENDER: HOME
// ═══════════════════════════════════════════════════════
function fmtDate(d){
  return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
}
function renderHome(){
  const p = state.pet;
  document.getElementById('homeName').textContent = p.name.toUpperCase();
  document.getElementById('homeDate').textContent = fmtDate(new Date());
  document.getElementById('streakCount').textContent = p.consistentDays;

  document.getElementById('moodMsg').textContent =
    '"' + (STAGE_MOOD_MSG[p.stage][p.mood] || '') + '"';

  const hc = document.getElementById('wolfHome');
  if(!wolves.home) wolves.home = LupoWolf.mount(hc, p.stage, {mood:p.mood});
  else { wolves.home.setStage(p.stage); wolves.home.setMood(p.mood); }

  document.getElementById('stageLine').textContent =
    `STAGE ${p.stage} · ${STAGES[p.stage].name.toUpperCase()}`;
  document.getElementById('stageTag').textContent = STAGES[p.stage].tag;

  // energy
  animateNumber(document.getElementById('energyVal'), Math.round(p.energy*100), 700, '%');
  const ef = document.getElementById('energyFill');
  requestAnimationFrame(() => ef.style.width = (p.energy*100) + '%');

  // progress
  const block = document.getElementById('progressBlock');
  const left = daysUntilNextStage();
  if(left === null){
    document.getElementById('progressLabel').textContent = 'MAX STAGE REACHED';
    document.getElementById('progressDays').textContent = 'ADULT WOLF';
    document.getElementById('progressFill').style.width = '100%';
  }else{
    document.getElementById('progressLabel').textContent =
      'PROGRESS TO ' + STAGES[p.stage+1].name.toUpperCase();
    document.getElementById('progressDays').textContent = left + (left===1?' DAY LEFT':' DAYS LEFT');
    const pf = document.getElementById('progressFill');
    requestAnimationFrame(() => pf.style.width = (progressToNextStage()*100) + '%');
  }

  // quick row
  const entry = ensureLog(todayKey());
  const quick = document.getElementById('quickRow');
  quick.innerHTML = '';
  enabledHabits().slice(0,4).forEach(k => {
    const done = entry[k] === true;
    const item = document.createElement('div');
    item.className = 'quick-item';
    item.innerHTML =
      `<div class="quick-ico ${done?'done':''}">${HABITS[k].icon}</div>
       <div class="quick-dot ${done?'done':''}"></div>`;
    quick.appendChild(item);
  });

  // CTA
  const cta = document.getElementById('homeCta');
  if(logAllRequiredDone(entry)){
    cta.innerHTML = `<div class="cta-done">✓ All done for today. ${p.name} is proud.</div>`;
  }else{
    cta.innerHTML = `<button class="btn-primary cta-log" type="button">LOG TODAY</button>`;
    cta.querySelector('button').addEventListener('click', () => switchScreen('habits'));
  }
}

// ═══════════════════════════════════════════════════════
//  RENDER: HABITS
// ═══════════════════════════════════════════════════════
function renderHabits(){
  document.getElementById('habitsDate').textContent =
    new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}).toUpperCase();

  const entry = ensureLog(todayKey());
  const list = document.getElementById('habitList');
  list.innerHTML = '';

  enabledHabits().forEach(k => {
    const h = HABITS[k];
    const done = entry[k] === true;
    const card = document.createElement('div');
    card.className = 'habit-card' + (done?' done':'');
    card.innerHTML =
      `<div class="habit-card-ico">${h.icon}</div>
       <div class="habit-card-body">
         <div class="habit-card-name">${h.name}</div>
         <div class="habit-card-target">${h.targetLabel}</div>
         ${h.auto?`<div class="habit-card-auto">${h.auto}</div>`:''}
       </div>
       <div class="habit-check ${done?'checked':''}">
         <svg viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </div>`;
    card.addEventListener('click', () => {
      const wasAll = logAllRequiredDone(ensureLog(todayKey()));
      toggleHabit(k);
      const e2 = ensureLog(todayKey());
      const isDone = e2[k] === true;
      card.classList.toggle('done', isDone);
      card.querySelector('.habit-check').classList.toggle('checked', isDone);
      const nowAll = logAllRequiredDone(e2);
      haptic(nowAll && !wasAll ? [12,40,18] : 12);
      if(nowAll && !wasAll && wolves.home) wolves.home.celebrate();
      updateHabitCompletion(false);
    });
    list.appendChild(card);
  });
  stagger([...list.children]);
  updateHabitCompletion(true);
}

function updateHabitCompletion(initial){
  const entry = ensureLog(todayKey());
  const rate = logCompletionRate(entry);
  document.getElementById('completionPct').textContent = Math.round(rate*100) + '%';
  const fill = document.getElementById('completionFill');
  if(initial) requestAnimationFrame(() => fill.style.width = (rate*100) + '%');
  else fill.style.width = (rate*100) + '%';
  document.getElementById('successBanner').hidden = !logAllRequiredDone(entry);
}
document.getElementById('saveBtn').addEventListener('click', () => {
  save();
  const btn = document.getElementById('saveBtn');
  const orig = btn.textContent;
  btn.textContent = 'SAVED ✓';
  setTimeout(()=>{ btn.textContent = orig; }, 1200);
});

// ═══════════════════════════════════════════════════════
//  RENDER: STATS
// ═══════════════════════════════════════════════════════
function overallCompletion(){
  const keys = Object.keys(state.logs).filter(k => k !== todayKey());
  if(keys.length === 0) return 0;
  const sum = keys.reduce((a,k)=> a + logCompletionRate(state.logs[k]), 0);
  return sum / keys.length;
}
function renderStats(){
  const p = state.pet;
  const oc = overallCompletion();

  const grid = document.getElementById('statGrid');
  const cards = [
    {ico:'📅',label:'TOTAL DAYS',to:p.totalDaysTracked,suffix:'',color:'#fff'},
    {ico:'🔥',label:'STREAK',to:p.consistentDays,suffix:'',color:'#F5A623'},
    {ico:'⭐',label:'STAGE',to:p.stage,suffix:'',sub:STAGES[p.stage].name.toUpperCase(),color:'#F5A623'},
    {ico:'✓',label:'COMPLETION',to:Math.round(oc*100),suffix:'%',color:oc>0.7?'#22C55E':'#F5A623'},
  ];
  grid.innerHTML = cards.map(c =>
    `<div class="stat-card">
       <div class="stat-card-head"><span class="stat-card-ico">${c.ico}</span><span class="stat-card-label">${c.label}</span></div>
       <div class="stat-card-val" data-to="${c.to}" data-suffix="${c.suffix}" style="color:${c.color}">0${c.suffix}</div>
       ${c.sub?`<div class="stat-card-sub">${c.sub}</div>`:''}
     </div>`).join('');
  stagger([...grid.children]);
  grid.querySelectorAll('.stat-card-val').forEach((el,i) => animateNumber(el, +el.dataset.to, 700 + i*70, el.dataset.suffix));

  // growth journey
  const gr = document.getElementById('growthRow');
  gr.innerHTML = '';
  STAGES.forEach((s,i) => {
    const ach = i <= p.stage, cur = i === p.stage;
    const cell = document.createElement('div');
    cell.className = 'growth-cell' + (ach?' ach':'') + (cur?' cur':'');
    cell.innerHTML =
      `<div class="growth-node ${cur?'cur':''}"><canvas width="80" height="80"></canvas></div>
       <div class="growth-name">${s.name.split(' ')[0].toUpperCase()}</div>`;
    gr.appendChild(cell);
    const cv = cell.querySelector('canvas');
    LupoWolf.still(cv, i);
    cv.style.opacity = ach ? '1' : '0.3';
    if(i < STAGES.length-1){
      const link = document.createElement('div');
      link.className = 'growth-link' + (i < p.stage ? ' ach' : '');
      gr.appendChild(link);
    }
  });

  // 14-day heatmap
  const hm = document.getElementById('heatmap');
  hm.innerHTML = '';
  for(let off=13; off>=0; off--){
    const d = addDays(startOfDay(new Date()), -off);
    const entry = state.logs[dateKey(d)];
    let color = 'var(--card3)';
    if(entry){
      if(logAllRequiredDone(entry)) color = 'rgba(34,197,94,0.75)';
      else if(logCompletionRate(entry) > 0) color = 'rgba(245,166,35,0.6)';
      else color = 'rgba(239,68,68,0.5)';
    }
    const cell = document.createElement('div');
    cell.className = 'heat-cell';
    cell.innerHTML = `<div class="heat-sq" style="background:${color}"></div><div class="heat-d">${d.getDate()}</div>`;
    hm.appendChild(cell);
  }
  // animate squares in
  const sqs = hm.querySelectorAll('.heat-sq');
  sqs.forEach((sq,i)=> setTimeout(()=> sq.classList.add('show'), i*35 + 50));

  // this week
  const wl = document.getElementById('weekList');
  wl.innerHTML = '';
  const eh = enabledHabits();
  for(let off=6; off>=0; off--){
    const d = addDays(startOfDay(new Date()), -off);
    const entry = state.logs[dateKey(d)];
    const lbl = d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase();
    const row = document.createElement('div');
    row.className = 'week-row';
    if(!entry){
      row.innerHTML = `<div class="week-day">${lbl}</div><div class="week-none">— no data</div>`;
    }else{
      const dots = eh.map(k => `<div class="week-dot" style="background:${entry[k]?'var(--success)':'var(--gray3)'}"></div>`).join('');
      const allDone = logAllRequiredDone(entry);
      row.innerHTML =
        `<div class="week-day">${lbl}</div>
         <div class="week-dots">${dots}</div>
         <div class="week-end">${allDone?'✅':'❌'}</div>`;
    }
    wl.appendChild(row);
  }
}

document.getElementById('resetBtn').addEventListener('click', () => {
  if(confirm('Reset ALL progress? Your wolf goes back to a newborn pup. This cannot be undone.')){
    localStorage.removeItem(STORE_KEY);
    load();
    startOnboarding();
  }
});

// ═══════════════════════════════════════════════════════
//  STAGE-UP OVERLAY
// ═══════════════════════════════════════════════════════
function burstConfetti(host){
  const colors = ['#F5A623','#FFCB45','#F3E9D8','#22C55E','#fff'];
  for(let i=0;i<28;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.background = colors[i % colors.length];
    host.appendChild(c);
    const ang = Math.random()*Math.PI*2;
    const dist = 80 + Math.random()*160;
    c.animate([
      { transform:'translate(-50%,-50%) rotate(0deg)', opacity:1 },
      { transform:`translate(${Math.cos(ang)*dist - 50}%, ${Math.sin(ang)*dist - 50}%) rotate(${Math.random()*720-360}deg)`, opacity:0 }
    ], { duration: 900 + Math.random()*500, easing:'cubic-bezier(.2,.7,.3,1)' });
    setTimeout(()=> c.remove(), 1500);
  }
}
function showStageUp(){
  const p = state.pet;
  document.getElementById('stageUpName').textContent = STAGES[p.stage].name.toUpperCase();
  document.getElementById('stageUpTag').textContent = STAGES[p.stage].tag;
  const cv = document.getElementById('wolfStageUp');
  if(wolves.stageup) wolves.stageup.stop();
  wolves.stageup = LupoWolf.mount(cv, p.stage, {mood:'thriving'});
  document.getElementById('stageUp').hidden = false;
  haptic([18,60,30,60,40]);
  setTimeout(()=> { wolves.stageup.celebrate(); burstConfetti(document.querySelector('.stageup-inner')); }, 250);
}
document.getElementById('stageUpBtn').addEventListener('click', () => {
  document.getElementById('stageUp').hidden = true;
  haptic(10);
  if(wolves.stageup){ wolves.stageup.stop(); wolves.stageup = null; }
});

// ═══════════════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════════════
let obPage = 0;
let obSelected = []; // optional habit keys

function startOnboarding(){
  document.getElementById('appMain').hidden = true;
  document.getElementById('screen-onboarding').hidden = false;
  obPage = 0; obSelected = [];
  renderOnboarding();
  if(!wolves.onboard) wolves.onboard = LupoWolf.mount(document.getElementById('wolfOnboard'), 4, {isOnboard:true, mood:'thriving'});
}

function renderOnboarding(){
  document.querySelectorAll('.ob-page').forEach(p => p.hidden = (+p.dataset.page !== obPage));
  document.querySelectorAll('.ob-dot').forEach(d => d.classList.toggle('active', +d.dataset.d === obPage));
  const next = document.getElementById('obNext');
  next.textContent = obPage === 2 ? 'BEGIN' : 'CONTINUE';

  if(obPage === 1){
    if(!wolves.name) wolves.name = LupoWolf.mount(document.getElementById('wolfName'), 2, {isOnboard:true, mood:'good'});
    const inp = document.getElementById('petNameInput');
    next.disabled = inp.value.trim().length === 0;
  }else{
    next.disabled = false;
  }

  if(obPage === 2 && !document.getElementById('obHabitList').dataset.built){
    buildHabitChooser();
  }
}

function buildHabitChooser(){
  const list = document.getElementById('obHabitList');
  list.dataset.built = '1';
  list.innerHTML = '';
  HABIT_ORDER.forEach(k => {
    const h = HABITS[k];
    const locked = h.required;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'ob-habit' + (locked?' on locked':'');
    row.innerHTML =
      `<div class="ob-habit-ico">${h.icon}</div>
       <div class="ob-habit-body">
         <div class="ob-habit-name">${h.name}</div>
         <div class="ob-habit-desc">${h.targetLabel}</div>
         ${locked?'<div class="ob-lock">ALWAYS ON</div>':''}
       </div>
       <div class="ob-check"><svg viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4.5 8L11 1" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    if(!locked){
      row.addEventListener('click', () => {
        const on = row.classList.toggle('on');
        if(on) obSelected.push(k); else obSelected = obSelected.filter(x=>x!==k);
      });
    }
    list.appendChild(row);
  });
}

document.getElementById('petNameInput').addEventListener('input', () => {
  document.getElementById('obNext').disabled =
    document.getElementById('petNameInput').value.trim().length === 0;
});

document.getElementById('obSkip').addEventListener('click', () => { obPage = 2; renderOnboarding(); });

document.getElementById('obNext').addEventListener('click', () => {
  haptic(10);
  if(obPage < 2){ obPage++; renderOnboarding(); return; }
  // finish
  const name = document.getElementById('petNameInput').value.trim() || 'Lupo';
  completeOnboarding(name, obSelected);
});

function completeOnboarding(name, selected){
  state = defaultState();
  state.onboarded = true;
  state.pet.name = name;
  HABIT_ORDER.forEach(k => {
    state.habits[k].enabled = HABITS[k].required || selected.includes(k);
  });
  state.pet.lastUpdated = new Date().toISOString();
  state.pet.createdDate = new Date().toISOString();
  ensureLog(todayKey());
  save();
  haptic([12,50,20]);
  ['onboard','name'].forEach(k => { if(wolves[k]){ wolves[k].stop(); wolves[k] = null; } });
  enterApp();
}

// ═══════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════
function enterApp(){
  document.getElementById('screen-onboarding').hidden = true;
  document.getElementById('appMain').hidden = false;
  switchScreen('home');
  if(pendingStageUp){ pendingStageUp = false; showStageUp(); }
}

function boot(){
  load();
  if(!state.onboarded){
    startOnboarding();
  }else{
    checkForNewDay();
    enterApp();
  }
}
window.addEventListener('load', boot);
