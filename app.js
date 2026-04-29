'use strict';
/* ============================================================
   FocusForest — app.js  (Web / Desktop)
   ============================================================ */

// ── State ────────────────────────────────────────────────────
const S = {
  coins: 120, xp: 340, level: 3, streak: 4,
  totalSessions: 18, totalMinutes: 432, treesGrown: 14,
  selectedTree: 'oak',
  timerMins: 25, timerSecs: 0, fullSecs: 1500,
  sessionActive: false, sessionPaused: false,
  elapsed: 0, intervalId: null, growthPct: 0,
  ownedTrees: ['oak'],
  settings: { sound: true, notifications: true, keepScreen: false },
  weekData: [40, 60, 90, 25, 75, 110, 0],
  forest: [
    {type:'oak',    stage:4, date:'Apr 10'},
    {type:'cherry', stage:4, date:'Apr 11'},
    {type:'oak',    stage:3, date:'Apr 12'},
    {type:'pine',   stage:4, date:'Apr 13'},
    {type:'oak',    stage:2, date:'Apr 14'},
    {type:'cherry', stage:3, date:'Apr 15'},
    {type:'oak',    stage:4, date:'Apr 16'},
    {type:'fantasy',stage:4, date:'Apr 16'},
    {type:'pine',   stage:2, date:'Apr 17'},
    {type:'maple',  stage:3, date:'Apr 17'},
  ],
  badges: [
    {id:'first',   name:'First Step',    icon:'🌱', desc:'Complete 1st session',     unlocked:true},
    {id:'streak3', name:'3-Day Streak',  icon:'🔥', desc:'3 days in a row',            unlocked:true},
    {id:'oak5',    name:'Oak Master',    icon:'🌳', desc:'Grow 5 oak trees',           unlocked:true},
    {id:'early',   name:'Early Bird',    icon:'🌅', desc:'Study before 8am',           unlocked:false},
    {id:'night',   name:'Night Owl',     icon:'🦉', desc:'Study after 10pm',           unlocked:false},
    {id:'century', name:'Century',       icon:'💯', desc:'100 total sessions',         unlocked:false},
    {id:'marathon',name:'Marathon',      icon:'⏱️', desc:'4-hour single session',      unlocked:false},
    {id:'collect', name:'Collector',     icon:'🎨', desc:'Own 4+ tree types',          unlocked:false},
    {id:'week7',   name:'Week Warrior',  icon:'⚡', desc:'7-day streak',               unlocked:false},
  ],
};

const TREES = {
  oak:     {name:'Oak',           emoji:'🌳', cost:0,   ribbon:'Free',   ribbonCls:'green', desc:'Classic and evergreen'},
  cherry:  {name:'Cherry Blossom',emoji:'🌸', cost:80,  ribbon:'Popular',ribbonCls:'amber', desc:'Beautiful pink blooms'},
  pine:    {name:'Pine',          emoji:'🌲', cost:120, ribbon:'Cool',   ribbonCls:'',      desc:'Tall and serene'},
  fantasy: {name:'Fantasy',       emoji:'🦄', cost:250, ribbon:'Rare',   ribbonCls:'red',   desc:'Magical & glowing'},
  maple:   {name:'Maple',         emoji:'🍁', cost:150, ribbon:'New',    ribbonCls:'amber', desc:'Vivid autumn red'},
  bamboo:  {name:'Bamboo',        emoji:'🎋', cost:90,  ribbon:'Zen',    ribbonCls:'green', desc:'Peaceful and calm'},
};
const STAGES = ['Seed','Sprout','Sapling','Young','Full'];
const RING_C  = 2 * Math.PI * 95; // svg r=95

// ── Utils ──────────────────────────────────────────────────────
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const pad = n => String(n).padStart(2,'0');
const fmt = (m,s) => `${pad(m)}:${pad(s)}`;

function save() { try { localStorage.setItem('ff2', JSON.stringify(S)); } catch(_){} }
function load() { try { const d=localStorage.getItem('ff2'); if(d) Object.assign(S, JSON.parse(d)); } catch(_){} }

// ── Toast ──────────────────────────────────────────────────────
let toastT;
function toast(msg, type='success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = '', 2600);
}

// ── Particles ──────────────────────────────────────────────────
function particles(type='leaf') {
  const c = $('#particles');
  const set = type==='leaf' ? ['🍃','🌿','🍀','🌱','✨'] : ['✨','🎉','⭐','🌟','💫','🪙'];
  for (let i=0; i<16; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'leaf-p';
      el.textContent = set[Math.floor(Math.random()*set.length)];
      el.style.cssText = `left:${5+Math.random()*90}%;bottom:${Math.random()*20}%;animation-delay:${Math.random()*.5}s;animation-duration:${1.8+Math.random()*.8}s;`;
      c.appendChild(el);
      setTimeout(() => el.remove(), 2800);
    }, i*70);
  }
}

// ── Tree Painter ────────────────────────────────────────────────
function drawTree(canvas, type, stage, opts={}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const s = Math.max(0, Math.min(4, stage));
  const cx = w/2, ground = h*0.88;
  const withered = opts.withered || false;
  const alpha = withered ? 0.3 : 1;

  // trunk
  const tH = h*(0.14 + s*0.055);
  const tW = w*(0.04 + s*0.014);
  const trunkGrad = ctx.createLinearGradient(cx-tW, ground-tH, cx+tW, ground);
  trunkGrad.addColorStop(0, '#6b3a1e'); trunkGrad.addColorStop(1, '#3b200d');
  ctx.beginPath();
  ctx.moveTo(cx-tW, ground);
  ctx.lineTo(cx-tW*0.55, ground-tH);
  ctx.lineTo(cx+tW*0.55, ground-tH);
  ctx.lineTo(cx+tW, ground);
  ctx.closePath();
  ctx.fillStyle = trunkGrad;
  ctx.globalAlpha = Math.max(0.15, alpha);
  ctx.fill();

  if (s === 0) {
    ctx.beginPath();
    ctx.ellipse(cx, ground-5, 7, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = '#7c4f28'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, ground-10); ctx.lineTo(cx, ground-20);
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.globalAlpha = alpha; ctx.stroke();
    ctx.globalAlpha = 1; return;
  }

  const colors = {
    oak:     ['#4ade80','#22c55e','#14532d'],
    cherry:  ['#f472b6','#f9a8d4','#be185d'],
    pine:    ['#34d399','#059669','#064e3b'],
    fantasy: ['#c084fc','#a855f7','#4c1d95'],
    maple:   ['#f97316','#fb923c','#7c2d12'],
    bamboo:  ['#86efac','#4ade80','#166534'],
  };
  const col = colors[type] || colors.oak;
  const baseY = ground - tH;
  const layers = Math.min(s+1, 4);

  ctx.globalAlpha = alpha;

  if (type === 'pine') {
    for (let i=0; i<layers; i++) {
      const ly = baseY - i*(h*0.13);
      const lw = (w*0.34) * (1-i*0.16);
      const g = ctx.createRadialGradient(cx, ly-lw*0.4, 0, cx, ly, lw);
      g.addColorStop(0, col[0]); g.addColorStop(1, col[2]);
      ctx.beginPath();
      ctx.moveTo(cx, ly-lw*0.95);
      ctx.lineTo(cx-lw, ly+lw*0.32);
      ctx.lineTo(cx+lw, ly+lw*0.32);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }
  } else {
    for (let i=0; i<layers; i++) {
      const r = (w*0.19+s*w*0.04)*(1-i*0.11);
      const oy = i*(-h*0.1);
      const g = ctx.createRadialGradient(cx, baseY+oy, 0, cx, baseY+oy, r);
      g.addColorStop(0, col[0]); g.addColorStop(.55, col[1]); g.addColorStop(1, col[2]);
      ctx.beginPath();
      ctx.arc(cx, baseY+oy, r, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
    }
    if (type === 'cherry' && s >= 3) {
      // blossom dots
      ctx.globalAlpha = alpha*0.7;
      const petals = ['🌸','🌸','🌸'];
      petals.forEach((_,pi) => {
        ctx.font = `${Math.floor(w*0.1)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f9a8d4';
        ctx.fillText('🌸', cx + (pi-1)*w*0.16, baseY - h*0.08 + pi*10);
      });
    }
    if (type === 'fantasy' && s >= 3) {
      ctx.globalAlpha = 0.8;
      ctx.font = `${Math.floor(w*0.14)}px serif`;
      ctx.textAlign = 'center';
      const spark = ['✨','⭐','💫','🌟'];
      ctx.fillText(spark[Math.floor(Date.now()/600)%4], cx+w*0.2, baseY-h*0.08);
    }
  }
  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════════════
//  HTML BUILD
// ══════════════════════════════════════════════════════════════
function buildApp() {
  document.getElementById('app').innerHTML = `
  <div id="particles"></div>
  <div id="toast"></div>

  <!-- Complete Overlay -->
  <div class="overlay" id="ov-complete">
    <div class="overlay-box">
      <span class="ov-icon">🎉</span>
      <div class="ov-title">Session Complete!</div>
      <div class="ov-coins">🪙 <span id="ov-coins">+50</span></div>
      <div class="ov-sub" id="ov-sub">Great job! Your tree has fully grown.</div>
      <div class="ov-actions">
        <button class="btn btn-primary btn-lg" id="ov-forest-btn">View My Forest</button>
        <button class="btn btn-ghost btn-lg" id="ov-close-btn">Stay Here</button>
      </div>
    </div>
  </div>

  <!-- ── SIDEBAR ── -->
  <aside id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">🌲</div>
      <div class="logo-text">FocusForest <span>Grow While You Study</span></div>
    </div>
    <nav class="sidebar-nav">
      <a class="nav-link active" data-page="focus" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>
        Focus Timer
      </a>
      <a class="nav-link" data-page="forest" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8C8 10 5.9 16.17 3.82 22"/><path d="M9.1 9.1C11 10.6 13 12.7 13 19"/><path d="M20 19c-2-3.7-4.3-7-9-9.4"/><path d="M12 3v3"/></svg>
        My Forest
        <span class="nav-badge">${S.treesGrown}</span>
      </a>
      <a class="nav-link" data-page="stats" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
        Statistics
      </a>
      <a class="nav-link" data-page="shop" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        Tree Shop
      </a>
      <a class="nav-link" data-page="profile" href="#">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="coin-widget">
        <span class="cw-icon">🪙</span>
        <div><div class="cw-amt coin-count">0</div><div class="cw-lbl">Coins</div></div>
      </div>
    </div>
  </aside>

  <!-- ── MAIN ── -->
  <div id="main">
    <!-- Topbar -->
    <div id="topbar">
      <div class="topbar-left">
        <h1 id="page-title">Focus Timer</h1>
        <p id="page-sub">Plant a seed and start your study session</p>
      </div>
      <div class="topbar-right">
        <div class="streak-pill"><span class="s-icon">🔥</span>${S.streak}-day streak</div>
        <div class="avatar-btn">🧑‍🎓</div>
      </div>
    </div>

    <!-- Content -->
    <div id="content">

      <!-- ── FOCUS SCREEN ── -->
      <div class="screen active" id="pg-focus">
        <div class="welcome-banner">
          <div>
            <div class="wb-title">Ready to grow, <span style="color:var(--green)">Forest Student</span>?</div>
            <div class="wb-sub">Plant a virtual seed — stay focused and watch it bloom into a tree 🌳</div>
          </div>
          <div class="wb-tree">🌱</div>
        </div>

        <div class="focus-layout">
          <!-- Left: Timer + Tree -->
          <div class="timer-panel">
            <div class="timer-ring-card">
              <!-- Tree preview -->
              <div class="tree-preview-wrap">
                <canvas id="main-tree" width="160" height="160" class="tree-canvas-main"></canvas>
                <div class="tree-name-lbl" id="tree-name-lbl">Oak</div>
                <div class="tree-stage-pill">Stage: <span id="tree-stage-lbl">Seed</span></div>
              </div>
              <!-- Timer ring -->
              <div class="ring-wrap">
                <svg class="ring-svg" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#16a34a"/><stop offset="100%" stop-color="#4ade80"/>
                    </linearGradient>
                  </defs>
                  <circle class="ring-track" cx="100" cy="100" r="95"/>
                  <circle class="ring-progress" id="ring-prog" cx="100" cy="100" r="95"
                    style="stroke-dasharray:${RING_C};stroke-dashoffset:${RING_C};"/>
                </svg>
                <div class="ring-inner">
                  <div class="time-big" id="timer-display">25:00</div>
                  <div class="time-lbl" id="timer-lbl">Ready to Focus</div>
                </div>
              </div>
              <!-- Growth -->
              <div class="growth-wrap">
                <div class="growth-header"><span>Tree Growth</span><span id="growth-pct">0%</span></div>
                <div class="growth-track"><div class="growth-fill" id="growth-fill" style="width:0%"></div></div>
              </div>
              <!-- Controls -->
              <div class="timer-controls">
                <button class="btn btn-primary btn-lg btn-pulse" id="start-btn">🌱  Plant Seed &amp; Start</button>
                <button class="btn btn-warning btn-lg" id="pause-btn" style="display:none;">⏸  Pause Session</button>
                <button class="btn btn-danger btn-lg" id="stop-btn" style="display:none;">🍂  End Session</button>
              </div>
            </div>

            <!-- Live stats -->
            <div class="live-stats" id="live-stats" style="display:none;">
              <div class="live-stat"><div class="ls-val text-green" id="ls-elapsed">00:00</div><div class="ls-lbl">Elapsed</div></div>
              <div class="live-stat"><div class="ls-val text-amber" id="ls-growth">0%</div><div class="ls-lbl">Growth</div></div>
              <div class="live-stat"><div class="ls-val text-sky" id="ls-coins">+0</div><div class="ls-lbl">Coins Earning</div></div>
            </div>
          </div>

          <!-- Right: Settings -->
          <div class="focus-right">
            <!-- Duration -->
            <div class="card">
              <h2>⏱️ Session Duration</h2>
              <div class="duration-grid" style="margin-bottom:16px;">
                <div class="dur-chip sel" data-m="25">25m<span>Pomodoro</span></div>
                <div class="dur-chip" data-m="45">45m<span>Deep Work</span></div>
                <div class="dur-chip" data-m="60">60m<span>Flow State</span></div>
                <div class="dur-chip" data-m="90">90m<span>Marathon</span></div>
              </div>
              <div class="custom-time-row">
                <div class="time-inp-wrap"><label>MINUTES</label><input type="number" id="c-mins" value="25" min="0" max="240"></div>
                <span class="time-sep">:</span>
                <div class="time-inp-wrap"><label>SECONDS</label><input type="number" id="c-secs" value="00" min="0" max="59"></div>
              </div>
            </div>

            <!-- Tree selector -->
            <div class="card">
              <h2>🌿 Choose Your Tree</h2>
              <div class="tree-selector-grid" id="tree-sel-grid"></div>
            </div>

            <!-- Tips -->
            <div class="card" style="background:linear-gradient(135deg,#071a0e,var(--bg-2));">
              <h2>💡 Focus Tips</h2>
              <ul style="display:flex;flex-direction:column;gap:10px;">
                ${[
                  ['📵','Put your phone face-down or on Do Not Disturb'],
                  ['💧','Keep water nearby — staying hydrated boosts focus'],
                  ['🎧','Try lo-fi music or white noise to block distractions'],
                  ['🪟','Natural light improves alertness and mood'],
                ].map(([i,t])=>`<li style="display:flex;gap:10px;font-size:13px;color:var(--txt-2);"><span>${i}</span><span>${t}</span></li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- ── FOREST SCREEN ── -->
      <div class="screen" id="pg-forest">
        <div class="forest-top-stats">
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(74,222,128,.1);">🌳</div>
            <div><div class="s-num text-green" id="f-trees">0</div><div class="s-lbl">Trees Grown</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(56,189,248,.1);">⏱️</div>
            <div><div class="s-num text-sky" id="f-mins">0</div><div class="s-lbl">Minutes Studied</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(251,191,36,.1);">📚</div>
            <div><div class="s-num text-amber" id="f-sess">0</div><div class="s-lbl">Sessions</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(251,146,60,.1);">🔥</div>
            <div><div class="s-num text-orange">${S.streak}</div><div class="s-lbl">Day Streak</div></div>
          </div>
        </div>
        <div class="section-title">🌿 Your Forest <span class="st-sub">Each tree = one completed session</span></div>
        <div class="forest-grid" id="forest-grid"></div>
      </div>

      <!-- ── STATS SCREEN ── -->
      <div class="screen" id="pg-stats">
        <div class="stats-top">
          <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(74,222,128,.1);">📚</div><div><div class="s-num text-green" id="st-sess">0</div><div class="s-lbl">Total Sessions</div></div></div>
          <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(56,189,248,.1);">⏱️</div><div><div class="s-num text-sky" id="st-mins">0</div><div class="s-lbl">Minutes Studied</div></div></div>
          <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(251,191,36,.1);">🌳</div><div><div class="s-num text-amber" id="st-grown">0</div><div class="s-lbl">Trees Grown</div></div></div>
          <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(251,146,60,.1);">🔥</div><div><div class="s-num text-orange" id="st-streak">0</div><div class="s-lbl">Day Streak</div></div></div>
        </div>

        <div class="stats-layout">
          <div class="flex-col">
            <div class="card">
              <h2>📅 This Week (minutes)</h2>
              <div class="bar-chart-area" id="bar-chart"></div>
            </div>
            <div class="card">
              <h2>🗓️ Activity Heatmap (5 Weeks)</h2>
              <div class="heatmap" id="heatmap"></div>
            </div>
          </div>
          <div class="flex-col">
            <div class="card">
              <h2>🏅 Achievements</h2>
              <div class="badge-grid" id="st-badges"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── SHOP SCREEN ── -->
      <div class="screen" id="pg-shop">
        <div class="balance-card shine">
          <div><div class="bal-lbl">Your Coin Balance</div><div class="bal-num coin-count">0</div></div>
          <div class="bal-icon">🪙</div>
        </div>
        <div class="shop-layout">
          <div>
            <div class="section-title">🛒 Available Trees <span class="st-sub">Earn coins by completing sessions</span></div>
            <div class="shop-grid" id="shop-grid"></div>
          </div>
          <div class="flex-col">
            <div class="card">
              <h2>💡 How to Earn Coins</h2>
              <ul style="display:flex;flex-direction:column;gap:12px;">
                ${[
                  ['⏱️','Complete any timed session'],
                  ['🏆','Unlock achievement badges'],
                  ['🔥','Maintain your daily streak'],
                  ['📆','Study 5+ days per week'],
                ].map(([i,t])=>`<li style="display:flex;gap:10px;font-size:13px;color:var(--txt-2);"><span style="font-size:18px">${i}</span><span>${t}</span></li>`).join('')}
              </ul>
            </div>
            <div class="card" style="text-align:center;background:linear-gradient(135deg,#1a1408,var(--bg-2));">
              <div style="font-size:42px;margin-bottom:10px;">🪙</div>
              <div style="font-size:13px;color:var(--txt-2);">Coins per minute</div>
              <div style="font-size:32px;font-weight:800;color:var(--amber);">2×</div>
              <div style="font-size:12px;color:var(--txt-2);margin-top:6px;">You earn 2 coins per minute studied</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── PROFILE SCREEN ── -->
      <div class="screen" id="pg-profile">
        <div class="profile-layout">
          <div>
            <div class="profile-card">
              <div class="profile-avatar">🧑‍🎓</div>
              <div class="profile-name">Forest Student</div>
              <div class="profile-level" id="pr-level">Level 3 Forester</div>
              <div class="xp-section">
                <div class="xp-header"><span>XP Progress</span><span id="pr-xp-lbl">340 / 600 XP</span></div>
                <div class="xp-track"><div class="xp-fill" id="pr-xp" style="width:0%"></div></div>
              </div>
              <div class="pro-stats">
                <div class="pro-stat"><span class="ps-icon">📚</span><div class="ps-num text-green" id="pr-sess">0</div><div class="ps-lbl">Sessions</div></div>
                <div class="pro-stat"><span class="ps-icon">⏱️</span><div class="ps-num text-sky" id="pr-mins">0</div><div class="ps-lbl">Minutes</div></div>
                <div class="pro-stat"><span class="ps-icon">🌳</span><div class="ps-num text-amber" id="pr-trees">0</div><div class="ps-lbl">Trees</div></div>
                <div class="pro-stat"><span class="ps-icon">🔥</span><div class="ps-num text-orange" id="pr-streak">0</div><div class="ps-lbl">Streak</div></div>
              </div>
            </div>
          </div>
          <div class="flex-col">
            <div class="card">
              <h2>⚙️ Settings</h2>
              <div class="settings-list">
                ${[
                  ['tog-sound','Sound Effects','Play sounds during sessions',true],
                  ['tog-notif','Notifications','Reminders and session alerts',true],
                  ['tog-screen','Keep Screen On','Prevent sleep during study',false],
                ].map(([id,l,d,c])=>`
                  <div class="setting-item">
                    <div><div class="si-label">${l}</div><div class="si-desc">${d}</div></div>
                    <label class="toggle"><input type="checkbox" id="${id}" ${c?'checked':''}><span class="toggle-track"></span></label>
                  </div>`).join('')}
              </div>
            </div>
            <div class="card">
              <h2>🏅 Achievement Badges</h2>
              <div class="badge-grid" id="pr-badges"></div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
  `;
}

// ══════════════════════════════════════════════════════════════
//  COIN DISPLAY
// ══════════════════════════════════════════════════════════════
function updateCoins() {
  $$('.coin-count').forEach(el => el.textContent = S.coins.toLocaleString());
}

// ══════════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════════
const PAGE_META = {
  focus:   ['Focus Timer',   'Plant a seed and start your study session'],
  forest:  ['My Forest',     'Your collected trees over time'],
  stats:   ['Statistics',    'Your study journey at a glance'],
  shop:    ['Tree Shop',     'Unlock new tree varieties with coins'],
  profile: ['Profile',       'Your learning identity and settings'],
};
function navigate(page) {
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#pg-${page}`).classList.add('active');
  const [title, sub] = PAGE_META[page];
  $('#page-title').textContent = title;
  $('#page-sub').textContent = sub;
  if (page === 'forest')  renderForest();
  if (page === 'stats')   renderStats();
  if (page === 'shop')    renderShop();
  if (page === 'profile') renderProfile();
}

// ══════════════════════════════════════════════════════════════
//  FOCUS / TIMER
// ══════════════════════════════════════════════════════════════
function renderTreeSelector() {
  const g = $('#tree-sel-grid');
  if (!g) return;
  g.innerHTML = Object.entries(TREES).map(([k,t]) => {
    const owned = S.ownedTrees.includes(k);
    const active = S.selectedTree === k;
    return `<div class="tree-sel-card ${active?'active':''} ${!owned?'locked':''}" data-tree="${k}">
      <span class="ts-emoji">${t.emoji}</span>
      <div class="ts-name">${t.name}</div>
      ${!owned?'<span class="ts-lock">🔒</span>':''}
    </div>`;
  }).join('');
  $$('.tree-sel-card:not(.locked)').forEach(c => {
    c.addEventListener('click', () => {
      if (S.sessionActive) return;
      S.selectedTree = c.dataset.tree;
      renderTreeSelector();
      drawMainTree();
    });
  });
  $$('.tree-sel-card.locked').forEach(c => {
    c.addEventListener('click', () => toast('Buy this tree in the Shop first! 🛒', 'warning'));
  });
}

function drawMainTree() {
  const c = $('#main-tree');
  if (!c) return;
  const stage = Math.min(4, Math.floor(S.growthPct / 25));
  drawTree(c, S.selectedTree, stage);
  $('#tree-stage-lbl').textContent = STAGES[stage];
  $('#tree-name-lbl').textContent  = TREES[S.selectedTree].name;
}

function updateRing() {
  const ring = $('#ring-prog');
  if (!ring) return;
  const total = S.timerMins*60 + S.timerSecs;
  const pct = S.fullSecs > 0 ? (S.fullSecs - total) / S.fullSecs : 0;
  ring.style.strokeDashoffset = RING_C * (1 - pct);
  $('#timer-display').textContent = fmt(S.timerMins, S.timerSecs);
  $('#timer-lbl').textContent = S.sessionActive ? (S.sessionPaused ? 'Paused ⏸' : 'Focusing…') : 'Ready to Begin';
}

function updateGrowth(pct) {
  S.growthPct = pct;
  const fill = $('#growth-fill');
  if (fill) fill.style.width = pct + '%';
  const gp = $('#growth-pct');
  if (gp) gp.textContent = Math.round(pct) + '%';
}

function startSession() {
  const total = S.timerMins*60 + S.timerSecs;
  if (total === 0) { toast('Set a duration first!', 'warning'); return; }
  S.sessionActive = true;
  S.sessionPaused = false;
  S.fullSecs = total;
  S.elapsed = 0;
  updateGrowth(0);
  updateSessionUI();
  tick();
  particles('leaf');
  toast('🌱 Session started! Stay focused!', 'success');
}

function pauseSession() {
  S.sessionPaused = !S.sessionPaused;
  clearInterval(S.intervalId);
  if (!S.sessionPaused) tick();
  const btn = $('#pause-btn');
  if (btn) btn.textContent = S.sessionPaused ? '▶  Resume Session' : '⏸  Pause Session';
  toast(S.sessionPaused ? '⏸ Paused' : '▶ Resumed', 'warning');
}

function stopSession() {
  clearInterval(S.intervalId);
  S.sessionActive = false; S.sessionPaused = false;
  const c = $('#main-tree');
  if (c) { const stage = Math.min(4, Math.floor(S.growthPct/25)); drawTree(c, S.selectedTree, stage, {withered:true}); }
  toast('Session cancelled — tree withered 🍂', 'error');
  S.elapsed = 0; S.timerMins = Math.floor(S.fullSecs/60); S.timerSecs = S.fullSecs%60;
  setTimeout(() => { updateGrowth(0); drawMainTree(); updateSessionUI(); updateRing(); }, 700);
}

function tick() {
  S.intervalId = setInterval(() => {
    if (S.timerMins === 0 && S.timerSecs === 0) { clearInterval(S.intervalId); completeSession(); return; }
    if (S.timerSecs === 0) { S.timerMins--; S.timerSecs = 59; } else S.timerSecs--;
    S.elapsed++;
    const pct = Math.min(100, (S.elapsed / S.fullSecs) * 100);
    updateGrowth(pct);
    updateRing();
    drawMainTree();
    updateLiveStats();
  }, 1000);
}

function updateLiveStats() {
  const m = Math.floor(S.elapsed/60), s = S.elapsed%60;
  const el = $('#ls-elapsed'); if (el) el.textContent = fmt(m,s);
  const gl = $('#ls-growth');  if (gl) gl.textContent = Math.round(S.growthPct)+'%';
  const cl = $('#ls-coins');   if (cl) cl.textContent = '+'+Math.round(S.elapsed/30);
}

function completeSession() {
  S.sessionActive = false;
  const mins = Math.round(S.elapsed/60);
  const earned = Math.max(10, mins*2);
  S.coins += earned; S.xp += earned*3; S.totalSessions++; S.totalMinutes += mins; S.treesGrown++;
  S.weekData[6] = (S.weekData[6]||0) + mins;
  if (S.xp >= S.level*200) S.level++;
  S.forest.unshift({type:S.selectedTree, stage:4, date:'Today'});
  updateGrowth(100); drawMainTree();
  // badge checks
  const cBadge = S.badges.find(b=>b.id==='collect');
  if (cBadge && S.ownedTrees.length >= 4 && !cBadge.unlocked) { cBadge.unlocked = true; toast('🏆 Badge Unlocked: Collector!', 'success'); }
  updateCoins(); save();
  particles('celebrate');
  $('#ov-coins').textContent = '+'+earned;
  $('#ov-sub').textContent = `${mins} min session completed! Your tree is fully grown.`;
  $('#ov-complete').classList.add('show');
  S.elapsed = 0; S.timerMins = Math.floor(S.fullSecs/60); S.timerSecs = S.fullSecs%60;
}

function updateSessionUI() {
  const start = $('#start-btn'), pause = $('#pause-btn'), stop = $('#stop-btn'), live = $('#live-stats');
  if (S.sessionActive) {
    start.style.display = 'none'; pause.style.display = 'flex'; stop.style.display = 'flex';
    if (live) live.style.display = 'grid';
  } else {
    start.style.display = 'flex'; pause.style.display = 'none'; stop.style.display = 'none';
    if (live) live.style.display = 'none';
  }
}

function setupDurations() {
  $$('.dur-chip').forEach(c => {
    c.addEventListener('click', () => {
      if (S.sessionActive) return;
      $$('.dur-chip').forEach(d => d.classList.remove('sel'));
      c.classList.add('sel');
      S.timerMins = parseInt(c.dataset.m); S.timerSecs = 0;
      $('#c-mins').value = pad(S.timerMins); $('#c-secs').value = '00';
      updateRing();
    });
  });
  $('#c-mins').addEventListener('input', e => { if (!S.sessionActive) { S.timerMins = parseInt(e.target.value)||0; $$('.dur-chip').forEach(d=>d.classList.remove('sel')); updateRing(); }});
  $('#c-secs').addEventListener('input', e => { if (!S.sessionActive) { S.timerSecs = parseInt(e.target.value)||0; updateRing(); }});
}

// ══════════════════════════════════════════════════════════════
//  FOREST
// ══════════════════════════════════════════════════════════════
function renderForest() {
  $('#f-trees').textContent = S.treesGrown;
  $('#f-mins').textContent  = S.totalMinutes;
  $('#f-sess').textContent  = S.totalSessions;
  const g = $('#forest-grid'); if (!g) return;
  const slots = 24;
  g.innerHTML = '';
  for (let i=0; i<slots; i++) {
    const t = S.forest[i];
    const cell = document.createElement('div');
    cell.className = t ? 'forest-cell' : 'forest-cell empty';
    if (t) {
      const c = document.createElement('canvas');
      c.width = 120; c.height = 120;
      cell.appendChild(c);
      drawTree(c, t.type, t.stage);
      const lbl = document.createElement('div');
      lbl.className = 'fc-label';
      lbl.textContent = (TREES[t.type]?.name||'') + ' · ' + t.date;
      cell.appendChild(lbl);
    }
    g.appendChild(cell);
  }
}

// ══════════════════════════════════════════════════════════════
//  STATS
// ══════════════════════════════════════════════════════════════
function renderStats() {
  [['st-sess',S.totalSessions],['st-mins',S.totalMinutes],['st-grown',S.treesGrown],['st-streak',S.streak]].forEach(([id,v])=>{ const el=$(('#'+id)); if(el) el.textContent=v; });
  // Bar chart
  const bc = $('#bar-chart'); if (!bc) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const max = Math.max(...S.weekData, 1);
  bc.innerHTML = days.map((d,i)=>{
    const pct = S.weekData[i]/max*100;
    return `<div class="bc-col">
      <div class="bc-val">${S.weekData[i]}m</div>
      <div class="bc-col-inner"><div class="bc-bar ${i===6?'today-bar':''}" style="height:${pct}%"></div></div>
      <div class="bc-lbl">${d}</div>
    </div>`;
  }).join('');
  // Heatmap
  const hm = $('#heatmap'); if (!hm) return;
  hm.innerHTML = '';
  for (let i=0; i<35; i++) {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    if (i < S.treesGrown) cell.dataset.l = Math.min(3, Math.ceil(Math.random()*3));
    hm.appendChild(cell);
  }
  // Badges
  const bg = $('#st-badges'); if (!bg) return;
  bg.innerHTML = S.badges.map(b=>`<div class="badge-card ${b.unlocked?'unlocked':'locked'}">
    <span class="bi">${b.icon}</span><div class="bn">${b.name}</div><div class="bd">${b.desc}</div>
  </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  SHOP
// ══════════════════════════════════════════════════════════════
function renderShop() {
  updateCoins();
  const g = $('#shop-grid'); if (!g) return;
  g.innerHTML = Object.entries(TREES).map(([k,t])=>{
    const owned = S.ownedTrees.includes(k);
    const can   = !owned && S.coins >= t.cost;
    const btnCls = owned ? 'owned-btn' : (can ? '' : 'cant-btn');
    const btnTxt = owned ? '✓ Owned' : (can ? 'Buy' : `Need ${t.cost-S.coins} more`);
    const bg     = `rgba(${k==='cherry'?'244,114,182':k==='pine'?'52,211,153':k==='fantasy'?'196,132,252':k==='maple'?'251,146,60':k==='bamboo'?'134,239,172':'74,222,128'},.08)`;
    return `<div class="shop-card ${owned?'owned':''}" data-key="${k}">
      <div class="shop-preview" style="background:${bg};">
        <div class="shop-ribbon ${t.ribbonCls}">${t.ribbon}</div>
        <canvas width="100" height="100" data-shop="${k}"></canvas>
      </div>
      <div class="shop-info">
        <div class="shop-name">${t.emoji} ${t.name}</div>
        <div class="shop-desc">${t.desc}</div>
        <div class="shop-footer">
          <span class="shop-price">🪙 ${t.cost===0?'Free':t.cost}</span>
          <button class="shop-btn ${btnCls}" data-buy="${k}">${btnTxt}</button>
        </div>
      </div>
    </div>`;
  }).join('');
  $$('[data-shop]').forEach(c => drawTree(c, c.dataset.shop, 4));
  $$('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.buy;
      if (S.ownedTrees.includes(k)) return;
      const t = TREES[k];
      if (S.coins < t.cost) { toast('Not enough coins! Complete more sessions.', 'error'); return; }
      S.coins -= t.cost; S.ownedTrees.push(k); save();
      renderShop(); renderTreeSelector(); updateCoins();
      particles('celebrate');
      toast(`${t.emoji} ${t.name} unlocked!`, 'success');
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════════════
function renderProfile() {
  const xpN = S.level*200;
  const pct  = Math.min(100, S.xp/xpN*100);
  const lv   = document.getElementById('pr-level'); if(lv) lv.textContent=`Level ${S.level} Forester`;
  const xf   = document.getElementById('pr-xp');    if(xf) xf.style.width=pct+'%';
  const xl   = document.getElementById('pr-xp-lbl');if(xl) xl.textContent=`${S.xp} / ${xpN} XP`;
  [['pr-sess',S.totalSessions],['pr-mins',S.totalMinutes],['pr-trees',S.treesGrown],['pr-streak',S.streak]].forEach(([id,v])=>{ const el=document.getElementById(id); if(el) el.textContent=v; });
  const bg = document.getElementById('pr-badges'); if (!bg) return;
  bg.innerHTML = S.badges.map(b=>`<div class="badge-card ${b.unlocked?'unlocked':'locked'}">
    <span class="bi">${b.icon}</span><div class="bn">${b.name}</div><div class="bd">${b.desc}</div>
  </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function init() {
  load();
  buildApp();

  // Navigation
  $$('.nav-link').forEach(l => l.addEventListener('click', e => { e.preventDefault(); navigate(l.dataset.page); }));

  // Timer buttons
  document.addEventListener('click', e => {
    if (e.target.id==='start-btn')    startSession();
    if (e.target.id==='stop-btn')     stopSession();
    if (e.target.id==='pause-btn')    pauseSession();
    if (e.target.id==='ov-forest-btn'){ $('#ov-complete').classList.remove('show'); navigate('forest'); }
    if (e.target.id==='ov-close-btn') { $('#ov-complete').classList.remove('show'); updateSessionUI(); updateRing(); }
  });

  // Settings toggles
  document.addEventListener('change', e => {
    if (e.target.id==='tog-sound')  S.settings.sound  = e.target.checked;
    if (e.target.id==='tog-notif')  S.settings.notifications = e.target.checked;
    if (e.target.id==='tog-screen') S.settings.keepScreen = e.target.checked;
    save();
  });

  setupDurations();
  renderTreeSelector();
  updateCoins();
  updateRing();
  drawMainTree();
}

document.addEventListener('DOMContentLoaded', init);
