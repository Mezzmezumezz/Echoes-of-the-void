// Smoke test del combate: node tools/check-combat.js
// Carga config/assets/systems/world/combat/ui/update/render en un DOM/canvas falso,
// simula 6 bosses (patrones, IA, fase 2, firma, embestida, esquiva) y mide el TTK
// con el disparo rápido mantenido para detectar que el campamento a distancia no gane solo.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');

let nowMs=0;
const gradient={addColorStop(){}};
const ctxStub=new Proxy({
  createLinearGradient:()=>gradient,
  measureText:()=>({width:20})
},{get(t,p){if(p in t)return t[p];return ()=>{};},set(t,p,v){t[p]=v;return true;}});

const els={};
function stubEl(){
  return {
    style:{setProperty(){}},dataset:{},textContent:'',innerHTML:'',offsetWidth:48,clientWidth:280,
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    getContext:()=>ctxStub,addEventListener(){},appendChild(){},setAttribute(){},
    querySelector:()=>null,querySelectorAll:()=>[],focus(){},blur(){},
    getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})
  };
}
const sandbox={
  console,setTimeout,clearTimeout,setInterval,clearInterval,Math,Date,JSON,
  performance:{now:()=>nowMs},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  document:{
    getElementById:id=>els[id]||(els[id]=stubEl()),
    querySelector:()=>null,querySelectorAll:()=>[],
    createElement:()=>stubEl(),addEventListener(){},body:stubEl()
  },
  Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.src='';}},
  Audio:class{constructor(){this.volume=0;this.paused=true;this.currentTime=0;this.playbackRate=1;this.loop=false;this.preload='';}
    play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}},
  addEventListener(){},removeEventListener(){},
  devicePixelRatio:1,matchMedia:()=>({matches:false}),
  advance:ms=>{nowMs+=ms;}
};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const f of ['config','assets','systems','world','combat','ui','update','render']){
  vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),sandbox,{filename:f+'.js'});
}

const TEST=`
'use strict';
function assert(c,msg){if(!c)throw new Error('FALLO: '+msg);}
function step(n){
  for(let i=0;i<n;i++){
    advance(1000/60);
    update(1/60);
    draw();
    if(player&&player.hp<5000)player.hp=999999;
  }
}
state='play';
resetWorld();
player.hp=999999;player.y=GROUND_TOP;player.onFloor=true;

// 0) Tipos de enemigo realmente distintos (antes SLIME_DEFS ignoraba type).
const kinds=new Set(slimes.map(s=>s.type));
assert(kinds.size>=3,'deberían existir slime/mite/husk');
const stats=new Set(slimes.map(s=>s.hp+':'+s.w+':'+s.contact+':'+s.spd));
assert(stats.size>=3,'los tipos de slime deben tener stats distintos');
slimes.forEach(s=>{assert(typeof s.contact==='number','slime sin contacto');assert(typeof s.chase==='number','slime sin chase');});

// 1) Cada boss: lock, variedad, movimiento, embestida anti-camp, esquiva, fase 2 y firma.
const patternsSeen={};const killTimes={};
for(const def of BOSS_DEFS){
  resetWorld();state='play';
  const b=bosses.find(x=>x.type===def.type);
  assert(!!b,'boss no creado: '+def.type);
  const a=ARENAS[b.idx];
  player.x=a[0]+50;player.y=GROUND_TOP;player.onFloor=true;player.hp=999999;
  tryLockBosses();
  assert(b.locked,'boss no se bloquea: '+def.type);
  assert(b.tele>0&&b.idle>0&&b.speed>0&&b.keep>0,'AI incompleta: '+def.type);

  const seen=new Set();let moved=false;const x0=b.x;
  for(let i=0;i<1200;i++){
    advance(1000/60);update(1/60);draw();
    player.hp=999999;
    if(!bosses.includes(b))break;
    if(b.st==='TELE')seen.add(b.pat);
    if(Math.abs(b.x-x0)>4)moved=true;
    if(b.hp<b.maxhp*0.75)b.hp=b.maxhp*0.95;
  }
  assert(seen.size>=2,'poca variedad de patrones en '+def.type+': '+[...seen].join(','));
  assert(seen.has('SIG'),'la firma no aparece en '+def.type+': '+[...seen].join(','));
  assert(moved,'el boss no se mueve: '+def.type);
  patternsSeen[def.type]=[...seen];

  // Anti-camp determinista: jugador al borde opuesto -> EMBESTIDA y cierre real.
  player.x=a[0]+50;b.x=a[1]-70;clampBoss(b);b.st='IDLE';b.t=99;b.farT=99;b.dashCd=0;b.evadeT=0;
  advance(1000/60);update(1/60);
  assert(b.st==='TELE'&&b.pat==='RUSH','el anti-camp no dispara EMBESTIDA en '+def.type);
  let lunged=false;const bx0=b.x;
  for(let i=0;i<60;i++){advance(1000/60);update(1/60);if(b.st==='LUNGE')lunged=true;}
  assert(lunged,'la EMBESTIDA no llega a ejecutarse en '+def.type);
  assert(Math.abs(b.x-player.x)<Math.abs(bx0-player.x)-100,'la EMBESTIDA no cierra distancia en '+def.type);

  // Esquiva: un disparo entrante debe hacerle moverse lateralmente.
  b.st='IDLE';b.t=99;b.evadeT=0;b.evadeCd=0;b.farT=0;b.dashCd=99;
  const ex0=b.x;
  pProj.push({x:b.x-160,y:b.y-48,vx:980,vy:0,w:10,h:8,life:1,dmg:1,kind:'shot',weapon:'EchoShot',hits:[]});
  advance(1000/60);update(1/60);
  assert(b.evadeT>0||Math.abs(b.x-ex0)>4,'el boss no esquiva disparos: '+def.type);
  pProj=[];

  // Fase 2 y el bug histórico: rebase() mataba el barrage ~14s.
  b.maxhp=1000;b.hp=400;b.phase2=false;
  dealBossDmg(b,1);
  assert(b.phase2,'no entra en fase 2: '+def.type);
  assert(Rhythm.bpm===b.bpm[1],'BPM de fase 2 incorrecto: '+def.type);
  b.st='IDLE';b.t=999;
  for(let i=0;i<30;i++){advance(1000/60);update(1/60);player.hp=999999;}
  eProj=[];notes=[];
  const kc0=Rhythm.kickCount;
  for(let i=0;i<240;i++){advance(1000/60);update(1/60);draw();player.hp=999999;if(b.hp<350)b.hp=400;}
  assert(Rhythm.kickCount>kc0+2,'el ritmo no avanza en fase 2: '+def.type);
  assert(eProj.length>0||notes.length>0,'fase 2 sin barrage/fichas (bug de lastKickSeen): '+def.type);

  // Firma forzada (cada tipo tiene su propio ataque, sin excepciones).
  b.st='IDLE';b.t=999;b.pat='SIG';b.pid=0;
  fireSignature(b,player.x-b.x);
  for(let i=0;i<180;i++){advance(1000/60);update(1/60);draw();player.hp=999999;if(b.hp<350)b.hp=400;}
  assert(b.sigName&&b.sigName.length>2,'firma sin nombre: '+def.type);

  // TTK pasivo: mantener J desde lejos, sin esquivar ni tocar fichas.
  resetWorld();state='play';
  const b2=bosses.find(x=>x.type===def.type),a2=ARENAS[b2.idx];
  player.x=a2[0]+80;player.y=GROUND_TOP;player.onFloor=true;player.hp=999999;player.face=1;
  wi=2;tryLockBosses();
  keys['KeyJ']=true;attackHeld=true;
  let ttk=0;
  for(let i=0;i<1500;i++){
    advance(1000/60);update(1/60);
    iframes=999;player.hp=999999;
    player.face=Math.sign(b2.x-player.x)||1;
    if(b2.dead){ttk=i/60;break;}
  }
  keys['KeyJ']=false;attackHeld=false;iframes=0;
  assert(ttk>0,'el disparo rápido no mata a '+def.type+' en 25s (¿boss roto?)');
  killTimes[def.type]=ttk.toFixed(1)+'s';
  assert(ttk>3.5,'demasiado fácil: '+def.type+' muere en '+ttk.toFixed(1)+'s con disparo mantenido');
}

// 2) Habilidades de boss que antes no hacían nada.
resetWorld();state='play';
S.skills.boss_ricochet=true;
pProj.push({x:player.x,y:player.y-16,vx:980,vy:0,w:10,h:8,life:0.001,dmg:1,kind:'shot',weapon:'EchoShot',hits:[]});
advance(1000/60);update(1/60);
assert(pProj.some(p=>p.rb===true),'boss_ricochet no rebota las balas');

resetWorld();state='play';player.hp=999999;
S.skills.boss_blackhole=true;
eProj.push({x:player.x+40,y:player.y-16,vx:0,vy:0,w:12,h:12,life:2,dmg:5,hell:true});
player.en=100;
special();
advance(1000/60);update(1/60);
assert(!eProj.some(p=>Math.abs(p.x-player.x)<40&&Math.abs(p.y-(player.y-16))<6&&p.life>0),'boss_blackhole no limpia balas');

// 3) Final: el Primordial dispara la cinemática (historia + créditos) y se sale al menú.
S.bosses={};S.endingSeen=false;resetWorld();state='play';player.hp=999999;
const bFinal=bosses.find(x=>x.type==='EchoPrimordial');
assert(!!bFinal,'no se creó el jefe final');
BOSS_DEFS.forEach(d=>S.bosses[d.type]=true);
killBoss(bFinal);
for(let i=0;i<240;i++){advance(1000/60);update(1/60);draw();player.hp=999999;}
assert(state==='ending','el final no arranca tras matar al Primordial');
assert(S.endingSeen===true,'el final no se guarda');
assert(endingT>0,'la cinemática no avanza');
endingT=ENDING_CREDITS_AT+0.1;draw();
finishEnding();
assert(state==='menu','no se puede volver al título desde los créditos');

console.log('Combate OK · patrones: '+Object.entries(patternsSeen).map(([k,v])=>k+':'+v.length).join(' '));
console.log('TTK con J mantenido (normal): '+Object.entries(killTimes).map(([k,v])=>k+' '+v).join(' · '));
`;
vm.runInContext(TEST,sandbox,{filename:'check-combat-test.js'});
console.log('Bosses/armas/skills/final verificados en simulación headless.');
