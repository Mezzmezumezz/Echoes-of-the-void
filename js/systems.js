// js/systems.js — save, audio, ritmo, timescale + cola de timers escalados
'use strict';
// ---------- SAVE ----------
const SAVE_KEY='echoes_save';
let S={echoes:0,skills:{},bosses:{},shards:{},locks:{},shade:null,difficulty:'normal',checkpoint:'start',howDone:false,showDmg:true};
try{const r=localStorage.getItem(SAVE_KEY);if(r)S=Object.assign(S,JSON.parse(r));}catch(e){}
if(!DIFFS[S.difficulty])S.difficulty='normal';
if(S.showDmg===undefined)S.showDmg=true;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function diff(){return DIFFS[S.difficulty]||DIFFS.normal;}
function echoGain(n){return Math.round(n*diff().echoMult);}

// ---------- AUDIO ----------
let AC=null;
function ac(){if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC;}
function beep(f,dur=0.07,vol=0.2,type='square'){try{const a=ac(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.value=vol;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur);o.stop(a.currentTime+dur);}catch(e){}}

// ---------- RITMO: solo los BOMBOS dan bonus (ventanas según dificultad) ----------
// Patrón 4/4: bombo en beats 1 y 3 -> kickPat [1,0,1,0]. Los hats suenan flojo
// pero NO dan PERFECT/GOOD: evaluate() mide distancia al bombo más cercano.
const Rhythm={bpm:120,last:0,next:0,count:0,lastKick:0,kickCount:0,kickPat:[1,0,1,0],
  get interval(){return 60/this.bpm;},
  get kickGap(){return this.interval*2;},
  isKickBeat(c){return this.kickPat[c%this.kickPat.length]===1;},
  rebase(){const t=performance.now()/1000;this.last=t;this.next=t+this.interval;this.count=0;this.lastKick=t;this.kickCount=0;},
  hold(){const t=performance.now()/1000;this.last=t;this.next=t+this.interval;this.lastKick=t;},
  update(){const t=performance.now()/1000;if(!this.next)this.rebase();
    while(t>=this.next){const bt=this.next;this.last=bt;this.next+=this.interval;this.count++;
      const kick=this.isKickBeat(this.count);
      const p=$('pulse');
      if(kick){this.lastKick=bt;this.kickCount++;
        if(p){p.classList.add('kick');setTimeout(()=>p.classList.remove('kick'),180);}
        beep(this.kickCount%4===0?160:130,0.16,0.28,'sine');
      }else{
        if(p){p.classList.add('beat');setTimeout(()=>p.classList.remove('beat'),90);}
        beep(5200,0.03,0.04,'square');
      }
    }},
  evaluate(){const t=performance.now()/1000,gap=this.kickGap;
    let d=((t-this.lastKick+gap/2)%gap+gap)%gap-gap/2;let ms=Math.abs(d)*1000;
    const D=diff();
    if(ms<=D.perfect)return{r:'PERFECT',m:1.5,ms};if(ms<=D.good)return{r:'GOOD',m:1.2,ms};return{r:'MISS',m:0.6,ms};}
};

// ---------- TIME SCALE (sin slow-mo: el juego siempre va a 1.0) ----------
// Se eliminó el slow-mo de rueda/skills porque rompía el ritmo y se sentía horrible.
// Solo queda un hitstop MUY corto para impactos grandes (stun/muerte/daño al jugador).
let timeScale=1,externalScale=1,hitstopT=0,hitstopScale=1;
function setSlowmo(s){externalScale=1;if(!hitstopT)timeScale=1;}
function clearSlowmo(){externalScale=1;if(!hitstopT)timeScale=1;}
function hitstop(dur=0.05,scale=0.35){if(dur>0.14)dur=0.14;hitstopT=dur;hitstopScale=scale;timeScale=scale;}
function updateTimescale(rdt){if(hitstopT>0){hitstopT-=rdt;timeScale=hitstopScale;if(hitstopT<=0){timeScale=1;externalScale=1;}}else{timeScale=1;}}

// ---------- TIMERS ESCALADOS (reemplazo de setTimeout en lógica) ----------
// Usa dt escalado, respeta slow-mo/hitstop/pausa. Para UI seguir usando setTimeout.
let delayed=[];
function later(fn,sec,pid){delayed.push({t:sec,fn,pid});}
function updateDelayed(dt){
  if(!delayed.length)return;
  for(const d of delayed)d.t-=dt;
  const run=delayed.filter(d=>d.t<=0);
  delayed=delayed.filter(d=>d.t>0);
  for(const d of run){try{d.fn(d.pid);}catch(e){console.error(e);}}
}
function clearDelayedFor(pid){delayed=delayed.filter(d=>d.pid!==pid);}
