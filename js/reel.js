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
const NUM = {"1":"BAR","2":"BELL","3":"CHERRY","4":"CLOWN","5":"DOG","6":"GRAPE","7":"SEVEN"};

const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];

const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

// ここを変えると回転方向が逆になる。
// 1で前回の逆方向に固定。
const DIR = -1;

const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;

class Reel {
  constructor(i) {
    this.i = i;
    this.strip = STRIPS[i];
    this.len = this.strip.length;
    this.pos = 0; // 中段のコマ番号
    this.timer = null;
    this.running = false;
    this.stopping = false;
    this.imgs = [
      $(`r${i}_0`),
      $(`r${i}_1`),
      $(`r${i}_2`)
    ];
    this.draw();
  }

  draw() {
    const top = mod(this.pos - 1, this.len);
    const mid = mod(this.pos, this.len);
    const bottom = mod(this.pos + 1, this.len);
    const arr = [top, mid, bottom];

    for (let r = 0; r < 3; r++) {
      const sym = this.strip[arr[r]];
      this.imgs[r].src = IMG[sym];
      this.imgs[r].alt = sym;
    }
  }

  step() {
    // 実際に見て逆なら DIR を -1 に変えるだけ
    this.pos = mod(this.pos + DIR, this.len);
    this.draw();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    this.timer = setInterval(() => this.step(), 55);
  }

  stop(callback) {
    if (!this.running || this.stopping) return;
    this.stopping = true;

    // 少しだけ滑って止まる。最後は必ず整数コマなのでズレない。
    let slip = 2 + Math.floor(Math.random() * 4);
    const slide = () => {
      this.step();
      slip--;
      if (slip > 0) {
        setTimeout(slide, 80 + (4 - slip) * 35);
      } else {
        clearInterval(this.timer);
        this.timer = null;
        this.running = false;
        this.stopping = false;
        this.draw();
        if (callback) callback();
      }
    };
    slide();
  }

  reset() {
    clearInterval(this.timer);
    this.timer = null;
    this.pos = 0;
    this.running = false;
    this.stopping = false;
    this.draw();
  }

  currentSymbol() {
    return this.strip[mod(this.pos, this.len)];
  }
}

const reels = [new Reel(0), new Reel(1), new Reel(2)];
let spinning = false;
let stopped = [false,false,false];

function setMessage(t) {
  $("message").textContent = t;
}

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
