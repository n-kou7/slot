const SYMBOLS={
 DOG:"img/dog.png",GRAPE:"img/grape.png",CHERRY:"img/cherry.png",BELL:"img/bell.png",CLOWN:"img/clown.png",BAR:"img/bar.png",SEVEN:"img/seven.png",REPLAY:"img/clown.png"
};
const STRIPS=[
 ["SEVEN","GRAPE","REPLAY","CHERRY","BELL","DOG","GRAPE","BAR","REPLAY","CLOWN","GRAPE","CHERRY","SEVEN","REPLAY","BELL","GRAPE","DOG","BAR","REPLAY","GRAPE","CLOWN"],
 ["GRAPE","REPLAY","BAR","DOG","BELL","GRAPE","CHERRY","REPLAY","SEVEN","GRAPE","CLOWN","REPLAY","BELL","BAR","GRAPE","DOG","CHERRY","REPLAY","SEVEN","GRAPE","CLOWN"],
 ["REPLAY","GRAPE","DOG","SEVEN","CHERRY","BELL","REPLAY","GRAPE","BAR","CLOWN","GRAPE","REPLAY","CHERRY","SEVEN","DOG","BELL","GRAPE","REPLAY","BAR","GRAPE","CLOWN"]
];
const SETTINGS={1:{big:1/273.1,reg:1/439.8,grape:1/6.5,cherry:1/35,replay:1/7.3,bell:1/1200},2:{big:1/270.8,reg:1/399.6,grape:1/6.45,cherry:1/35,replay:1/7.3,bell:1/1200},3:{big:1/266.4,reg:1/331.0,grape:1/6.35,cherry:1/35,replay:1/7.3,bell:1/1200},4:{big:1/260.1,reg:1/315.1,grape:1/6.25,cherry:1/35,replay:1/7.3,bell:1/1200},5:{big:1/255,reg:1/255,grape:1/6.15,cherry:1/35,replay:1/7.3,bell:1/1200},6:{big:1/255,reg:1/255,grape:1/6.05,cherry:1/35,replay:1/7.3,bell:1/1200}};
const H=112, MAX_SLIP=4, SPIN_MS=90, WAIT_MS=4100;
const $=id=>document.getElementById(id);

class Reel{
 constructor(i,el){this.i=i;this.el=el;this.strip=STRIPS[i];this.pos=0;this.timer=null;this.spinning=false;this.el.innerHTML='<div class="strip"></div>';this.stripEl=this.el.firstChild;this.draw()}
 draw(){this.stripEl.innerHTML="";let len=this.strip.length;for(let r=-1;r<5;r++){let k=this.strip[(this.pos+r+len)%len],d=document.createElement("div");d.className="symbol";d.innerHTML=`<img src="${SYMBOLS[k]}" alt="${k}">`;this.stripEl.appendChild(d)}this.stripEl.style.transform=`translateY(${-H}px)`}
 start(){if(this.spinning)return;this.spinning=true;this.timer=setInterval(()=>{this.pos=(this.pos+1)%this.strip.length;this.draw()},SPIN_MS)}
 stopAt(p){clearInterval(this.timer);this.timer=null;this.spinning=false;this.pos=((p%this.strip.length)+this.strip.length)%this.strip.length;this.draw()}
 center(){return this.strip[(this.pos+1)%this.strip.length]}
 centerIf(p){return this.strip[(p+1)%this.strip.length]}
 find(sym){for(let slip=0;slip<=MAX_SLIP;slip++){let p=(this.pos+slip)%this.strip.length;if(this.centerIf(p)===sym)return p}return null}
}

let reels=[0,1,2].map(i=>new Reel(i,$("reel"+i)));
let state=JSON.parse(localStorage.getItem("wanwanSlotState")||"null")||{credit:50,bet:0,diff:0,games:0,bigCount:0,regCount:0,lastPayout:0,bonusStock:null,bonus:null,replay:false};
let flag=null, spinning=false, stopped=[false,false,false], stoppedSymbols=[], lastStart=0;

function save(){localStorage.setItem("wanwanSlotState",JSON.stringify(state))}
function render(){
 $("credit").textContent=state.credit;$("bet").textContent=state.bet;$("payout").textContent=state.lastPayout;$("diff").textContent=state.diff;$("games").textContent=state.games;$("bigCount").textContent=state.bigCount;$("regCount").textContent=state.regCount;
 let total=state.bigCount+state.regCount;$("totalRate").textContent=total?`1/${Math.round(state.games/total)}`:"-";
 $("bonusPanel").classList.toggle("active",!!state.bonus); if(state.bonus){$("bonusType").textContent=state.bonus.type;$("bonusRemain").textContent=state.bonus.remaining}
 $("lamp").classList.toggle("on",!!state.bonusStock);
 save();
}
function msg(t){$("message").textContent=t}
function buttons(){
 $("betBtn").disabled=spinning||!!state.bonus||(state.bet>=3&&!state.replay);
 $("leverBtn").disabled=spinning||(!state.bonus&&state.bet<3);
 [0,1,2].forEach(i=>$("stop"+i).disabled=!spinning||stopped[i]);
}
function drawFlag(){
 let s=SETTINGS[$("setting").value]||SETTINGS[6],r=Math.random(),p=0;
 if(!state.bonusStock){p+=s.big;if(r<p)return{type:"BIG"};p+=s.reg;if(r<p)return{type:"REG"}}
 p+=s.grape;if(r<p)return{type:"GRAPE"};p+=s.cherry;if(r<p){let dup=!state.bonusStock&&Math.random()<0.05;return dup?{type:"CHERRY_BONUS",bonus:Math.random()<.55?"BIG":"REG"}:{type:"CHERRY"}}
 p+=s.replay;if(r<p)return{type:"REPLAY"};p+=s.bell;if(r<p)return{type:"BELL"};return{type:"MISS"}
}
function target(){
 if(flag.type==="GRAPE")return"GRAPE";if(flag.type==="REPLAY")return"REPLAY";if(flag.type==="BELL")return"BELL";if(flag.type==="CHERRY"||flag.type==="CHERRY_BONUS")return"CHERRY";
 if(state.bonusStock==="BIG")return"SEVEN";if(state.bonusStock==="REG")return"BAR";return null;
}
function choose(reel){
 let t=target(); if(t){let p=reel.find(t); if(p!==null)return p}
 for(let slip=0;slip<=4;slip++){let p=(reel.pos+slip)%reel.strip.length,s=reel.centerIf(p),a=stoppedSymbols.filter(Boolean);if(a.length>=2&&a[0]===a[1]&&s===a[0])continue;if(["SEVEN","BAR"].includes(s)&&!state.bonusStock)continue;return p}
 return reel.pos;
}
function bet(){
 if(spinning||state.bonus)return;
 if(state.replay){state.bet=3;msg("リプレイ再遊技。レバーON");render();buttons();return}
 if(state.bet>=3)return;if(state.credit<=0){msg("クレジット不足");return}
 let put=Math.min(3-state.bet,state.credit);state.credit-=put;state.bet+=put;state.diff-=put;msg("レバーON");render();buttons();
}
function lever(){
 if(spinning)return;if(!state.bonus&&state.bet<3){msg("先にBET");return}
 let now=Date.now();if(now-lastStart<WAIT_MS){msg("ウェイト中...");return}lastStart=now;
 state.lastPayout=0;state.replay=false;stopped=[false,false,false];stoppedSymbols=[];
 if(state.bonus)flag={type:"BONUS_GAME"};else{flag=drawFlag();if(flag.type==="BIG"||flag.type==="REG")state.bonusStock=flag.type;if(flag.type==="CHERRY_BONUS")state.bonusStock=flag.bonus}
 spinning=true;reels.forEach(r=>r.start());msg("停止ボタンを押してね");render();buttons();
}
function stop(i){
 if(!spinning||stopped[i])return;let p=choose(reels[i]);reels[i].stopAt(p);stopped[i]=true;stoppedSymbols[i]=reels[i].center();
 if(stopped.every(Boolean))finish();else msg("残りのリールを停止");buttons();
}
function bonusPay(){let pay=Math.min(15,state.bonus.remaining);state.bonus.remaining-=pay;return pay}
function finish(){
 spinning=false;let line=reels.map(r=>r.center()),payout=0,m="ハズレ";
 if(state.bonus){payout=bonusPay();m=`${state.bonus.type}中 ${payout}枚`;if(state.bonus.remaining<=0){m=`${state.bonus.type}終了`;state.bonus=null}}
 else if(line.every(x=>x==="SEVEN")){state.bonus={type:"BIG",remaining:252};state.bonusStock=null;state.bigCount++;m="BIG BONUS開始！"}
 else if(line.every(x=>x==="BAR")){state.bonus={type:"REG",remaining:96};state.bonusStock=null;state.regCount++;m="REG BONUS開始！"}
 else if(line.every(x=>x==="REPLAY")){state.replay=true;state.bet=3;m="リプレイ。BETなしで再遊技"}
 else if(line.every(x=>x==="GRAPE")){payout=7;m="ブドウ 7枚"}
 else if(line.includes("CHERRY")&&(flag.type==="CHERRY"||flag.type==="CHERRY_BONUS")){payout=2;m="チェリー 2枚"}
 else if(line.every(x=>x==="BELL")){payout=10;m="ベル 10枚"}
 else if(state.bonusStock)m=`${state.bonusStock}成立中。7/BARを狙ってね`;
 if(!state.bonus&&!state.replay)state.bet=0;if(payout>0){state.credit+=payout;state.diff+=payout}
 state.lastPayout=payout;state.games++;msg(m);render();buttons();
}
$("betBtn").onclick=bet;$("leverBtn").onclick=lever;[0,1,2].forEach(i=>$("stop"+i).onclick=()=>stop(i));$("resetBtn").onclick=()=>{localStorage.removeItem("wanwanSlotState");location.reload()};
render();buttons();
