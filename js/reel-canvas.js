const IMG_SRC = {
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
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const CELL_H = 112;
const SPEED = 15.5;       // コマ/秒。ここを上げると速くなる
const STOP_MS = 620;      // 停止時の減速時間
const SPIN_DIR = 1;       // 現在の正しい方向を維持

const canvas = $("reelCanvas");
const ctx = canvas.getContext("2d");

let W = 780;
let H = 336;
let reelW = 260;
let dpr = 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  W = Math.max(1, Math.round(rect.width));
  H = Math.max(1, Math.round(rect.height));
  reelW = W / 3;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

class Reel {
  constructor(i) {
    this.i = i;
    this.strip = STRIPS[i];
    this.len = this.strip.length;
    this.pos = 0;          // 中段位置。小数で連続スクロール
    this.running = false;
    this.stopping = false;
    this.stopFrom = 0;
    this.stopTo = 0;
    this.stopStart = 0;
  }

  start() {
    this.running = true;
    this.stopping = false;
  }

  stop() {
    if (!this.running || this.stopping) return;
    this.stopping = true;
    this.stopFrom = this.pos;

    const extra = 3 + Math.floor(Math.random() * 4);
    this.stopTo = Math.ceil(this.pos) + extra;

    this.stopStart = performance.now();
  }

  update(dt, now) {
    if (this.stopping) {
      const t = Math.min(1, (now - this.stopStart) / STOP_MS);
      this.pos = this.stopFrom + (this.stopTo - this.stopFrom) * easeOutCubic(t);

      if (t >= 1) {
        this.pos = Math.round(this.stopTo);
        this.running = false;
        this.stopping = false;
      }
      return;
    }

    if (this.running) {
      this.pos += SPIN_DIR * SPEED * dt;
    }
  }

  centerIndex() {
    return mod(Math.round(this.pos), this.len);
  }

  centerSymbol() {
    return this.strip[this.centerIndex()];
  }

  draw(x, width) {
    const base = Math.floor(this.pos);
    const frac = this.pos - base;

    const centerY = H / 2 - CELL_H / 2;

    // 背景
    const grad = ctx.createLinearGradient(x, 0, x + width, 0);
    grad.addColorStop(0, "#dddddd");
    grad.addColorStop(0.5, "#ffffff");
    grad.addColorStop(1, "#dddddd");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, width, H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, width, H);
    ctx.clip();

    // この描画式で、pos が増えると上の絵柄が下へ流れる
    for (let k = -3; k <= 3; k++) {
      const idx = mod(base + k, this.len);
      const sym = this.strip[idx];

      const y = centerY - k * CELL_H + frac * CELL_H;
      const img = images[sym];

      // セル境界
      ctx.strokeStyle = "#dddddd";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, CELL_H);

      if (img && img.complete) {
        const padX = width * 0.08;
        const padY = CELL_H * 0.04;
        const boxW = width - padX * 2;
        const boxH = CELL_H - padY * 2;

        const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;
        const drawX = x + (width - drawW) / 2;
        const drawY = y + (CELL_H - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
    }

    ctx.restore();

    // リール区切り線
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    if (this.i > 0) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // うっすら影
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,.18)");
    shade.addColorStop(.25, "rgba(0,0,0,0)");
    shade.addColorStop(.75, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,.18)");
    ctx.fillStyle = shade;
    ctx.fillRect(x, 0, width, H);
  }
}

let images = {};
let reels = [new Reel(0), new Reel(1), new Reel(2)];
let spinning = false;
let stopped = [false,false,false];
let lastTime = performance.now();

function setMessage(t){ $("message").textContent = t; }

function updateInfo() {
  reels.forEach((r,i) => {
    $("info" + i).textContent = `${r.centerIndex() + 1}コマ目 / ${LABEL[r.centerSymbol()]}`;
  });
}

function updateButtons() {
  $("leverBtn").disabled = spinning;
  for (let i = 0; i < 3; i++) {
    $("stop" + i).disabled = !spinning || stopped[i] || reels[i].stopping;
  }
}

function drawAll() {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {
    reels[i].draw(i * reelW, reelW);
  }
}

function loop(now) {
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;

  reels.forEach(r => r.update(dt, now));
  drawAll();

  if (spinning && stopped.every(Boolean) && reels.every(r => !r.running && !r.stopping)) {
    spinning = false;
    setMessage("停止完了。もう一度レバーON");
    updateInfo();
    updateButtons();
  }

  requestAnimationFrame(loop);
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
  reels[i].stop();
  updateButtons();
}

function resetAll() {
  spinning = false;
  stopped = [false,false,false];
  reels.forEach(r => {
    r.pos = 0;
    r.running = false;
    r.stopping = false;
  });
  setMessage("レバーONでリール回転");
  updateInfo();
  updateButtons();
}

function loadImages() {
  const entries = Object.entries(IMG_SRC);
  let loaded = 0;

  return new Promise(resolve => {
    entries.forEach(([key, src]) => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === entries.length) resolve();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === entries.length) resolve();
      };
      img.src = src;
      images[key] = img;
    });
  });
}

$("leverBtn").onclick = leverOn;
$("stop0").onclick = () => stopReel(0);
$("stop1").onclick = () => stopReel(1);
$("stop2").onclick = () => stopReel(2);
$("resetBtn").onclick = resetAll;

window.addEventListener("resize", () => {
  resizeCanvas();
  drawAll();
});

loadImages().then(() => {
  resizeCanvas();
  updateInfo();
  updateButtons();
  drawAll();
  requestAnimationFrame(loop);
});
