/* ---------- app state (drives the interactive screens) ---------- */
const state = {
  goalName: '',
  targetAmount: '',
  currentAmount: 18400,
  timeframe: 'medium', // 'short' | 'medium' | 'long' — locked to 'medium' for now
  shareAmounts: false, // off by default: activity is visible, exact contribution amounts are hidden
  members: [
    { name:'You', you:true },
    { name:'Andrea' },
    { name:'Jules' },
  ],
  contributions: [
    { amount: 2820.50, daysAgo: 95 }, // unlocked (past 90 days)
    { amount: 1000.00, daysAgo: 42 }, // still locked, 48 days left
  ],
  buyAmount: 500, // amount currently entered on the Add Funds screen
  activity: [
    { name:'Andrea', type:'contribution', amount:500, time:'2h ago' },
    { name:'Jules', type:'streak', time:'1d ago' },
  ]
};

const TIMEFRAMES = {
  short:  { label:'Short-Term',  sub:'1–2 yrs',   equities:100, fixed:0, money:0 },
  medium: { label:'Medium-Term', sub:'3–5 yrs',   equities:100, fixed:0, money:0 },
  long:   { label:'Long-Term',   sub:'5–10+ yrs', equities:100, fixed:0, money:0 },
};

const COLORS = ['#A6192E','#D9A441','#2F7A4D','#3B6EA5','#8A4EA6','#C46B2C'];
function colorFor(name){ let h=0; for(const c of (name||'?')) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[Math.abs(h)%COLORS.length]; }
function initials(name){ return (name||'?').trim().slice(0,1).toUpperCase() || '?'; }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function money(n){ return '₱' + Number(n).toLocaleString('en-PH'); }
function moneyExact(n){ const hasCents = Math.round(Number(n)*100) % 100 !== 0; return '₱' + Number(n).toLocaleString('en-PH', hasCents ? {minimumFractionDigits:2, maximumFractionDigits:2} : {maximumFractionDigits:0}); }
function contributionsSummary(){
  const available = state.contributions.filter(c=>c.daysAgo>=90).reduce((sum,c)=>sum+c.amount, 0);
  const locked = state.contributions.filter(c=>c.daysAgo<90);
  const lockedTotal = locked.reduce((sum,c)=>sum+c.amount, 0);
  const soonest = locked.reduce((min,c)=> (!min || c.daysAgo>min.daysAgo) ? c : min, null);
  return { available, lockedTotal, soonest, soonestDaysLeft: soonest ? 90 - soonest.daysAgo : null };
}

function tabbarHtml(active){
  const tabs = [
    { id:'dashboard', icon:'🏠', label:'Home' },
    { id:'members',   icon:'🎯', label:'Barkada' },
    { id:'monitor',   icon:'💰', label:'Invest' },
    { id:'profile',   icon:'👤', label:'Profile' },
  ];
  return `<div class="tabbar">${tabs.map(t=>`<div class="tab ${t.id===active?'active':''}" ${t.id!=='profile'?`data-goto="${t.id}"`:''}>${t.icon}<br>${t.label}</div>`).join('')}</div>`;
}

/* ---------- screens ---------- */
const screens = [
  { id:'onboard', label:'Onboarding Quiz',
    render: () => `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="progress-dots"><div class="done"></div><div class="done"></div><div></div><div></div></div>
        <div class="eyebrow">Question 2 of 4</div>
        <div class="quiz-q">What are you and your barkada saving toward?</div>
        <div class="opt"><span>A trip within 1–2 years</span><div class="radio"></div></div>
        <div class="opt sel"><span>A big purchase in 3–5 years</span><div class="radio"></div></div>
        <div class="opt"><span>Long-term growth, 5+ years</span><div class="radio"></div></div>
        <div class="opt"><span>Not sure yet</span><div class="radio"></div></div>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" data-goto="goal">Continue</button></div>
      ${tabbarHtml('dashboard')}
    `},

  { id:'goal', label:'Set Investment Goal',
    render: () => `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="eyebrow">Set your goal</div>
        <div class="h2">What are you investing for?</div>

        <div class="field-label">Goal name</div>
        <input class="text-field" id="goalNameInput" value="${escapeHtml(state.goalName)}" placeholder="e.g. Boracay Trip">

        <div class="field-label">Target amount</div>
        <div class="amount-field-wrap"><span>₱</span><input id="goalAmountInput" type="number" value="${state.targetAmount}" placeholder="30000"></div>

        <div class="field-label">Timeframe</div>
        <div class="timeframe-row" id="timeframeRow">
          <div class="tf-card sel" data-tf="medium">
            <div class="tf-name">${TIMEFRAMES.medium.label}</div>
            <div class="tf-sub">${TIMEFRAMES.medium.sub}</div>
          </div>
        </div>
        <p class="muted" style="margin-top:6px;">Short- and Long-Term pathways are coming soon — Medium-Term is available now.</p>

        <div class="goal-preview">
          <div class="gp-label">Preview</div>
          <div class="gp-name">🎯 ${escapeHtml(state.goalName || 'Untitled Goal')}</div>
          <div class="gp-amt">${money(state.targetAmount)} target · ${TIMEFRAMES[state.timeframe].label} · 100% equities</div>
        </div>
        <p class="muted" style="text-align:center;">NAVPS ₱100 at launch · ₱500 minimum per member</p>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" data-goto="members">Save Goal</button></div>
      ${tabbarHtml('members')}
    `},

  { id:'members', label:'Add Members',
    render: () => `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="eyebrow">Grow your barkada</div>
        <div class="h2">Invite friends to "${escapeHtml(state.goalName || 'your goal')}"</div>
        <p class="muted" style="margin-bottom:14px;">Target investors: groups of young (18-25), first-time Filipino investors — minimum 3 members per barkada.</p>

        <div class="invite-box">
          <div class="eyebrow" style="margin-bottom:2px;">Invite Code</div>
          <div class="invite-code">${inviteCode()}</div>
          <button class="btn secondary" id="copyInviteBtn" style="padding:10px;">Copy Invite Link</button>
        </div>

        <div class="field-label">Add a friend manually</div>
        <div class="add-member-row">
          <input class="text-field" id="memberNameInput" placeholder="Friend's name">
          <button class="add-btn" id="addMemberBtn">Add</button>
        </div>

        <div class="card">
          <div class="eyebrow">Barkada Members (${state.members.length}${state.members.length<3?' — need 3 minimum':''})</div>
          <div id="memberList">
            ${state.members.map((m,i)=>`
              <div class="member-row">
                <div class="member-av" style="background:${colorFor(m.name)}">${initials(m.name)}</div>
                <div class="member-name">${escapeHtml(m.name)} ${m.you?'<span class="member-you">(you)</span>':''}</div>
                ${!m.you ? `<button class="remove-btn" data-idx="${i}">×</button>` : ''}
              </div>
            `).join('')}
          </div>
          ${state.members.length<3?`<p class="muted" style="margin-top:8px; color:var(--red);">Add ${3-state.members.length} more member${3-state.members.length>1?'s':''} to start a barkada goal.</p>`:''}
          <div class="switch-row" id="shareAmountsRow" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--hair); cursor:pointer;">
            <span style="font-size:12px; font-weight:800; max-width:230px;">Share my exact contribution amounts with the barkada</span>
            <div class="switch ${state.shareAmounts?'on':''}" id="shareAmountsSwitch"></div>
          </div>
        </div>

      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" data-goto="dashboard">Continue to Dashboard</button></div>
      ${tabbarHtml('members')}
    `},

  { id:'dashboard', label:'Home Dashboard',
    render: () => {
      const tf = TIMEFRAMES[state.timeframe];
      const target = Number(state.targetAmount) || 0;
      const pct = target > 0 ? Math.min(100, Math.round((state.currentAmount/target)*100)) : 0;
      const shown = state.members.slice(0,3);
      const extra = state.members.length - shown.length;
      return `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="barkada-widget">
          <div class="bw-top">
            <div><div class="bw-label">Barkada Goal</div><div class="bw-goal">🎯 ${escapeHtml(state.goalName || 'Untitled Goal')}</div></div>
            <div class="avatars">${shown.map(m=>`<div class="av" style="background:${colorFor(m.name)}; color:#fff;">${initials(m.name)}</div>`).join('')}${extra>0?`<div class="av">+${extra}</div>`:''}</div>
          </div>
          <div class="bw-amounts"><div class="bw-current">${money(state.currentAmount)}</div><div class="bw-target">of ${money(state.targetAmount)} goal</div></div>
          <div class="bw-track"><div class="bw-fill" style="width:${pct}%;"></div></div>
          <div class="bw-foot"><span>${pct}% there</span><span>${state.members.length} members active</span></div>
        </div>
        <div class="card portfolio-card"><div><div class="eyebrow">Your Portfolio</div><div class="val">₱3,820.50</div><div class="gain">▲ 4.2% this month</div></div><div class="pill">${tf.label}</div></div>
        ${pct>=50?`<div class="note" style="background:var(--green-bg); border-color:#B9DCC4; color:var(--green);">🎉 Milestone unlocked! Your barkada hit ${pct}% of your goal — cashback reward applied.</div>`:''}
        <div class="card"><div class="eyebrow">Barkada Activity</div>
          ${state.activity.map(a=>`
            <div class="activity-row"><div class="activity-av">${initials(a.name)}</div><div class="activity-text"><b>${escapeHtml(a.name)}</b> ${a.type==='contribution' ? (state.shareAmounts ? `contributed ${money(a.amount)}` : 'contributed to the goal') : 'hit a 3-month streak 🔥'}</div><div class="activity-time">${a.time}</div></div>
          `).join('')}
        </div>
      </div>
      ${tabbarHtml('dashboard')}
    `;}},

  { id:'buy', label:'Add Funds',
    render: () => `
      <div class="appbar"><div class="icon-btn" data-goto="monitor">←</div><div class="brand-name">Add Funds</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="amount-display"><div class="cur">PHP</div><div class="num" id="buyAmountNum">${state.buyAmount.toLocaleString('en-PH')}</div><p class="muted">Contributing to <b>${escapeHtml(state.goalName || 'your goal')}</b></p></div>
        <div class="toggle-row"><div class="t">One-time</div><div class="t on">Monthly auto-debit</div></div>
        <div class="keypad">
          <div class="key" data-key="1">1</div><div class="key" data-key="2">2</div><div class="key" data-key="3">3</div>
          <div class="key" data-key="4">4</div><div class="key" data-key="5">5</div><div class="key" data-key="6">6</div>
          <div class="key" data-key="7">7</div><div class="key" data-key="8">8</div><div class="key" data-key="9">9</div>
          <div class="key" style="opacity:.4; cursor:default;">₱</div><div class="key" data-key="0">0</div><div class="key" data-key="back">⌫</div>
        </div>
        <p class="muted" style="text-align:center;">Debited from BPI Savings •••• 4821</p>
        <p class="muted" style="text-align:center; margin-top:6px;">🔒 This ${money(state.buyAmount)} contribution unlocks 90 days from today — earlier contributions may already be free to withdraw.</p>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" id="confirmBuyBtn" ${state.buyAmount<=0?'disabled style="opacity:.5; cursor:not-allowed;"':''}>Confirm ${money(state.buyAmount)} / month</button></div>
      ${tabbarHtml('monitor')}
    `},

  { id:'monitor', label:'Monitor Holdings',
    render: () => `
      <div class="appbar"><div class="icon-btn" data-goto="dashboard">←</div><div class="brand-name">Your Portfolio</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="card"><div class="eyebrow">Total Value</div><div class="h2" style="font-size:26px;">₱3,820.50</div><div class="gain" style="color:var(--green); font-size:12px; font-weight:800;">▲ ₱154.20 (4.2%) · 1 Year View</div></div>
        <div class="switch-row"><span style="font-size:12.5px; font-weight:800;">Advanced view</span><div class="switch on"></div></div>
        <div class="card"><div class="eyebrow">Top Holdings</div>
          <div class="holding-row"><div><div class="holding-name">SM Investments</div><div class="holding-sub">PH · Conglomerate</div></div><div><div class="holding-val">₱612.10</div><div class="holding-gain">▲ 3.1%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">Jollibee Foods</div><div class="holding-sub">PH · Food Service</div></div><div><div class="holding-val">₱498.40</div><div class="holding-gain">▲ 2.4%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">7-Eleven (PH)</div><div class="holding-sub">PH · Retail</div></div><div><div class="holding-val">₱455.00</div><div class="holding-gain">▲ 5.8%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">Coca-Cola</div><div class="holding-sub">Global · Beverage</div></div><div><div class="holding-val">₱402.80</div><div class="holding-gain">▲ 1.7%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">Nike</div><div class="holding-sub">Global · Apparel/Lifestyle</div></div><div><div class="holding-val">₱366.20</div><div class="holding-gain">▲ 2.0%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">Visa</div><div class="holding-sub">Global · Payments/Fintech</div></div><div><div class="holding-val">₱310.90</div><div class="holding-gain">▲ 1.3%</div></div></div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn" style="flex:1;" data-goto="buy">Add Funds</button>
          <button class="btn secondary" style="flex:1;" data-goto="redeem">Redeem</button>
        </div>
      </div>
      ${tabbarHtml('monitor')}
    `},

  { id:'redeem', label:'Redeem',
    render: () => {
      const { available, lockedTotal, soonest, soonestDaysLeft } = contributionsSummary();
      return `
      <div class="appbar"><div class="icon-btn" data-goto="monitor">←</div><div class="brand-name">Redeem Funds</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="note" style="background:#FBEAEA; border-color:#EFC2C2; color:var(--red-dark);">🔒 Each contribution unlocks 90 days after its own investment date — your portfolio doesn't lock or unlock all at once.</div>
        <div class="card"><div class="eyebrow">Available to withdraw</div><div class="h2" style="font-size:24px; color:var(--green);">${moneyExact(available)}</div><p class="muted" style="margin-top:6px;">From contributions already past their 90-day lock.</p></div>
        <div class="card"><div class="eyebrow">Locked (still in 90-day period)</div><div class="h2" style="font-size:20px; opacity:.55;">${moneyExact(lockedTotal)}</div><p class="muted" style="margin-top:6px;">${soonest ? `Next ${moneyExact(soonest.amount)} unlocks in ${soonestDaysLeft} days` : 'Nothing currently locked.'}</p></div>
        <div class="toggle-row"><div class="t on">Partial</div><div class="t">Full redemption</div></div>
        <div class="amount-display" style="padding:14px 0;"><div class="cur">PHP</div><div class="num">${Number(available).toLocaleString('en-PH')}</div></div>
        <p class="muted" style="text-align:center;">Proceeds sent to BPI Savings •••• 4821 · standard settlement timeline applies</p>
        <p class="muted" style="text-align:center; margin-top:8px;">1.00% annual management fee applies. No early redemption fee — each contribution simply unlocks 90 days after its own date.</p>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" data-goto="monitor">Redeem ${moneyExact(available)}</button><button class="btn ghost" style="margin-top:10px;">Vote to End Barkada Goal</button></div>
      ${tabbarHtml('monitor')}
    `;}},
];

const SIDEBAR_ITEMS = [
  { id:'dashboard', icon:'🏠', label:'Home' },
  { id:'goal',      icon:'🎯', label:'Set Goal' },
  { id:'members',   icon:'👥', label:'Barkada Members' },
  { id:'monitor',   icon:'💰', label:'Portfolio' },
  { id:'buy',       icon:'➕', label:'Add Funds' },
  { id:'redeem',    icon:'🔄', label:'Redeem' },
];

function inviteCode(){
  const slug = (state.goalName||'GOAL').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'GOAL';
  return `${slug}-${state.timeframe.slice(0,2).toUpperCase()}26-JMA`;
}

let currentIdx = 0; // start at onboarding — the real first-time customer flow

const root = document.getElementById('screen-root');

function currentScreen(){ return screens[currentIdx]; }

function goToScreen(id){
  currentIdx = screens.findIndex(s=>s.id===id);
  renderScreen();
}

function renderScreen(){
  root.innerHTML = currentScreen().render();
  renderSidebar();
  wireScreenInteractions();
}

function renderSidebar(){
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = SIDEBAR_ITEMS.map(item=>`
    <div class="sidebar-item ${currentScreen().id===item.id?'active':''}" data-goto="${item.id}">
      <span class="si-icon">${item.icon}</span><span>${item.label}</span>
    </div>
  `).join('');
}

function openSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('open');
}

function wireScreenInteractions(){
  const id = currentScreen().id;

  document.querySelectorAll('[data-goto]').forEach(el=>{
    el.onclick = ()=>{ goToScreen(el.dataset.goto); closeSidebar(); };
  });

  document.querySelectorAll('.hamburger-btn').forEach(btn=>{
    btn.onclick = openSidebar;
  });

  document.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('focus', ()=> setTimeout(fitPhoneToViewport, 300));
    inp.addEventListener('blur', ()=> setTimeout(fitPhoneToViewport, 300));
  });

  if (id === 'goal'){
    document.getElementById('goalNameInput').addEventListener('input', (e)=>{
      state.goalName = e.target.value;
      updatePreview();
    });
    document.getElementById('goalAmountInput').addEventListener('input', (e)=>{
      state.targetAmount = Number(e.target.value) || 0;
      updatePreview();
    });
  }

  if (id === 'members'){
    document.getElementById('addMemberBtn').onclick = addMember;
    document.getElementById('memberNameInput').addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') addMember();
    });
    document.querySelectorAll('.remove-btn').forEach(btn=>{
      btn.onclick = ()=>{
        state.members.splice(Number(btn.dataset.idx), 1);
        renderScreen();
      };
    });
    document.getElementById('copyInviteBtn').onclick = async (e)=>{
      const btn = e.target;
      try{ await navigator.clipboard.writeText(inviteCode()); }catch(err){}
      const old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(()=>btn.textContent = old, 1200);
    };
    document.getElementById('shareAmountsRow').onclick = ()=>{
      state.shareAmounts = !state.shareAmounts;
      document.getElementById('shareAmountsSwitch').classList.toggle('on', state.shareAmounts);
    };
  }

  if (id === 'buy'){
    document.querySelectorAll('.key[data-key]').forEach(key=>{
      key.onclick = ()=>{
        const k = key.dataset.key;
        if (k === 'back'){
          state.buyAmount = Math.floor(state.buyAmount / 10);
        } else {
          const next = state.buyAmount * 10 + Number(k);
          if (next <= 999999) state.buyAmount = next;
        }
        renderScreen();
      };
    });
    document.getElementById('confirmBuyBtn').onclick = ()=>{
      if (state.buyAmount <= 0) return;
      state.currentAmount += state.buyAmount;
      state.contributions.push({ amount: state.buyAmount, daysAgo: 0 });
      state.activity.unshift({ name:'You', type:'contribution', amount: state.buyAmount, time:'Just now' });
      state.buyAmount = 500;
      goToScreen('dashboard');
    };
  }
}

function addMember(){
  const input = document.getElementById('memberNameInput');
  const name = input.value.trim();
  if (!name) return;
  state.members.push({ name });
  input.value = '';
  renderScreen();
}

function updatePreview(){
  const box = document.querySelector('.goal-preview');
  if (!box) return;
  const tf = TIMEFRAMES[state.timeframe];
  box.querySelector('.gp-name').textContent = '🎯 ' + (state.goalName || 'Untitled Goal');
  box.querySelector('.gp-amt').textContent = `${money(state.targetAmount)} target · ${tf.label} pathway (${tf.equities}% equities)`;
}

document.getElementById('sidebarBackdrop').onclick = closeSidebar;
document.getElementById('closeSidebarBtn').onclick = closeSidebar;

function fitPhoneToViewport(){
  const wrap = document.querySelector('.phone-wrap');
  const PHONE_W = 375, PHONE_H = 812, MARGIN = 24;
  const vv = window.visualViewport;
  const availW = (vv ? vv.width : window.innerWidth) - MARGIN*2;
  const availH = (vv ? vv.height : window.innerHeight) - MARGIN*2;
  const scale = Math.min(1, availW / PHONE_W, availH / PHONE_H);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitPhoneToViewport);
if (window.visualViewport){
  window.visualViewport.addEventListener('resize', fitPhoneToViewport);
  window.visualViewport.addEventListener('scroll', fitPhoneToViewport);
}
fitPhoneToViewport();

renderScreen();
