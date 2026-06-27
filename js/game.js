// clean reel engine
const IMG = {
  BAR:"img/bar.png",
  BELL:"img/bell.png",
  CHERRY:"img/cherry.png",
  CLOWN:"img/clown.png",
  DOG:"img/dog.png",
  GRAPE:"img/grape.png",
  SEVEN:"img/seven.png"
};

// 番号対応: 1=BAR, 2=ベル, 3=チェリー, 4=ピエロ, 5=犬, 6=ぶどう, 7=7
const NUM = { "1":"BAR", "2":"BELL", "3":"CHERRY", "4":"CLOWN", "5":"DOG", "6":"GRAPE", "7":"SEVEN" };

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

const SETTINGS = {
  1:{big:1/273.1,reg:1/439.8,grape:1/6.5,cherry:1/35,clown:1/7.3,bell:1/1200},
  2:{big:1/270.8,reg:1/399.6,grape:1/6.45,cherry:1/35,clown:1/7.3,bell:1/1200},
  3:{big:1/266.4,reg:1/331.0,grape:1/6.35,cherry:1/35,clown:1/7.3,bell:1/1200},
  4:{big:1/260.1,reg:1/315.1,grape:1/6.25,cherry:1/35,clown:1/7.3,bell:1/1200},
  5:{big:1/255,reg:1/255,grape:1/6.15,cherry:1/35,clown:1/7.3,bell:1/1200},
  6:{big:1/255,reg:1/255,grape:1/6.05,cherry:1/35,clown:1/7.3,bell:1/1200}
};

const H = 112;
const MAX_SLIP = 4;
const SPEED_CELLS = 18;   // コマ/秒
const STOP_MS = 280;
const WAIT_MS = 4100;
const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;
const ease = t => 1 - Math.pow(1 - t, 3);

class Reel {
  constructor(index, el) {
    this.index = index;
    this.el = el;
    this.strip = STRIPS[index];
    this.len = this.strip.length;
    this.center = 0;        // 中段にある絵柄番号。整数ならズレなし。
    this.spinning = false;
    this.stopping = false;
    this.last = 0;
    this.raf = null;

    this.el.innerHTML = '<div class="strip"></div>';
    this.stripEl = this.el.firstChild;
    this.build();
    this.apply();
  }

  build() {
    this.stripEl.innerHTML = "";
    // 3周分。真ん中の周を表示基準にする。
    for (let loop = 0; loop < 3; loop++) {
      for (const sym of this.strip) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.innerHTML = `<img src="${IMG[sym]}" alt="${sym}">`;
        this.stripEl.appendChild(cell);
      }
    }
  }

  apply() {
    const c = mod(this.center, this.len);
    const y = H - (this.len + c) * H;
    this.stripEl.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  currentIndex() {
    return mod(Math.round(this.center), this.len);
  }

  currentSymbol() {
    return this.strip[this.currentIndex()];
  }

  symbolAt(index) {
    return this.strip[mod(index, this.len)];
  }

  start() {
    if (this.spinning) return;
    this.spinning = true;
    this.stopping = false;
    this.last = performance.now();

    const tick = ts => {
      if (!this.spinning || this.stopping) return;
      const dt = (ts - this.last) / 1000;
      this.last = ts;

      // 上から下へ流れる見た目。
      // 見た目が逆なら、ここを「-=」にするだけで全体が逆になります。
      this.center += SPEED_CELLS * dt;

      this.apply();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  findTargetIndex(symbol) {
    const current = this.currentIndex();
    // centerが増える方向に滑る。停止可能範囲 current〜current+4
    for (let slip = 0; slip <= MAX_SLIP; slip++) {
      const idx = mod(current + slip, this.len);
      if (this.symbolAt(idx) === symbol) return idx;
    }
    return null;
  }

  targetCenterForIndex(index) {
    let target = this.center + mod(index - this.currentIndex(), this.len);
    if (target - this.center < 0.25) target += this.len;
    return target;
  }

  stopAt(index, done) {
    if (!this.spinning || this.stopping) return;
    this.stopping = true;
    cancelAnimationFrame(this.raf);

    const from = this.center;
    const to = this.targetCenterForIndex(index);
    const start = performance.now();

    const tick = ts => {
      const t = Math.min(1, (ts - start) / STOP_MS);
      this.center = from + (to - from) * ease(t);
      this.apply();

      if (t < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.center = Math.round(to);
        this.apply();
        this.spinning = false;
        this.stopping = false;
        done && done();
      }
    };
    this.raf = requestAnimationFrame(tick);
  }
}

const reels = [0,1,2].map(i => new Reel(i, $("reel" + i)));

let state = JSON.parse(localStorage.getItem("wanwanSlotClean") || "null") || {
  credit: 50,
  bet: 0,
  diff: 0,
  games: 0,
  bigCount: 0,
  regCount: 0,
  lastPayout: 0,
  bonusStock: null,
  bonus: null,
  replay: false
};

let flag = null;
let spinning = false;
let stopped = [false,false,false];
let stoppedSymbols = [];
let lastStart = 0;

function save(){ localStorage.setItem("wanwanSlotClean", JSON.stringify(state)); }

function msg(text){ $("message").textContent = text; }

function render(){
  $("credit").textContent = state.credit;
  $("bet").textContent = state.bet;
  $("payout").textContent = state.lastPayout;
  $("diff").textContent = state.diff;
  $("games").textContent = state.games;
  $("bigCount").textContent = state.bigCount;
  $("regCount").textContent = state.regCount;
  const total = state.bigCount + state.regCount;
  $("totalRate").textContent = total ? `1/${Math.round(state.games / total)}` : "-";
  $("lamp").classList.toggle("on", !!state.bonusStock);
  $("bonusPanel").classList.toggle("active", !!state.bonus);
  if (state.bonus) {
    $("bonusType").textContent = state.bonus.type;
    $("bonusRemain").textContent = state.bonus.remaining;
  }
  save();
}

function buttons(){
  $("betBtn").disabled = spinning || !!state.bonus || (state.bet >= 3 && !state.replay);
  $("leverBtn").disabled = spinning || (!state.bonus && state.bet < 3);
  [0,1,2].forEach(i => $("stop" + i).disabled = !spinning || stopped[i] || reels[i].stopping);
}

function drawFlag(){
  const s = SETTINGS[$("setting").value] || SETTINGS[6];
  const r = Math.random();
  let p = 0;

  if (!state.bonusStock) {
    p += s.big; if (r < p) return {type:"BIG"};
    p += s.reg; if (r < p) return {type:"REG"};
  }

  p += s.grape; if (r < p) return {type:"GRAPE"};
  p += s.cherry; if (r < p) {
    const dup = !state.bonusStock && Math.random() < 0.05;
    return dup ? {type:"CHERRY_BONUS", bonus: Math.random() < 0.55 ? "BIG" : "REG"} : {type:"CHERRY"};
  }
  p += s.clown; if (r < p) return {type:"CLOWN"};
  p += s.bell; if (r < p) return {type:"BELL"};
  return {type:"MISS"};
}

function targetSymbol(){
  if (flag.type === "GRAPE") return "GRAPE";
  if (flag.type === "CHERRY" || flag.type === "CHERRY_BONUS") return "CHERRY";
  if (flag.type === "CLOWN") return "CLOWN";
  if (flag.type === "BELL") return "BELL";
  if (state.bonusStock === "BIG") return "SEVEN";
  if (state.bonusStock === "REG") return "BAR";
  return null;
}

function chooseStopIndex(reel){
  const target = targetSymbol();

  if (target) {
    const idx = reel.findTargetIndex(target);
    if (idx !== null) return idx;
  }

  const cur = reel.currentIndex();
  for (let slip = 0; slip <= MAX_SLIP; slip++) {
    const idx = mod(cur + slip, reel.len);
    const sym = reel.symbolAt(idx);
    const a = stoppedSymbols.filter(Boolean);
    if (a.length >= 2 && a[0] === a[1] && sym === a[0]) continue;
    if (["SEVEN","BAR"].includes(sym) && !state.bonusStock) continue;
    return idx;
  }
  return cur;
}

function bet(){
  if (spinning || state.bonus) return;

  if (state.replay) {
    state.bet = 3;
    msg("再遊技。レバーON");
    render(); buttons(); return;
  }

  if (state.bet >= 3) return;
  if (state.credit <= 0) { msg("クレジット不足"); return; }

  const put = Math.min(3 - state.bet, state.credit);
  state.credit -= put;
  state.bet += put;
  state.diff -= put;
  msg("レバーON");
  render(); buttons();
}

function lever(){
  if (spinning) return;
  if (!state.bonus && state.bet < 3) { msg("先にBET"); return; }

  const now = Date.now();
  if (now - lastStart < WAIT_MS) { msg("ウェイト中..."); return; }
  lastStart = now;

  state.lastPayout = 0;
  state.replay = false;
  stopped = [false,false,false];
  stoppedSymbols = [];

  if (state.bonus) {
    flag = {type:"BONUS_GAME"};
  } else {
    flag = drawFlag();
    if (flag.type === "BIG" || flag.type === "REG") state.bonusStock = flag.type;
    if (flag.type === "CHERRY_BONUS") state.bonusStock = flag.bonus;
  }

  spinning = true;
  reels.forEach(r => r.start());
  msg("停止ボタンを押してね");
  render(); buttons();
}

function stop(i){
  if (!spinning || stopped[i] || reels[i].stopping) return;

  const idx = chooseStopIndex(reels[i]);
  stopped[i] = true;
  buttons();

  reels[i].stopAt(idx, () => {
    stoppedSymbols[i] = reels[i].currentSymbol();

    if (stopped.every(Boolean)) {
      finish();
    } else {
      msg("残りのリールを停止");
    }
    buttons();
  });
}

function bonusPay(){
  const pay = Math.min(15, state.bonus.remaining);
  state.bonus.remaining -= pay;
  return pay;
}

function finish(){
  spinning = false;
  const line = reels.map(r => r.currentSymbol());
  let payout = 0;
  let m = "ハズレ";

  if (state.bonus) {
    payout = bonusPay();
    m = `${state.bonus.type}中 ${payout}枚`;
    if (state.bonus.remaining <= 0) {
      state.bonus = null;
      m = "BONUS終了";
    }
  } else if (line.every(x => x === "SEVEN")) {
    state.bonus = {type:"BIG", remaining:252};
    state.bonusStock = null;
    state.bigCount++;
    m = "BIG BONUS開始！";
  } else if (line.every(x => x === "BAR")) {
    state.bonus = {type:"REG", remaining:96};
    state.bonusStock = null;
    state.regCount++;
    m = "REG BONUS開始！";
  } else if (line.every(x => x === "CLOWN")) {
    state.replay = true;
    state.bet = 3;
    m = "再遊技。BETなしで次ゲーム";
  } else if (line.every(x => x === "GRAPE")) {
    payout = 7;
    m = "ぶどう 7枚";
  } else if (line.includes("CHERRY") && (flag.type === "CHERRY" || flag.type === "CHERRY_BONUS")) {
    payout = 2;
    m = "チェリー 2枚";
  } else if (line.every(x => x === "BELL")) {
    payout = 10;
    m = "ベル 10枚";
  } else if (state.bonusStock) {
    m = `${state.bonusStock}成立中。狙って揃えてね`;
  }

  if (!state.bonus && !state.replay) state.bet = 0;
  if (payout > 0) {
    state.credit += payout;
    state.diff += payout;
  }

  state.lastPayout = payout;
  state.games++;
  msg(m);
  render(); buttons();
}

$("betBtn").onclick = bet;
$("leverBtn").onclick = lever;
[0,1,2].forEach(i => $("stop" + i).onclick = () => stop(i));
$("resetBtn").onclick = () => { localStorage.removeItem("wanwanSlotClean"); location.reload(); };

render(); buttons();
