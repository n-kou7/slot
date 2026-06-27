const IMG = {
  BAR:"img/bar.png",
  BELL:"img/bell.png",
  CHERRY:"img/cherry.png",
  CLOWN:"img/clown.png",
  DOG:"img/dog.png",
  GRAPE:"img/grape.png",
  SEVEN:"img/seven.png"
};

const LABEL = {
  BAR:"BAR",
  BELL:"ベル",
  CHERRY:"チェリー",
  CLOWN:"ピエロ",
  DOG:"犬",
  GRAPE:"ぶどう",
  SEVEN:"7"
};

// 番号対応: 1=BAR, 2=ベル, 3=チェリー, 4=ピエロ, 5=犬, 6=ぶどう, 7=7
const NUM = { "1":"BAR", "2":"BELL", "3":"CHERRY", "4":"CLOWN", "5":"DOG", "6":"GRAPE", "7":"SEVEN" };

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

const H = 112;
const SPEED = 17;      // コマ/秒
const STOP_MS = 300;
const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;
const easeOut = t => 1 - Math.pow(1 - t, 3);

class Reel {
  constructor(index, el) {
    this.index = index;
    this.el = el;
    this.strip = STRIPS[index];
    this.len = this.strip.length;

    // center = 中段にあるコマ番号。整数ならピッタリ停止。
    this.center = 0;
    this.running = false;
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
    // 3周分を描画。真ん中の周を基準に表示。
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
    // 画面の中段に、真ん中周の c 番目の絵柄を合わせる
    const y = H - (this.len + c) * H;
    this.stripEl.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  currentIndex() {
    return mod(Math.round(this.center), this.len);
  }

  currentSymbol() {
    return this.strip[this.currentIndex()];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    this.last = performance.now();

    const tick = ts => {
      if (!this.running || this.stopping) return;

      const dt = (ts - this.last) / 1000;
      this.last = ts;

      // 回転方向。
      // これで逆なら、下の += を -= に変えればOK。
      this.center += SPEED * dt;

      this.apply();
      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  stop(done) {
    if (!this.running || this.stopping) return;
    this.stopping = true;
    cancelAnimationFrame(this.raf);

    const from = this.center;

    // 2〜5コマ先で整数に止める。毎回ピッタリ整数に丸めるのでズレない。
    const slip = 2 + Math.floor(Math.random() * 4);
    const to = Math.ceil(this.center) + slip;

    const start = performance.now();

    const tick = ts => {
      const t = Math.min(1, (ts - start) / STOP_MS);
      this.center = from + (to - from) * easeOut(t);
      this.apply();

      if (t < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.center = Math.round(to);
        this.apply();
        this.running = false;
        this.stopping = false;
        done && done();
      }
    };

    this.raf = requestAnimationFrame(tick);
  }

  reset() {
    cancelAnimationFrame(this.raf);
    this.center = 0;
    this.running = false;
    this.stopping = false;
    this.apply();
  }
}

const reels = [0,1,2].map(i => new Reel(i, $("reel" + i)));
let spinning = false;
let stopped = [false,false,false];

function setMessage(t) {
  $("message").textContent = t;
}

function updateInfo() {
  reels.forEach((r,i) => {
    $("v" + i).textContent = `${r.currentIndex()+1}コマ目 / ${LABEL[r.currentSymbol()]}`;
  });
}

function updateButtons() {
  $("leverBtn").disabled = spinning;
  [0,1,2].forEach(i => {
    $("stop" + i).disabled = !spinning || stopped[i] || reels[i].stopping;
  });
}

function lever() {
  if (spinning) return;

  spinning = true;
  stopped = [false,false,false];

  reels.forEach(r => r.start());
  setMessage("停止ボタンを押してね");
  updateButtons();
}

function stop(i) {
  if (!spinning || stopped[i] || reels[i].stopping) return;

  stopped[i] = true;
  updateButtons();

  reels[i].stop(() => {
    updateInfo();

    if (stopped.every(Boolean)) {
      spinning = false;
      setMessage("停止完了。もう一度レバーON");
    } else {
      setMessage("残りのリールを停止");
    }

    updateButtons();
  });
}

function reset() {
  spinning = false;
  stopped = [false,false,false];
  reels.forEach(r => r.reset());
  setMessage("位置リセット。レバーONでリール回転");
  updateInfo();
  updateButtons();
}

$("leverBtn").onclick = lever;
[0,1,2].forEach(i => $("stop" + i).onclick = () => stop(i));
$("resetBtn").onclick = reset;

updateInfo();
updateButtons();
