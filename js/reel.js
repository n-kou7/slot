// WAN WAN REEL ZERO ENGINE
// まずはリールだけ。抽選・ボーナスなし。
// 指定配列をそのまま使い、3コマ表示・停止後ズレなし。

const IMG = {
  BAR: "img/bar.png",
  BELL: "img/bell.png",
  CHERRY: "img/cherry.png",
  CLOWN: "img/clown.png",
  DOG: "img/dog.png",
  GRAPE: "img/grape.png",
  SEVEN: "img/seven.png"
};

const LABEL = {
  BAR: "BAR",
  BELL: "ベル",
  CHERRY: "チェリー",
  CLOWN: "ピエロ",
  DOG: "犬",
  GRAPE: "ぶどう",
  SEVEN: "7"
};

// 1=BAR, 2=ベル, 3=チェリー, 4=ピエロ, 5=犬, 6=ぶどう, 7=7
const NUM = {
  "1": "BAR",
  "2": "BELL",
  "3": "CHERRY",
  "4": "CLOWN",
  "5": "DOG",
  "6": "GRAPE",
  "7": "SEVEN"
};

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

const CELL_H = 112;
const REEL_SPEED = 18;     // コマ/秒
const STOP_TIME = 330;     // ms
const STOP_EXTRA_MIN = 2;
const STOP_EXTRA_MAX = 5;

// 前回と逆の回転方向で固定。
// ここは画面に出さない。必要なら 1 と -1 を入れ替えるだけ。
const SPIN_DIR = 1;

const $ = id => document.getElementById(id);
const mod = (n, m) => ((n % m) + m) % m;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

class Reel {
  constructor(index, element) {
    this.index = index;
    this.element = element;
    this.strip = STRIPS[index];
    this.len = this.strip.length;

    // position は「中段にあるコマ番号」。
    // 整数なら完全停止。小数なら回転中。
    this.position = 0;

    this.running = false;
    this.stopping = false;
    this.raf = null;
    this.lastTime = 0;

    this.element.innerHTML = '<div class="strip"></div>';
    this.stripEl = this.element.firstElementChild;

    this.render();
  }

  indexAtCenter() {
    return mod(Math.round(this.position), this.len);
  }

  symbolAtCenter() {
    return this.strip[this.indexAtCenter()];
  }

  render() {
    const nearest = Math.round(this.position);
    const fraction = this.position - nearest;

    // 5コマだけ描画。
    // row -2/-1/0/1/2 を並べ、row 0 が中段に来る。
    this.stripEl.innerHTML = "";

    for (let row = -2; row <= 2; row++) {
      const idx = mod(nearest + row, this.len);
      const sym = this.strip[idx];

      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<img src="${IMG[sym]}" alt="${sym}">`;
      this.stripEl.appendChild(cell);
    }

    // 5コマのうち、row 0 を中段へ合わせる。
    // fraction によって滑らかにスクロール。
    // SPIN_DIR=1 の時、前回版と逆に見えるように fraction をそのまま使う。
    const y = -CELL_H - fraction * CELL_H;
    this.stripEl.style.transform = `translate3d(0, ${y}px, 0)`;
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.stopping = false;
    this.lastTime = performance.now();

    const tick = now => {
      if (!this.running || this.stopping) return;

      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.position += SPIN_DIR * REEL_SPEED * dt;
      this.render();

      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  stop(callback) {
    if (!this.running || this.stopping) return;

    this.stopping = true;
    cancelAnimationFrame(this.raf);

    const from = this.position;
    const extra = STOP_EXTRA_MIN + Math.floor(Math.random() * (STOP_EXTRA_MAX - STOP_EXTRA_MIN + 1));

    // 回転方向の先にある整数コマへ止める。
    let target;
    if (SPIN_DIR > 0) {
      target = Math.ceil(from) + extra;
    } else {
      target = Math.floor(from) - extra;
    }

    const start = performance.now();

    const tick = now => {
      const t = Math.min(1, (now - start) / STOP_TIME);
      this.position = from + (target - from) * easeOutCubic(t);
      this.render();

      if (t < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.position = Math.round(target);
        this.render();

        this.running = false;
        this.stopping = false;

        if (callback) callback();
      }
    };

    this.raf = requestAnimationFrame(tick);
  }

  reset() {
    cancelAnimationFrame(this.raf);
    this.position = 0;
    this.running = false;
    this.stopping = false;
    this.render();
  }
}

const reels = [0, 1, 2].map(i => new Reel(i, $("reel" + i)));

let spinning = false;
let stopped = [false, false, false];

function setMessage(text) {
  $("message").textContent = text;
}

function updateInfo() {
  reels.forEach((reel, i) => {
    $("info" + i).textContent =
      `${reel.indexAtCenter() + 1}コマ目 / ${LABEL[reel.symbolAtCenter()]}`;
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
  stopped = [false, false, false];

  reels.forEach(reel => reel.start());

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
  stopped = [false, false, false];

  reels.forEach(reel => reel.reset());

  setMessage("位置リセット。レバーONでリール回転");
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
