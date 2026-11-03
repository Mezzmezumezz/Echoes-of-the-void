// js/systems.js — save, audio, ritmo, timescale + cola de timers escalados
'use strict';
// ---------- SAVE ----------
const SAVE_KEY='echoes_save';
let S={echoes:0,skills:{},bosses:{},shards:{},locks:{},shade:null,difficulty:'normal',checkpoint:'start',howDone:false,showDmg:true,endingSeen:false};
try{const r=localStorage.getItem(SAVE_KEY);if(r)S=Object.assign(S,JSON.parse(r));}catch(e){}
if(!DIFFS[S.difficulty])S.difficulty='normal';
if(S.showDmg===undefined)S.showDmg=true;
if(S.endingSeen===undefined)S.endingSeen=false;
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

// ---------- MUSICA POR BOSS Y POR FASE ----------
// menu  = pantalla de carga + pausa -> assets/soundtrack_pantalla_de_carga.wav
// main  = exploracion (play sin boss) -> assets/soundtrack_principal.wav
// boss  = loop generico de 95 BPM; el playbackRate lo ajusta al BPM real del combate.
//         fase 1 y fase 2 usan archivos distintos (fase 2 mas oscura/agresiva).
// final = BOSS_MUSIC.EchoPrimordial: Blade (150) en fase 1, Into The Void (156) en fase 2.
//         La fase 2 arranca en el segundo 1.0 para que el drop caiga justo al acabar
//         la transicion de 6s. El rate de estas pistas es 1.0 (ya estan a su BPM).
const MUSIC_DEFS={
  menu:{src:'assets/soundtrack_pantalla_de_carga.wav',vol:0.45,loop:true},
  main:{src:'assets/soundtrack_principal.wav',vol:0.40,loop:true},
  bossP1:{src:'assets/boss_resonator_95bpm.wav',vol:0.50,loop:true},
  bossP2:{src:'assets/boss_resonator_fase2_95bpm.wav',vol:0.52,loop:true}
};
const Music={
  el:{},defs:Object.assign({},MUSIC_DEFS),current:null,target:'__none__',unlocked:false,
  FADE:0.9,fadeTimer:null,_ready:false,
  init(){
    if(this._ready)return;this._ready=true;
    // Registrar las pistas personalizadas declaradas en config.js (BOSS_MUSIC).
    try{
      for(const type in BOSS_MUSIC){
        const m=BOSS_MUSIC[type];
        for(const ph of ['p1','p2']){
          const d=m[ph];if(!d)continue;
          this.defs['boss_'+type+'_'+ph]={src:d.src,vol:d.vol||0.55,loop:true};
        }
      }
    }catch(e){}
    for(const k in this.defs)this.ensure(k);
  },
  ensure(k){
    if(this.el[k])return this.el[k];
    const d=this.defs[k];if(!d)return null;
    try{
      const a=new Audio(d.src);
      a.loop=d.loop!==false;a.preload='auto';a.volume=0;
      this.el[k]=a;return a;
    }catch(e){return null;}
  },
  setRate(k,rate){
    const el=this.el[k];if(!el)return;
    const r=Math.max(0.5,Math.min(1.8,rate||1));
    try{
      if(Math.abs(el.playbackRate-r)>0.001){
        el.preservesPitch=true;el.mozPreservesPitch=true;el.webkitPreservesPitch=true;
        el.playbackRate=r;
      }
    }catch(e){}
  },
  play(name,opts){
    this.init();
    opts=opts||{};
    const switching=this.target!==name;
    if(!switching&&!opts.restart)return;
    this.target=name;
    if(!this.unlocked)return;
    const goals={};
    for(const k in this.el)goals[k]=0;
    if(name&&name!=='__none__'){
      const el=this.ensure(name);if(!el)return;
      goals[name]=this.defs[name].vol||0.5;
      if(opts.restart){
        try{
          const seek=(opts.seek!==undefined?opts.seek:(this.defs[name].start||0));
          if(seek>0)el.currentTime=seek;else el.currentTime=0;
        }catch(e){}
      }
      if(el.paused){el.volume=0;const p=el.play();if(p&&p.catch)p.catch(()=>{});}
    }
    if(this.fadeTimer){clearInterval(this.fadeTimer);this.fadeTimer=null;}
    const els=this.el,startV={};
    for(const k in els)startV[k]=els[k].volume;
    const t0=performance.now(),dur=Math.max(0.05,(opts.fade!==undefined?opts.fade:this.FADE)*1000),M=this;
    this.fadeTimer=setInterval(()=>{
      const t=Math.min(1,(performance.now()-t0)/dur);
      const s=t*t*(3-2*t); // smoothstep
      try{
        for(const k in els){
          const el=els[k];if(!el)continue;
          const g=goals[k]||0;
          el.volume=Math.max(0,Math.min(1,startV[k]+(g-startV[k])*s));
        }
        if(t>=1){
          clearInterval(M.fadeTimer);M.fadeTimer=null;M.current=name;
          for(const k in els){
            const el=els[k];if(!el)continue;
            if((goals[k]||0)===0){if(!el.paused)el.pause();}
            else el.volume=goals[k];
          }
        }
      }catch(e){}
    },30);
  },
  unlock(){this.init();this.unlocked=true;this.target='__none__';updateMusic();},
  // Compatibilidad: las llamadas antiguas solo piden re-evaluar la pista activa.
  syncBoss(){this.target='__none__';}
};
// Resuelve pista + BPM + rate para el boss/fase actual.
function bossMusicTrack(b){
  const phase2=!!b.phase2;
  const custom=BOSS_MUSIC[b.type];
  const def=custom&&custom[phase2?'p2':'p1'];
  if(def){
    return {key:'boss_'+b.type+'_'+(phase2?'p2':'p1'),bpm:def.bpm||b.bpm[phase2?1:0],rate:def.rate||1,
      start:def.start||0,vol:def.vol||0.55,custom:true};
  }
  const d=BOSS_MUSIC_DEFAULT[phase2?'p2':'p1'];
  const bpm=b.bpm[phase2?1:0]||95;
  return {key:phase2?'bossP2':'bossP1',bpm,rate:bpm/95,start:0,vol:d.vol,custom:false};
}
// Decide que pista debe sonar segun estado + boss activo.
// Se llama cada frame desde loop() (barato: no hace nada si no hay cambio).
function updateMusic(){
  if(!Music.unlocked)return;
  // Overlays dentro de play (skills/piano/tutorial) no cambian la musica
  if(typeof skillOpen!=='undefined'&&skillOpen&&typeof state!=='undefined'&&state==='play')return;
  if(typeof Piano!=='undefined'&&Piano.active)return;
  if(typeof tutHowOpen!=='undefined'&&tutHowOpen&&typeof state==='play')return;
  let want='main',track=null;
  if(state==='menu'||state==='pause'||state==='ending')want='menu';
  else if(state==='play'){
    let ab=null;
    try{ab=(typeof activeBoss==='function')?activeBoss():null;}catch(_){}
    if(ab){
      track=bossMusicTrack(ab);
      want=track.key;
      Music.setRate(want,track.rate);
    }
  }
  if(Music.target!==want){
    Music.play(want,{restart:!!track,fade:track?(track.custom?0.6:0.9):0.7,seek:track?track.start:0});
  }
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
