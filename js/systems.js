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
  rebase(keep){const t=performance.now()/1000;this.last=t;this.next=t+this.interval;this.lastKick=t;if(!keep){this.count=0;this.kickCount=0;}},
  hold(){this.rebase(true);},
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

// ---------- MUSICA (2 .wav en loop gapless + crossfade a 120 BPM) ----------
// menu  = pantalla de carga + pausa -> assets/soundtrack_pantalla_de_carga.wav (32s = 16 compases)
// main  = exploracion (play sin boss) -> assets/soundtrack_principal.wav (32s = 16 compases)
// bosses = fade-out a silencio (solo SFX/beeps)
// Ambos a 120 BPM: beat=0.5s, crossfade de 1.0s (=2 beats) para no romper la fase.
const Music={
  menu:null,main:null,current:null,target:'__none__',unlocked:false,
  VOL:{menu:0.45,main:0.4},FADE:1.0,fadeTimer:null,
  init(){
    if(this.menu||this.main)return;
    try{
      this.menu=new Audio('assets/soundtrack_pantalla_de_carga.wav');
      this.menu.loop=true;this.menu.preload='auto';this.menu.volume=0;
      this.main=new Audio('assets/soundtrack_principal.wav');
      this.main.loop=true;this.main.preload='auto';this.main.volume=0;
    }catch(e){console.warn('[music] no se pudo crear Audio:',e);}
  },
  play(name){
    this.init();
    if(this.target===name)return;
    this.target=name;
    if(!this.unlocked)return;
    const els={menu:this.menu,main:this.main};
    const goals={menu:name==='menu'?this.VOL.menu:0,main:name==='main'?this.VOL.main:0};
    try{
      for(const k of ['menu','main']){
        const el=els[k];if(!el)continue;
        if(goals[k]>0&&el.paused){el.volume=0;const p=el.play();if(p&&p.catch)p.catch(()=>{});}
      }
    }catch(e){}
    if(this.fadeTimer){clearInterval(this.fadeTimer);this.fadeTimer=null;}
    const startV={menu:els.menu?els.menu.volume:0,main:els.main?els.main.volume:0};
    const t0=performance.now(),dur=(name===null?600:this.FADE*1000),M=this;
    this.fadeTimer=setInterval(()=>{
      const t=Math.min(1,(performance.now()-t0)/dur);
      const s=t*t*(3-2*t); // smoothstep: transicion suave sin saltos
      try{
        for(const k of ['menu','main']){
          const el=els[k];if(!el)continue;
          el.volume=Math.max(0,Math.min(1,startV[k]+(goals[k]-startV[k])*s));
        }
        if(t>=1){
          clearInterval(M.fadeTimer);M.fadeTimer=null;M.current=name;
          for(const k of ['menu','main']){
            const el=els[k];if(!el)continue;
            if(goals[k]===0){if(!el.paused)el.pause();}
            else el.volume=goals[k];
          }
        }
      }catch(e){}
    },30);
  },
  unlock(){this.init();this.unlocked=true;this.target='__none__';updateMusic();}
};
// Decide que pista debe sonar segun estado + boss activo.
// Se llama cada frame desde loop() (barato: no hace nada si no hay cambio).
function updateMusic(){
  if(!Music.unlocked)return;
  // Overlays dentro de play (skills/piano/tutorial) no cambian la musica
  if(typeof skillOpen!=='undefined'&&skillOpen&&typeof state!=='undefined'&&state==='play')return;
  if(typeof Piano!=='undefined'&&Piano.active)return;
  if(typeof tutHowOpen!=='undefined'&&tutHowOpen&&typeof state!=='undefined'&&state==='play')return;
  let want=null;
  if(state==='menu'||state==='pause')want='menu';
  else if(state==='play'){
    let ab=null;
    try{ab=(typeof activeBoss==='function')?activeBoss():null;}catch(_){}
    want=ab?null:'main';
  }
  Music.play(want);
}
// ---------- TIME SCALE (hitstop corto para impactos grandes) ----------
let timeScale=1,hitstopT=0,hitstopScale=1;
function hitstop(dur=0.05,scale=0.35){if(dur>0.14)dur=0.14;hitstopT=dur;hitstopScale=scale;timeScale=scale;}
function updateTimescale(rdt){if(hitstopT>0){hitstopT-=rdt;timeScale=hitstopScale;if(hitstopT<=0)timeScale=1;}else timeScale=1;}

// ---------- TIMERS ESCALADOS (reemplazo de setTimeout en lógica) ----------
// Usa dt escalado, respeta hitstop/pausa. Para UI seguir usando setTimeout.
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
