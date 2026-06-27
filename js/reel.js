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

const NUM = {"1":"BAR","2":"BELL","3":"CHERRY","4":"CLOWN","5":"DOG","6":"GRAPE","7":"SEVEN"};

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));
const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;
const H = 112;

// 前回の「方向修正版」と同じ見た目で、スライドだけ滑らかにする。
class Reel {
  constructor(i) {
    this.i = i;
    this.strip = STRIPS[i];
    this.len = this.strip.length;
    this.pos = 0; // 中段
    this.stripEl = $("strip" + i);
    this.running = false;
    this.stopping = false;
    this.stepTimer = null;
    this.animating = false;
    this.drawBase();
  }

  // 4コマ描画。transform -112px の状態で 2〜4番目が見える。
  // 見える3段: 上=pos+1 / 中=pos / 下=pos-1
  drawBase() {
    const rows = [
      mod(this.pos + 2, this.len),
      mod(this.pos + 1, this.len),
      mod(this.pos, this.len),
      mod(this.pos - 1, this.len)
    ];

    this.stripEl.innerHTML = "";
    for (const idx of rows) {
      const sym = this.strip[idx];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<img src="${IMG[sym]}" alt="${sym}">`;
      this.stripEl.appendChild(cell);
    }
    this.stripEl.style.transition = "none";
    this.stripEl.style.transform = `translate3d(0, -${H}px, 0)`;
  }

  // 1コマぶん滑らかに進める。
  // -112px → 0px に動かすことで、上の絵柄が下に落ちてくる見た目。
  animateOne(duration, done) {
    if (this.animating) return;
    this.animating = true;
    this.drawBase();

    requestAnimationFrame(() => {
      this.stripEl.style.transition = `transform ${duration}ms linear`;
      this.stripEl.style.transform = "translate3d(0, 0px, 0)";

      setTimeout(() => {
        this.pos = mod(this.pos + 1, this.len);
        this.drawBase();
        this.animating = false;
        if (done) done();
      }, duration + 8);
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stopping = false;

    const loop = () => {
      if (!this.running || this.stopping) return;
      this.animateOne(58, () => {
        this.stepTimer = setTimeout(loop, 0);
      });
    };
    loop();
  }

  stop(callback) {
    if (!this.running || this.stopping) return;
    this.stopping = true;
    clearTimeout(this.stepTimer);

    let slip = 3 + Math.floor(Math.random() * 3);
    const durations = [78, 105, 135, 170, 215, 260];

    const slide = () => {
      const d = durations[Math.min(durations.length - 1, durations.length - slip)];
      this.animateOne(d, () => {
        slip--;
        if (slip > 0) {
          slide();
        } else {
          this.running = false;
          this.stopping = false;
          this.drawBase();
          if (callback) callback();
        }
      });
    };
    slide();
  }

  reset() {
    clearTimeout(this.stepTimer);
    this.pos = 0;
    this.running = false;
    this.stopping = false;
    this.animating = false;
    this.drawBase();
  }

  currentSymbol() {
    return this.strip[mod(this.pos, this.len)];
  }
}

const reels = [new Reel(0), new Reel(1), new Reel(2)];
let spinning = false;
let stopped = [false,false,false];

function setMessage(t){ $("message").textContent = t; }

function updateInfo() {
  reels.forEach((r,i) => {
    $("info" + i).textContent = `${r.pos + 1}コマ目 / ${LABEL[r.currentSymbol()]}`;
  });
}

function updateButtons() {
  $("leverBtn").disabled = spinning;
  for (let i = 0; i < 3; i++) {
    $("stop" + i).disabled = !spinning || stopped[i] || reels[i].stopping;
  }
}

function leverOn() {
  if (spinning) return;
  spinning = true;
  stopped = [false,false,false];
  reels.forEach(r => r.start());
  setMessage("停止ボタンを押してね");
  updateButtons();
}

function stopReel(i) {
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

function resetAll() {
  spinning = false;
  stopped = [false,false,false];
  reels.forEach(r => r.reset());
  setMessage("レバーONでリール回転");
  updateInfo();
  updateButtons();
}

$("leverBtn").onclick = leverOn;
$("stop0").onclick = () => stopReel(0);
$("stop1").onclick = () => stopReel(1);
$("stop2").onclick = () => stopReel(2);
$("resetBtn").onclick = resetAll;

updateInfo();
updateButtons();
