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

// 1=BAR, 2=ベル, 3=チェリー, 4=ピエロ, 5=犬, 6=ぶどう, 7=7
const NUM = { "1":"BAR", "2":"BELL", "3":"CHERRY", "4":"CLOWN", "5":"DOG", "6":"GRAPE", "7":"SEVEN" };

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

const H = 112;
const SPEED = 16;      // コマ/秒
const STOP_MS = 320;
const DIRECTION = -1;  // -1: 上から下へ流れる見え方 / 1: 逆方向
const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;
const easeOut = t => 1 - Math.pow(1 - t, 3);

class Reel {
  constructor(index, el) {
    this.index = index;
    this.el = el;
    this.strip = STRIPS[index];
    this.len = this.strip.length;

    // center = 中段ラインにある絵柄番号。整数停止でズレなし。
    this.center = 0;
    this.running = false;
    this.stopping = false;
    this.raf = null;
    this.last = 0;

    this.el.innerHTML = '<div class="strip"></div>';
    this.stripEl = this.el.firstChild;
    this.draw();
  }

  currentInteger() {
    return mod(Math.round(this.center), this.len);
  }

  currentSymbol() {
    return this.strip[this.currentInteger()];
  }

  draw() {
    const nearest = Math.round(this.center);
    const diff = this.center - nearest;

    // DIRECTION=-1の時、絵柄が上から下に流れるように位置補正
    const y = -H - diff * H;

    this.stripEl.style.transform = `translate3d(0, ${y}px, 0)`;
    this.stripEl.innerHTML = "";

    // 5コマだけ描く。画面外へ飛ばない方式。
    for (let row = -2; row <= 2; row++) {
      const idx = mod(nearest + row, this.len);
      const sym = this.strip[idx];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<img src="${IMG[sym]}" alt="${sym}">`;
      this.stripEl.appendChild(cell);
    }
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

      this.center += DIRECTION * SPEED * dt;
      this.draw();

      this.raf = requestAnimationFrame(tick);
    };

    this.raf = requestAnimationFrame(tick);
  }

  stop(done) {
    if (!this.running || this.stopping) return;
    this.stopping = true;
    cancelAnimationFrame(this.raf);

    const from = this.center;
    const slip = 2 + Math.floor(Math.random() * 4);

    // 回転方向に合わせて整数コマへ停止
    let to;
    if (DIRECTION < 0) {
      to = Math.floor(this.center) - slip;
    } else {
      to = Math.ceil(this.center) + slip;
    }

    const start = performance.now();

    const tick = ts => {
      const t = Math.min(1, (ts - start) / STOP_MS);
      this.center = from + (to - from) * easeOut(t);
      this.draw();

      if (t < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.center = Math.round(to);
        this.draw();
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
    this.draw();
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
    $("v" + i).textContent = `${r.currentInteger()+1}コマ目 / ${LABEL[r.currentSymbol()]}`;
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
