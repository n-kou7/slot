const IMG_SRC = {
  BAR:"img/bar.png",
  BELL:"img/bell.png",
  CHERRY:"img/cherry.png",
  CLOWN:"img/clown.png",
  DOG:"img/dog.png",
  GRAPE:"img/grape.png",
  SEVEN:"img/seven.png"
};

const LABEL = {BAR:"BAR",BELL:"ベル",CHERRY:"チェリー",CLOWN:"ピエロ",DOG:"犬",GRAPE:"ぶどう",SEVEN:"7"};
const NUM = {"1":"BAR","2":"BELL","3":"CHERRY","4":"CLOWN","5":"DOG","6":"GRAPE","7":"SEVEN"};
const STRIP_NUMBERS = [
  "275656136567465631656",
  "576352635163526351634",
  "671256425642564256425"
];
const STRIPS = STRIP_NUMBERS.map(s => [...s].map(n => NUM[n]));

const SETTINGS = {
  1:{big:2/273.1, reg:2/439.8, grape:2/6.5, cherry:2/35, clown:2/7.3, bell:2/1200},
  2:{big:2/270.8, reg:2/399.6, grape:2/6.45, cherry:2/35, clown:2/7.3, bell:2/1200},
  3:{big:2/266.4, reg:2/331.0, grape:2/6.35, cherry:2/35, clown:2/7.3, bell:2/1200},
  4:{big:2/260.1, reg:2/315.1, grape:2/6.25, cherry:2/35, clown:2/7.3, bell:2/1200},
  5:{big:2/255.0, reg:2/255.0, grape:2/6.15, cherry:2/35, clown:2/7.3, bell:2/1200},
  6:{big:2/255.0, reg:2/255.0, grape:2/6.05, cherry:2/35, clown:2/7.3, bell:2/1200}
};

const $ = id => document.getElementById(id);
const mod = (n,m) => ((n % m) + m) % m;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

let CELL_H = 86;
const SPEED = 16.5;
const STOP_MS = 620;
const canvas = $("reelCanvas");
const ctx = canvas.getContext("2d");
let W=720,H=258,reelW=240,dpr=1;
let images = {};

class Reel {
  constructor(i){
    this.i=i; this.strip=STRIPS[i]; this.len=this.strip.length;
    this.pos=0; this.running=false; this.stopping=false;
    this.stopFrom=0; this.stopTo=0; this.stopStart=0;
  }
  start(){ this.running=true; this.stopping=false; }
  centerIndex(){ return mod(Math.round(this.pos), this.len); }
  centerSymbol(){ return this.strip[this.centerIndex()]; }
  symbolAt(idx){ return this.strip[mod(idx,this.len)]; }
  find(symbol){
    const cur=this.centerIndex();
    for(let slip=0; slip<=4; slip++){
      const idx=mod(cur+slip,this.len);
      if(this.symbolAt(idx)===symbol) return idx;
    }
    return null;
  }
  stopToIndex(targetIndex=null){
    if(!this.running || this.stopping) return;
    this.stopping=true;
    this.stopFrom=this.pos;
    if(targetIndex===null){
      const extra=3+Math.floor(Math.random()*4);
      this.stopTo=Math.ceil(this.pos)+extra;
    }else{
      let diff=mod(targetIndex-this.centerIndex(), this.len);
      if(diff<2) diff += this.len;
      this.stopTo=this.pos+diff;
    }
    this.stopStart=performance.now();
  }
  update(dt, now){
    if(this.stopping){
      const t=Math.min(1,(now-this.stopStart)/STOP_MS);
      this.pos=this.stopFrom+(this.stopTo-this.stopFrom)*easeOutCubic(t);
      if(t>=1){
        this.pos=Math.round(this.stopTo);
        this.running=false;
        this.stopping=false;
      }
      return;
    }
    if(this.running) this.pos += SPEED*dt;
  }
  draw(x,width){
    const base=Math.floor(this.pos);
    const frac=this.pos-base;
    const centerY=H/2-CELL_H/2;

    const grad=ctx.createLinearGradient(x,0,x+width,0);
    grad.addColorStop(0,"#d9d9d9"); grad.addColorStop(.5,"#fff"); grad.addColorStop(1,"#d9d9d9");
    ctx.fillStyle=grad; ctx.fillRect(x,0,width,H);

    ctx.save(); ctx.beginPath(); ctx.rect(x,0,width,H); ctx.clip();

    for(let k=-3;k<=3;k++){
      const idx=mod(base+k,this.len);
      const sym=this.strip[idx];
      const y=centerY-k*CELL_H+frac*CELL_H;
      ctx.strokeStyle="#ddd"; ctx.lineWidth=1; ctx.strokeRect(x,y,width,CELL_H);
      const img=images[sym];
      if(img && img.complete && img.naturalWidth){
        const padX=width*.08, padY=CELL_H*.04;
        const boxW=width-padX*2, boxH=CELL_H-padY*2;
        const scale=Math.min(boxW/img.naturalWidth, boxH/img.naturalHeight);
        const dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;
        ctx.drawImage(img, x+(width-dw)/2, y+(CELL_H-dh)/2, dw, dh);
      }
    }
    ctx.restore();

    if(this.i>0){ctx.strokeStyle="#111";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    const shade=ctx.createLinearGradient(0,0,0,H);
    shade.addColorStop(0,"rgba(0,0,0,.22)"); shade.addColorStop(.28,"rgba(0,0,0,0)");
    shade.addColorStop(.72,"rgba(0,0,0,0)"); shade.addColorStop(1,"rgba(0,0,0,.22)");
    ctx.fillStyle=shade; ctx.fillRect(x,0,width,H);
  }
}

const reels=[new Reel(0),new Reel(1),new Reel(2)];
let state=JSON.parse(localStorage.getItem("wanwanSlotV1")||"null")||{
  credit:50, bet:0, payout:0, diff:0, games:0, big:0, reg:0,
  bonusStock:null, bonus:null, replay:false
};
let flag={type:"MISS"};
let spinning=false, stopped=[false,false,false], lastTime=performance.now();

function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();
  dpr=window.devicePixelRatio||1;
  W=Math.max(1,Math.round(rect.width)); H=Math.max(1,Math.round(rect.height)); reelW=W/3;
  CELL_H=H/3;
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function save(){localStorage.setItem("wanwanSlotV1",JSON.stringify(state));}
function msg(t){$("message").textContent=t;}
function lamp(on){$("lamp").classList.toggle("on",!!on);}
function renderUI(){
  $("credit").textContent=state.credit; $("payout").textContent=state.payout; $("bet").textContent=state.bet;
  $("games").textContent=state.games; $("bigCount").textContent=state.big; $("regCount").textContent=state.reg;
  $("diff").textContent=state.diff;
  const total=state.big+state.reg; $("totalRate").textContent=total?`1/${Math.round(state.games/total)}`:"-";
  $("bonusPanel").classList.toggle("active",!!state.bonus);
  if(state.bonus){$("bonusType").textContent=state.bonus.type;$("bonusRemain").textContent=state.bonus.remain;}
  lamp(!!state.bonusStock);
  save();
}
function buttons(){
  $("betBtn").disabled=spinning || !!state.bonus || (state.bet>=3 && !state.replay);
  $("leverBtn").disabled=spinning || (!state.bonus && state.bet<3);
  [0,1,2].forEach(i=>$("stop"+i).disabled=!spinning || stopped[i] || reels[i].stopping);
}
function drawFlag(){
  const s=SETTINGS[$("setting").value]||SETTINGS[6], r=Math.random(); let p=0;
  if(!state.bonusStock){p+=s.big;if(r<p)return{type:"BIG"};p+=s.reg;if(r<p)return{type:"REG"};}
  p+=s.grape;if(r<p)return{type:"GRAPE"};
  p+=s.cherry;if(r<p){const dup=!state.bonusStock&&Math.random()<.05;return dup?{type:"CHERRY_BONUS",bonus:Math.random()<.55?"BIG":"REG"}:{type:"CHERRY"};}
  p+=s.clown;if(r<p)return{type:"CLOWN"};
  p+=s.bell;if(r<p)return{type:"BELL"};
  return{type:"MISS"};
}
function targetSymbol(i){
  // ボーナス確定中は小役より7/BARを優先
  if(state.bonusStock==="BIG")return"SEVEN";
  if(state.bonusStock==="REG")return"BAR";

  if(flag.type==="GRAPE")return"GRAPE";
  if(flag.type==="CLOWN")return"CLOWN";
  if(flag.type==="BELL")return"BELL";

  // チェリーは左リールだけ狙う。中右とは重複させない。
  if((flag.type==="CHERRY"||flag.type==="CHERRY_BONUS") && i===0)return"CHERRY";

  return null;
}
function chooseStop(i){
  const t=targetSymbol(i);
  if(t){const idx=reels[i].find(t); if(idx!==null)return idx;}
  return null;
}
function maxBet(){
  if(spinning||state.bonus)return;
  if(state.replay){state.bet=3;msg("再遊技。レバーON");renderUI();buttons();return;}
  const need=3-state.bet; if(need<=0)return;
  if(state.credit<need){msg("クレジット不足");return;}
  state.credit-=need; state.bet=3; state.diff-=need; state.payout=0;
  msg("レバーON"); renderUI(); buttons();
}
function lever(){
  if(spinning)return;
  if(!state.bonus && state.bet<3){msg("MAX BETしてね");return;}
  state.payout=0; state.replay=false; stopped=[false,false,false];

  if(state.bonus){
    flag={type:"BONUS"};
  }else{
    flag=drawFlag();
    if(flag.type==="BIG"||flag.type==="REG")state.bonusStock=flag.type;
    if(flag.type==="CHERRY_BONUS")state.bonusStock=flag.bonus;
  }
  spinning=true; reels.forEach(r=>r.start());
  msg("停止ボタンを押してね"); renderUI(); buttons();
}
function stopReel(i){
  if(!spinning||stopped[i]||reels[i].stopping)return;
  stopped[i]=true;
  reels[i].stopToIndex(chooseStop(i));
  buttons();
}
function bonusPay(){
  const pay=Math.min(15,state.bonus.remain);
  state.bonus.remain-=pay; return pay;
}
function visibleRows(){
  // Canvas表示と同じ: 上段=pos+1 / 中段=pos / 下段=pos-1
  return ["top","middle","bottom"].map((name,rowIndex)=>{
    return reels.map(r=>{
      const base=r.centerIndex();
      const idx = rowIndex===0 ? base+1 : rowIndex===1 ? base : base-1;
      return r.symbolAt(idx);
    });
  });
}

function rowAll(sym){
  return visibleRows().some(row=>row.every(x=>x===sym));
}

function rowBonusSymbol(sym){
  return visibleRows().some(row=>row.every(x=>x===sym));
}

function clownBonusPattern(){
  return visibleRows().some(row=>row[0]==="CLOWN" && (row[1]==="SEVEN" || row[1]==="BAR") && row[2]==="CLOWN");
}

function leftCherryInfo(){
  const base=reels[0].centerIndex();
  const top=reels[0].symbolAt(base+1);
  const mid=reels[0].symbolAt(base);
  const bottom=reels[0].symbolAt(base-1);
  return {top,mid,bottom, has: top==="CHERRY" || mid==="CHERRY" || bottom==="CHERRY"};
}

function setRandomBonusStock(){
  if(!state.bonusStock){
    state.bonusStock = Math.random() < 0.55 ? "BIG" : "REG";
  }
}

function finishGame(){
  spinning=false;
  let pay=0, text="ハズレ";

  const cherry=leftCherryInfo();
  const cherryTop = cherry.top==="CHERRY";
  const cherryMid = cherry.mid==="CHERRY";
  const cherryBottom = cherry.bottom==="CHERRY";

  if(state.bonus){
    pay=bonusPay();
    text=`${state.bonus.type}中 ${pay}枚`;
    if(state.bonus.remain<=0){
      state.bonus=null;
      text="BONUS終了";
    }
  }
  else if(rowBonusSymbol("SEVEN")){
    state.bonus={type:"BIG",remain:252};
    state.bonusStock=null;
    state.big++;
    text="BIG BONUS開始！";
  }
  else if(rowBonusSymbol("BAR")){
    state.bonus={type:"REG",remain:96};
    state.bonusStock=null;
    state.reg++;
    text="REG BONUS開始！";
  }
  else if(cherry.has && !cherryMid){
    setRandomBonusStock();
    pay = (cherryTop || cherryBottom) ? 4 : 0;
    text=`チェリー ${pay}枚 / ボーナス確定！`;
  }
  else if(clownBonusPattern()){
    setRandomBonusStock();
    text="ボーナス確定！";
  }
  else if(cherry.has){
    if(cherryMid) pay=2;
    else if(cherryTop || cherryBottom) pay=4;
    text=`チェリー ${pay}枚`;
  }
  else if(rowAll("GRAPE")){
    pay=7;
    text="ぶどう 7枚";
  }
  else if(rowAll("BELL")){
    pay=10;
    text="ベル 10枚";
  }
  else if(rowAll("CLOWN")){
    state.replay=true;
    state.bet=3;
    text="再遊技。BETなしで次ゲーム";
  }
  else if(state.bonusStock){
    text=`${state.bonusStock}成立中。狙って揃えてね`;
  }

  if(!state.bonus&&!state.replay)state.bet=0;
  if(pay>0){
    state.credit+=pay;
    state.diff+=pay;
  }

  state.payout=pay;
  state.games++;
  msg(text);
  renderUI();
  buttons();
}

function resetAll(){
  localStorage.removeItem("wanwanSlotV1"); location.reload();
}
function drawAll(){
  ctx.clearRect(0,0,W,H);
  reels.forEach((r,i)=>r.draw(i*reelW,reelW));
}
function loop(now){
  const dt=Math.min(.04,(now-lastTime)/1000); lastTime=now;
  reels.forEach(r=>r.update(dt,now));
  drawAll();
  if(spinning && stopped.every(Boolean) && reels.every(r=>!r.running&&!r.stopping)) finishGame();
  requestAnimationFrame(loop);
}
function loadImages(){
  const entries=Object.entries(IMG_SRC); let loaded=0;
  return new Promise(resolve=>{
    entries.forEach(([k,src])=>{
      const img=new Image();
      img.onload=img.onerror=()=>{loaded++; if(loaded===entries.length)resolve();};
      img.src=src; images[k]=img;
    });
  });
}

$("betBtn").onclick=maxBet; $("leverBtn").onclick=lever;
[0,1,2].forEach(i=>$("stop"+i).onclick=()=>stopReel(i));
$("resetBtn").onclick=resetAll;
window.addEventListener("resize",()=>{resizeCanvas();drawAll();});

loadImages().then(()=>{resizeCanvas();renderUI();buttons();drawAll();requestAnimationFrame(loop);});
