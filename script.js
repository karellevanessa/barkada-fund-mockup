/* ---------- date & investment math helpers ---------- */
const TODAY = new Date();

function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function addBusinessDays(date, n){
  const d = new Date(date);
  let added = 0;
  while (added < n){
    d.setDate(d.getDate()+1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}
function daysBetween(a, b){ return Math.floor((b - a) / 86400000); }
function formatDate(d){ return d.toLocaleDateString('en-PH', { month:'short', day:'numeric' }); }
function isSettled(date){ return TODAY >= addBusinessDays(date, 2); }

// 70% Fixed Income (T-Bills & Treasury Bonds) / 30% Equities — illustrative target rates, not guaranteed
const RATES = { fixed: 0.06, equities: 0.08 };
RATES.blended = 0.7 * RATES.fixed + 0.3 * RATES.equities;
const DAILY_RATE = Math.pow(1 + RATES.blended, 1/365) - 1;

function projectedEarnings(principal, days){
  return principal * (Math.pow(1 + RATES.blended, days/365) - 1);
}

let lotId = 0, txnId = 0;
function makeLot(amount, daysAgo, member){
  return { id: ++lotId, amount, remaining: amount, date: addDays(TODAY, -daysAgo), member };
}
function makeTxn(type, amount, fee, date, member){
  return { id: ++txnId, type, amount, fee, date, settleDate: addBusinessDays(date, 2), member };
}

/* ---------- app state (drives the interactive screens) ---------- */
const state = {
  userRole: null, // 'creator' | 'joiner'
  investorType: 'moderate', // 'conservative' | 'moderate' | 'aggressive' — set for real once the onboarding quiz is completed
  quizAnswers: {}, // { q1: score, q2: score, q3: score }
  goalName: '',
  targetAmount: '',
  currentAmount: 18400,
  shareAmounts: false, // off by default: activity is visible, exact contribution amounts are hidden
  joinCode: '',
  joinName: '',
  members: [
    { name:'You', you:true },
    { name:'Andrea' },
    { name:'Jules' },
  ],
  contributions: [
    makeLot(2820.50, 95, 'You'), // unlocked (past 90 days)
    makeLot(1000.00, 42, 'You'), // still locked, 48 days left
  ],
  buyAmount: 500, // amount currently entered on the Add Funds screen
  buyMode: 'onetime', // 'onetime' | 'auto'
  autoFrequency: 'monthly', // 'daily' | 'biweekly' | 'monthly'
  redeemAmount: 0, // amount currently entered on the Redeem screen (partial mode)
  redeemMode: 'full', // 'full' | 'partial'
  transactions: [],
  activity: [
    { name:'Andrea', type:'contribution', amount:500, time:'2h ago' },
    { name:'Jules', type:'streak', time:'1d ago' },
  ]
};
state.transactions = state.contributions.map(c => makeTxn('contribution', c.amount, 0, c.date, c.member));

// The fund itself is fixed — every barkada goal is the same short-term, 70/30 fund. There's no
// pathway to pick; only the investor-type quiz below varies, and it's about the PERSON, not the goal.
const FUND = { label:'Short-Term', sub:'1+ yr', equities:30, fixed:70 };

const INVESTOR_PROFILES = {
  conservative: { investorType:'Conservative Investor',
    profileDesc:"You'd rather protect what you've already put in than chase extra growth — which fits well, since this fund is short-term (at least 1 year) by design anyway.",
    effects:[
      "With as little as 1 year to grow, there's not much time to recover from a big dip — the fund's fixed-income-heavy mix already leans toward protecting your principal",
      'Consider contributing steadily rather than a single lump sum',
      'Keep your goal amount realistic for a short window rather than expecting aggressive growth',
    ]},
  moderate: { investorType:'Moderate Investor',
    profileDesc:"You're comfortable with some short-term ups and downs, which suits this fund's at-least-1-year horizon reasonably well as long as you're not counting on an exact number by a specific date.",
    effects:[
      "This fund's short horizon (at least 1 year) means growth potential is modest by design — worth setting expectations accordingly",
      'The 30% equities slice can still swing in the short run, even inside a fixed-income-heavy fund',
      'Check in on progress every few months rather than daily',
    ]},
  aggressive: { investorType:'Aggressive Investor',
    profileDesc:"You're drawn to long-term growth and can stomach volatility — worth knowing upfront that this particular fund is short-term (at least 1 year), so it won't fully match that appetite.",
    effects:[
      "This fund won't deliver aggressive, long-term-style growth — it's built for a short window starting at 1 year, not a decade",
      'If long-term growth is really the goal, this fund is likely only part of the picture',
      'The 30% equities slice still gives some upside within that short window',
    ]},
};

const QUIZ_QUESTIONS = [
  { id:'q1', q:'If your investment dropped 10% in a month, what would you do?',
    options:[
      { label:'Sell to avoid further loss', score:1 },
      { label:'Hold and wait it out', score:2 },
      { label:'See it as a chance to add more', score:3 },
    ]},
  { id:'q2', q:'How would a 10% drop in this money affect your day-to-day life?',
    options:[
      { label:"I'd be seriously stressed — I need this money to stay safe", score:1 },
      { label:"I'd be a little uneasy, but okay", score:2 },
      { label:"It wouldn't bother me — this is money I can afford to risk", score:3 },
    ]},
  { id:'q3', q:'Which best describes your investing experience so far?',
    options:[
      { label:"New to investing — I'd rather play it safe", score:1 },
      { label:"Some experience — I'm comfortable with moderate risk", score:2 },
      { label:'Experienced — comfortable taking on more risk for more growth', score:3 },
    ]},
];
function computeInvestorType(){
  const total = QUIZ_QUESTIONS.reduce((sum,q)=> sum + (state.quizAnswers[q.id]||0), 0);
  if (total <= 4) return 'conservative';
  if (total <= 7) return 'moderate';
  return 'aggressive';
}

const COLORS = ['#A6192E','#D9A441','#2F7A4D','#3B6EA5','#8A4EA6','#C46B2C'];
function colorFor(name){ let h=0; for(const c of (name||'?')) h=(h*31+c.charCodeAt(0))%COLORS.length; return COLORS[Math.abs(h)%COLORS.length]; }
function initials(name){ return (name||'?').trim().slice(0,1).toUpperCase() || '?'; }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function money(n){ return '₱' + Number(n).toLocaleString('en-PH'); }
function moneyExact(n){ const hasCents = Math.round(Number(n)*100) % 100 !== 0; return '₱' + Number(n).toLocaleString('en-PH', hasCents ? {minimumFractionDigits:2, maximumFractionDigits:2} : {maximumFractionDigits:0}); }

/* ---------- portfolio / lot math (per-contribution 90-day clocks, FIFO redemption) ---------- */
function totalRemaining(){
  return state.contributions.reduce((sum,c)=>sum+c.remaining, 0);
}
function lockedBreakdown(){
  const lockedLots = state.contributions.filter(c => c.remaining > 0 && daysBetween(c.date, TODAY) < 90);
  const lockedTotal = lockedLots.reduce((sum,c)=>sum+c.remaining, 0);
  const soonest = lockedLots.reduce((min,c)=> (!min || daysBetween(c.date,TODAY) > daysBetween(min.date,TODAY)) ? c : min, null);
  return { lockedTotal, soonest, soonestDaysLeft: soonest ? 90 - daysBetween(soonest.date, TODAY) : null };
}
// FIFO: oldest contributions redeemed first. 1% fee applies only to the portion of a lot still under 90 days.
function computeRedemption(amount){
  const sorted = [...state.contributions].filter(c=>c.remaining>0).sort((a,b)=>a.date-b.date);
  let remaining = amount;
  let fee = 0;
  const lotsUsed = [];
  for (const lot of sorted){
    if (remaining <= 0) break;
    const take = Math.min(lot.remaining, remaining);
    const age = daysBetween(lot.date, TODAY);
    const lotFee = age < 90 ? take * 0.01 : 0;
    fee += lotFee;
    remaining -= take;
    lotsUsed.push({ lot, take, age, lotFee });
  }
  const gross = amount - remaining;
  return { requested: amount, gross, fee, net: gross - fee, lotsUsed };
}
function applyRedemption(amount){
  const result = computeRedemption(amount);
  for (const { lot, take } of result.lotsUsed){ lot.remaining -= take; }
  state.contributions = state.contributions.filter(c => c.remaining > 0.001);
  state.currentAmount -= result.gross;
  const txn = makeTxn('redemption', result.gross, result.fee, new Date(TODAY), 'You');
  state.transactions.unshift(txn);
  return result;
}
function settledPrincipal(){
  return state.contributions.filter(c=>isSettled(c.date)).reduce((sum,c)=>sum+c.remaining, 0);
}
function dailyAccrualRows(days){
  const principal = settledPrincipal();
  const dailyAmt = principal * DAILY_RATE;
  const rows = [];
  for (let i=0; i<days; i++) rows.push({ date: addDays(TODAY, -i), amount: dailyAmt });
  return rows;
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

function txnRowHtml(t){
  const settled = isSettled(t.date);
  const isRedeem = t.type === 'redemption';
  const title = isRedeem ? 'You redeemed' : 'You contributed';
  return `
    <div class="activity-row txn-row">
      <div class="activity-av">${isRedeem?'↩':'↑'}</div>
      <div class="activity-text">
        <b>${title} ${moneyExact(t.amount)}</b>
        ${t.fee>0?`<br><span class="muted" style="font-size:10.5px;">1% early redemption fee: −${moneyExact(t.fee)}</span>`:''}
        <br><span class="status-pill ${settled?'settled':'pending'}">${settled?'Settled':'Pending · settles '+formatDate(t.settleDate)}</span>
      </div>
      <div class="activity-time">${formatDate(t.date)}</div>
    </div>
  `;
}
function accrualRowHtml(r){
  return `
    <div class="accrual-row">
      <span>📈 Daily interest accrual</span>
      <span>+${moneyExact(r.amount)}</span>
      <span class="accrual-date">${formatDate(r.date)}</span>
    </div>
  `;
}

/* ---------- investor profile + disclaimer (onboarding only — accepted once, upfront) ---------- */
function investorSectionHtml(investorTypeKey, checkboxId){
  const profile = INVESTOR_PROFILES[investorTypeKey];
  const article = /^[aeiou]/i.test(profile.investorType) ? 'an' : 'a';
  return `
    <div class="investor-profile-box">
      <div class="ipb-badge">${profile.investorType}</div>
      <p class="ipb-desc">${profile.profileDesc}</p>
      <div class="ipb-label">What this means for you</div>
      <ul class="ipb-effects">${profile.effects.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul>
    </div>
    <label class="disclaimer-row" for="${checkboxId}">
      <input type="checkbox" id="${checkboxId}">
      <span>I understand that I've been assessed as ${article} ${profile.investorType} based on my answers, that BPI Barkada FUNd is a short-term (at least 1 year) fund whose 70% Fixed Income / 30% Equities mix doesn't change based on my profile, that investment values can rise and fall, and that BPI Barkada FUNd does not guarantee I will reach my goal amount or timeline. I am investing only what I can afford to set aside.</span>
    </label>
  `;
}
function allQuizAnswered(){
  return QUIZ_QUESTIONS.every(q => state.quizAnswers[q.id] != null);
}
function onboardRevealHtml(){
  if (!allQuizAnswered()) return '';
  const investorType = computeInvestorType();
  return `
    <div class="eyebrow" style="margin-top:18px;">About BPI Barkada FUND</div>
    <div class="card">
      <p class="muted">BPI Barkada FUND is a group investment product for young, first-time Filipino investors — you and your barkada (3+ friends) pool your contributions into one shared fund and track progress toward a goal together. The fund itself is short-term by design (at least 1 year) and fixed at 70% Fixed Income (T-Bills &amp; Treasury Bonds) / 30% Equities for everyone — it's built for near-term goals like a trip or a big purchase, not long-term retirement-style investing.</p>
    </div>
    ${investorSectionHtml(investorType, 'onboardDisclaimerCheck')}
  `;
}
function updateOnboardButton(){
  const btn = document.getElementById('onboardContinueBtn');
  if (!btn) return;
  const checkbox = document.getElementById('onboardDisclaimerCheck');
  const ready = allQuizAnswered() && !!checkbox && checkbox.checked;
  btn.disabled = !ready;
  btn.style.opacity = ready ? '' : '.5';
  btn.style.cursor = ready ? '' : 'not-allowed';
}
function updateJoinSummary(){
  const section = document.getElementById('joinSummarySection');
  if (!section) return;
  const codeEntered = (state.joinCode||'').trim().length > 0;
  section.innerHTML = codeEntered ? `
    <div class="card" style="margin-top:14px;">
      <div class="eyebrow">You're joining</div>
      <div class="h2" style="font-size:16px;">🎯 ${escapeHtml(state.goalName || 'Untitled Goal')}</div>
      <p class="muted">${money(state.targetAmount)} target</p>
    </div>
  ` : `<p class="muted" style="margin-top:14px;">Enter an invite code to see the goal you're joining.</p>`;
  const btn = document.getElementById('joinBarkadaBtn');
  btn.disabled = !codeEntered;
  btn.style.opacity = codeEntered ? '' : '.5';
  btn.style.cursor = codeEntered ? '' : 'not-allowed';
}

/* ---------- screens ---------- */
const screens = [
  { id:'entry', label:'Create or Join',
    render: () => `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="eyebrow">Welcome</div>
        <div class="h2">Are you starting a new Barkada Fund, or joining one?</div>

        <div class="card entry-card" id="createCard" style="margin-top:14px;">
          <div class="eyebrow">Create a Barkada Fund</div>
          <p class="muted">Set a shared goal and invite your barkada to join.</p>
        </div>

        <div class="card entry-card" id="joinCard">
          <div class="eyebrow">Join a Barkada Fund</div>
          <p class="muted">Enter an invite code from a friend and join their goal.</p>
        </div>
      </div>
      ${tabbarHtml('dashboard')}
    `},

  { id:'onboard', label:'Onboarding Quiz',
    render: () => `
      <div class="appbar"><div class="brand"><div class="logo">BF</div><div class="brand-name">BPI Barkada <span>FUNd</span></div></div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="eyebrow">Quick investor check</div>
        <div class="quiz-q">A few questions before you get started — this tells us (and you) what kind of investor you are.</div>
        ${QUIZ_QUESTIONS.map(q=>`
          <div class="field-label">${escapeHtml(q.q)}</div>
          <div class="quiz-group" data-qid="${q.id}">
            ${q.options.map(o=>`
              <div class="opt ${state.quizAnswers[q.id]===o.score?'sel':''}" data-score="${o.score}">
                <span>${escapeHtml(o.label)}</span><div class="radio"></div>
              </div>
            `).join('')}
          </div>
        `).join('')}
        <div id="onboardReveal">${onboardRevealHtml()}</div>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" id="onboardContinueBtn" disabled style="opacity:.5; cursor:not-allowed;">Continue</button></div>
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

        <div class="field-label">Fund Type</div>
        <div class="card" style="margin-bottom:16px;">
          <div class="h2" style="font-size:14px; margin-bottom:2px;">${FUND.label} · ${FUND.sub}</div>
          <p class="muted">${FUND.fixed}% Fixed Income (T-Bills &amp; Treasury Bonds) / ${FUND.equities}% Equities — every barkada goal uses this same fund.</p>
        </div>

        <div class="goal-preview">
          <div class="gp-label">Preview</div>
          <div class="gp-name">🎯 ${escapeHtml(state.goalName || 'Untitled Goal')}</div>
          <div class="gp-amt">${money(state.targetAmount)} target · ${FUND.label} · ${FUND.fixed}% Fixed Income / ${FUND.equities}% Equities</div>
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
        <p class="muted" style="margin-bottom:14px;">Friends can join anytime — each contribution starts its own 90-day fee-free clock from the day it's made, no matter when the member joins.</p>

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

  { id:'join', label:'Join a Barkada',
    render: () => `
      <div class="appbar"><div class="icon-btn" data-goto="entry">←</div><div class="brand-name">Join a Barkada</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="eyebrow">Join a barkada</div>
        <div class="h2">Enter your invite code</div>

        <div class="field-label">Invite code</div>
        <input class="text-field" id="joinCodeInput" value="${escapeHtml(state.joinCode||'')}" placeholder="e.g. VIET-ME26-JMA">

        <div class="field-label">Your name</div>
        <input class="text-field" id="joinNameInput" value="${escapeHtml(state.joinName||'')}" placeholder="e.g. Marco">

        <div id="joinSummarySection">
          ${(state.joinCode||'').trim() ? `
            <div class="card" style="margin-top:14px;">
              <div class="eyebrow">You're joining</div>
              <div class="h2" style="font-size:16px;">🎯 ${escapeHtml(state.goalName || 'Untitled Goal')}</div>
              <p class="muted">${money(state.targetAmount)} target</p>
            </div>
          ` : `<p class="muted" style="margin-top:14px;">Enter an invite code to see the goal you're joining.</p>`}
        </div>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" id="joinBarkadaBtn" disabled style="opacity:.5; cursor:not-allowed;">Join Barkada</button></div>
      ${tabbarHtml('dashboard')}
    `},

  { id:'dashboard', label:'Home Dashboard',
    render: () => {
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
        <div class="card portfolio-card"><div><div class="eyebrow">Your Portfolio</div><div class="val">${moneyExact(totalRemaining())}</div><div class="gain">▲ 4.2% this month</div></div><div class="pill">${FUND.label}</div></div>
        ${pct>=50?`<div class="note" style="background:var(--green-bg); border-color:#B9DCC4; color:var(--green);">🎉 Milestone unlocked! Your barkada hit ${pct}% of your goal — cashback reward applied.</div>`:''}
        <div class="card"><div class="eyebrow">Barkada Activity</div>
          ${state.activity.map(a=>`
            <div class="activity-row"><div class="activity-av">${initials(a.name)}</div><div class="activity-text"><b>${escapeHtml(a.name)}</b> ${
              a.type==='contribution' ? (state.shareAmounts ? `contributed ${money(a.amount)}` : 'contributed to the goal')
              : a.type==='redemption' ? (state.shareAmounts ? `redeemed ${money(a.amount)}` : 'redeemed funds')
              : 'hit a 3-month streak 🔥'
            }</div><div class="activity-time">${a.time}</div></div>
          `).join('')}
        </div>
      </div>
      ${tabbarHtml('dashboard')}
    `;}},

  { id:'buy', label:'Add Funds',
    render: () => {
      const freqLabel = { daily:'day', biweekly:'2 weeks', monthly:'month' }[state.autoFrequency];
      const btnLabel = state.buyMode==='onetime'
        ? `Confirm ${money(state.buyAmount)} one-time`
        : `Confirm ${money(state.buyAmount)} / ${freqLabel}`;
      const settleDate = formatDate(addBusinessDays(TODAY, 2));
      return `
      <div class="appbar"><div class="icon-btn" data-goto="monitor">←</div><div class="brand-name">Add Funds</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="amount-display"><div class="cur">PHP</div><div class="num" id="buyAmountNum">${state.buyAmount.toLocaleString('en-PH')}</div><p class="muted">Contributing to <b>${escapeHtml(state.goalName || 'your goal')}</b></p></div>
        <div class="toggle-row" id="buyModeRow">
          <div class="t ${state.buyMode==='onetime'?'on':''}" data-mode="onetime">One-time</div>
          <div class="t ${state.buyMode==='auto'?'on':''}" data-mode="auto">Auto-debit</div>
        </div>
        ${state.buyMode==='auto' ? `
        <div class="freq-row" id="freqRow">
          <div class="freq-chip ${state.autoFrequency==='daily'?'sel':''}" data-freq="daily">Daily</div>
          <div class="freq-chip ${state.autoFrequency==='biweekly'?'sel':''}" data-freq="biweekly">Biweekly</div>
          <div class="freq-chip ${state.autoFrequency==='monthly'?'sel':''}" data-freq="monthly">Monthly</div>
        </div>` : ''}
        <div class="keypad">
          <div class="key" data-key="1">1</div><div class="key" data-key="2">2</div><div class="key" data-key="3">3</div>
          <div class="key" data-key="4">4</div><div class="key" data-key="5">5</div><div class="key" data-key="6">6</div>
          <div class="key" data-key="7">7</div><div class="key" data-key="8">8</div><div class="key" data-key="9">9</div>
          <div class="key" style="opacity:.4; cursor:default;">₱</div><div class="key" data-key="0">0</div><div class="key" data-key="back">⌫</div>
        </div>
        <div class="card">
          <div class="eyebrow">If you keep this invested…</div>
          ${[90,120,360].map(d=>{
            const earn = projectedEarnings(state.buyAmount, d);
            return `<div class="projection-row"><span>${d} days</span><span>+${moneyExact(earn)}</span><span class="muted">${moneyExact(state.buyAmount+earn)} total</span></div>`;
          }).join('')}
          <p class="muted" style="margin-top:8px;">Illustrative only, based on the fund's blended ${(RATES.blended*100).toFixed(1)}% p.a. target return (70% Fixed Income / 30% Equities). Not guaranteed.</p>
        </div>
        <p class="muted" style="text-align:center;">Debited from BPI Savings •••• 4821</p>
        <p class="muted" style="text-align:center; margin-top:6px;">🕒 Funds settle T+2 (by ${settleDate}) before they start earning.</p>
        <p class="muted" style="text-align:center; margin-top:6px;">🔒 This ${money(state.buyAmount)} contribution unlocks fee-free 90 days from today — earlier contributions may already be past their own 90 days.</p>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" id="confirmBuyBtn" ${state.buyAmount<=0?'disabled style="opacity:.5; cursor:not-allowed;"':''}>${btnLabel}</button></div>
      ${tabbarHtml('monitor')}
    `;}},

  { id:'monitor', label:'Monitor Holdings',
    render: () => {
      const total = totalRemaining();
      const fixedValue = total * 0.7;
      const equitiesValue = total * 0.3;
      return `
      <div class="appbar"><div class="icon-btn" data-goto="dashboard">←</div><div class="brand-name">Your Portfolio</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="card"><div class="eyebrow">Total Value</div><div class="h2" style="font-size:26px;">${moneyExact(total)}</div><div class="gain" style="color:var(--green); font-size:12px; font-weight:800;">▲ ₱154.20 (4.2%) · 1 Year View</div></div>
        <div class="card">
          <div class="eyebrow">Asset Allocation</div>
          <div class="alloc-bar"><div class="alloc-fill fixed" style="width:70%;"></div><div class="alloc-fill equities" style="width:30%;"></div></div>
          <div class="alloc-legend">
            <span><i class="dot fixed"></i>Fixed Income · 70%</span>
            <span><i class="dot equities"></i>Equities · 30%</span>
          </div>
        </div>
        <div class="switch-row"><span style="font-size:12.5px; font-weight:800;">Advanced view</span><div class="switch on"></div></div>
        <div class="card"><div class="eyebrow">Fixed Income (${moneyExact(fixedValue)} · 70%)</div>
          <div class="holding-row"><div><div class="holding-name">91-Day Treasury Bill</div><div class="holding-sub">PH · T-Bill</div></div><div><div class="holding-val">${moneyExact(fixedValue*0.34)}</div><div class="holding-gain">▲ 0.9%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">2-Yr Treasury Bond</div><div class="holding-sub">PH · Treasury Bond</div></div><div><div class="holding-val">${moneyExact(fixedValue*0.34)}</div><div class="holding-gain">▲ 1.1%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">5-Yr Treasury Bond</div><div class="holding-sub">PH · Treasury Bond</div></div><div><div class="holding-val">${moneyExact(fixedValue*0.32)}</div><div class="holding-gain">▲ 1.4%</div></div></div>
        </div>
        <div class="card"><div class="eyebrow">Equities (${moneyExact(equitiesValue)} · 30%)</div>
          <div class="holding-row"><div><div class="holding-name">SM Investments</div><div class="holding-sub">PH · Conglomerate</div></div><div><div class="holding-val">${moneyExact(equitiesValue*0.37)}</div><div class="holding-gain">▲ 3.1%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">Jollibee Foods</div><div class="holding-sub">PH · Food Service</div></div><div><div class="holding-val">${moneyExact(equitiesValue*0.33)}</div><div class="holding-gain">▲ 2.4%</div></div></div>
          <div class="holding-row"><div><div class="holding-name">7-Eleven (PH)</div><div class="holding-sub">PH · Retail</div></div><div><div class="holding-val">${moneyExact(equitiesValue*0.30)}</div><div class="holding-gain">▲ 5.8%</div></div></div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn" style="flex:1;" data-goto="buy">Add Funds</button>
          <button class="btn secondary" style="flex:1;" data-goto="redeem">Redeem</button>
        </div>
        <button class="btn ghost" style="margin-top:10px;" data-goto="history">View Transaction History</button>
      </div>
      ${tabbarHtml('monitor')}
    `;}},

  { id:'redeem', label:'Redeem',
    render: () => {
      const total = totalRemaining();
      const { lockedTotal, soonest, soonestDaysLeft } = lockedBreakdown();
      const amount = state.redeemMode === 'full' ? total : state.redeemAmount;
      const result = computeRedemption(amount);
      const settleDate = formatDate(addBusinessDays(TODAY, 2));
      return `
      <div class="appbar"><div class="icon-btn" data-goto="monitor">←</div><div class="brand-name">Redeem Funds</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="note" style="background:#FBEAEA; border-color:#EFC2C2; color:var(--red-dark);">🔒 Each contribution unlocks fee-free 90 days after its own investment date. You can redeem anytime — a 1% early redemption fee applies only to the portion still within its own 90 days.</div>
        <div class="card"><div class="eyebrow">Available to withdraw</div><div class="h2" style="font-size:24px;">${moneyExact(total)}</div><p class="muted" style="margin-top:6px;">${lockedTotal>0 ? `${moneyExact(lockedTotal)} of this is still within its 90-day window${soonest?` · next portion turns fee-free in ${soonestDaysLeft} day${soonestDaysLeft===1?'':'s'}`:''}.` : 'All contributions are past their 90-day window — no fee applies.'}</p></div>

        <div class="toggle-row" id="redeemModeRow">
          <div class="t ${state.redeemMode==='partial'?'on':''}" data-mode="partial">Partial</div>
          <div class="t ${state.redeemMode==='full'?'on':''}" data-mode="full">Full redemption</div>
        </div>

        ${state.redeemMode==='partial' ? `
        <div class="amount-display" style="padding:14px 0;"><div class="cur">PHP</div><div class="num" id="redeemAmountNum">${Number(state.redeemAmount).toLocaleString('en-PH')}</div></div>
        <div class="keypad">
          <div class="key" data-rkey="1">1</div><div class="key" data-rkey="2">2</div><div class="key" data-rkey="3">3</div>
          <div class="key" data-rkey="4">4</div><div class="key" data-rkey="5">5</div><div class="key" data-rkey="6">6</div>
          <div class="key" data-rkey="7">7</div><div class="key" data-rkey="8">8</div><div class="key" data-rkey="9">9</div>
          <div class="key" style="opacity:.4; cursor:default;">₱</div><div class="key" data-rkey="0">0</div><div class="key" data-rkey="back">⌫</div>
        </div>
        ` : `<div class="amount-display" style="padding:14px 0;"><div class="cur">PHP</div><div class="num">${Number(total).toLocaleString('en-PH')}</div></div>`}

        <div class="card">
          <div class="eyebrow">Breakdown</div>
          <div class="fee-row"><span>Gross amount</span><span>${moneyExact(result.gross)}</span></div>
          <div class="fee-row"><span>Early redemption fee (1%)</span><span>${result.fee>0?'−'+moneyExact(result.fee):'₱0.00'}</span></div>
          <div class="fee-row total"><span>Net proceeds</span><span>${moneyExact(result.net)}</span></div>
        </div>
        <p class="muted" style="text-align:center;">Proceeds sent to BPI Savings •••• 4821</p>
        <p class="muted" style="text-align:center; margin-top:6px;">🕒 Net proceeds settle T+2 (by ${settleDate}).</p>
      </div>
      <div style="padding:14px 20px 14px;"><button class="btn" id="confirmRedeemBtn" ${result.gross<=0?'disabled style="opacity:.5; cursor:not-allowed;"':''}>Redeem ${moneyExact(result.net)}</button><button class="btn ghost" style="margin-top:10px;">Vote to End Barkada Goal</button></div>
      ${tabbarHtml('monitor')}
    `;}},

  { id:'history', label:'Transaction History',
    render: () => {
      const txnRows = state.transactions.map(t => ({ ...t, kind:'txn' }));
      const accrualRows = dailyAccrualRows(7).map(r => ({ ...r, kind:'accrual' }));
      const all = [...txnRows, ...accrualRows].sort((a,b)=> b.date - a.date);
      return `
      <div class="appbar"><div class="icon-btn" data-goto="monitor">←</div><div class="brand-name">Transaction History</div><div class="icon-btn hamburger-btn">☰</div></div>
      <div class="content">
        <div class="note">💡 Daily interest accrual below is an illustrative estimate on your current settled balance at the blended ${(RATES.blended*100).toFixed(1)}% p.a. rate — actual NAVPS movement may vary day to day.</div>
        <div class="card">
          ${all.map(row => row.kind==='txn' ? txnRowHtml(row) : accrualRowHtml(row)).join('')}
        </div>
        <p class="muted" style="text-align:center; margin-top:4px;">Showing the last 7 days of interest accrual alongside your full transaction history.</p>
      </div>
      ${tabbarHtml('monitor')}
    `;}},
];

const SIDEBAR_ITEMS = [
  { id:'entry',     icon:'👋', label:'Create or Join' },
  { id:'dashboard', icon:'🏠', label:'Home' },
  { id:'goal',      icon:'🎯', label:'Set Goal' },
  { id:'members',   icon:'👥', label:'Barkada Members' },
  { id:'join',      icon:'🔑', label:'Join a Barkada' },
  { id:'monitor',   icon:'💰', label:'Portfolio' },
  { id:'buy',       icon:'➕', label:'Add Funds' },
  { id:'redeem',    icon:'🔄', label:'Redeem' },
  { id:'history',   icon:'🧾', label:'Transaction History' },
];

function inviteCode(){
  const slug = (state.goalName||'GOAL').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4) || 'GOAL';
  return `${slug}-ST26-JMA`;
}

let currentIdx = 0; // start on the entry screen — create vs. join is the first real decision

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

  if (id === 'entry'){
    document.getElementById('createCard').onclick = ()=>{
      state.userRole = 'creator';
      goToScreen('onboard');
    };
    document.getElementById('joinCard').onclick = ()=>{
      state.userRole = 'joiner';
      goToScreen('onboard');
    };
  }

  if (id === 'onboard'){
    const refreshReveal = ()=>{
      document.getElementById('onboardReveal').innerHTML = onboardRevealHtml();
      const checkbox = document.getElementById('onboardDisclaimerCheck');
      if (checkbox) checkbox.onchange = updateOnboardButton;
      updateOnboardButton();
    };
    document.querySelectorAll('.quiz-group').forEach(group=>{
      const qid = group.dataset.qid;
      group.querySelectorAll('.opt').forEach(opt=>{
        opt.onclick = ()=>{
          state.quizAnswers[qid] = Number(opt.dataset.score);
          group.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));
          opt.classList.add('sel');
          refreshReveal();
        };
      });
    });
    refreshReveal();
    document.getElementById('onboardContinueBtn').onclick = ()=>{
      state.investorType = computeInvestorType();
      goToScreen(state.userRole === 'joiner' ? 'join' : 'goal');
    };
  }

  if (id === 'join'){
    document.getElementById('joinCodeInput').addEventListener('input', (e)=>{
      state.joinCode = e.target.value;
      updateJoinSummary();
    });
    document.getElementById('joinNameInput').addEventListener('input', (e)=>{
      state.joinName = e.target.value;
    });
    updateJoinSummary();
    document.getElementById('joinBarkadaBtn').onclick = ()=>{
      const name = (state.joinName||'').trim();
      if (name) state.members.push({ name });
      goToScreen('dashboard');
    };
  }

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
    document.querySelectorAll('#buyModeRow .t').forEach(el=>{
      el.onclick = ()=>{ state.buyMode = el.dataset.mode; renderScreen(); };
    });
    document.querySelectorAll('#freqRow .freq-chip').forEach(el=>{
      el.onclick = ()=>{ state.autoFrequency = el.dataset.freq; renderScreen(); };
    });
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
      const now = new Date(TODAY);
      state.currentAmount += state.buyAmount;
      state.contributions.push({ id: ++lotId, amount: state.buyAmount, remaining: state.buyAmount, date: now, member:'You' });
      state.transactions.unshift(makeTxn('contribution', state.buyAmount, 0, now, 'You'));
      state.activity.unshift({ name:'You', type:'contribution', amount: state.buyAmount, time:'Just now' });
      state.buyAmount = 500;
      goToScreen('dashboard');
    };
  }

  if (id === 'redeem'){
    document.querySelectorAll('#redeemModeRow .t').forEach(el=>{
      el.onclick = ()=>{
        state.redeemMode = el.dataset.mode;
        if (state.redeemMode === 'partial' && state.redeemAmount === 0) state.redeemAmount = Math.min(500, totalRemaining());
        renderScreen();
      };
    });
    document.querySelectorAll('.key[data-rkey]').forEach(key=>{
      key.onclick = ()=>{
        const k = key.dataset.rkey;
        if (k === 'back'){
          state.redeemAmount = Math.floor(state.redeemAmount / 10);
        } else {
          const next = state.redeemAmount * 10 + Number(k);
          if (next <= totalRemaining()) state.redeemAmount = next;
        }
        renderScreen();
      };
    });
    const confirmBtn = document.getElementById('confirmRedeemBtn');
    if (confirmBtn) confirmBtn.onclick = ()=>{
      const amount = state.redeemMode === 'full' ? totalRemaining() : state.redeemAmount;
      if (amount <= 0) return;
      const result = applyRedemption(amount);
      state.activity.unshift({ name:'You', type:'redemption', amount: result.net, time:'Just now' });
      state.redeemAmount = 0;
      state.redeemMode = 'full';
      goToScreen('monitor');
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
  box.querySelector('.gp-name').textContent = '🎯 ' + (state.goalName || 'Untitled Goal');
  box.querySelector('.gp-amt').textContent = `${money(state.targetAmount)} target · ${FUND.label} · ${FUND.fixed}% Fixed Income / ${FUND.equities}% Equities`;
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
