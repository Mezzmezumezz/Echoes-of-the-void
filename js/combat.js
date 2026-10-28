// js/combat.js — combate, bosses con timers escalados
'use strict';
const BOSS_SKILL_INFO={
  boss_ricochet:'Rebote: tus balas vuelven',
  boss_blackhole:'Especial limpia balas',
  boss_teleport:'Dash aéreo',
  boss_clone:'Eco: +25% daño'
};
function timingMult(){return Rhythm.evaluate();}
// Presión exponencial por índice de boss (~4.5x combinada del 1 al 6).
function bossScale(b){const i=b.idx||0;return{dmg:Math.pow(1.06,i),spd:Math.pow(1.08,i),cnt:Math.pow(1.14,i)};}
function burst(x,y,color,n,spd){
  for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-0.5)*spd,vy:-Math.random()*spd*0.8,t:0.4+Math.random()*0.3,c:color});
}
function shockRing(x,y,color,maxR){
  parts.push({x,y,vx:0,vy:0,t:0.45,c:color,nograv:true,ring:true,r:6,vr:(maxR||160)/0.45});
}
function dealBossDmg(b,dmg){
  if(b.dead)return;
  if(b.st==='TRANS'){burst(b.x,b.y-40,b.color||'#fff',2,80);return;}
  // Fase aérea: fuera de alcance. Los ataques normales no lo bajan; toca esquivar.
  if(b.st==='AIR'){
    if(!b.airHit){
      b.airHit=true;
      floaters.push({x:b.x,y:b.y-b.h-12,txt:'ESCUDO · ESQUIVA',t:0.9,c:'#33e6ff'});
      shockRing(b.x,b.y-40,'#33e6ff',90);beep(900,0.06,0.1);
    }
    burst(b.x,b.y-40,'#33e6ff',2,120);
    return;
  }
  // El stun premia: boss aturdido recibe +25%. El eco final suma otro +25%.
  if(b.st==='STUNNED')dmg=Math.round(dmg*1.25);
  if(S.skills.boss_clone)dmg=Math.round(dmg*1.25);
  b.hp-=dmg;b.flash=0.12;b.hitT=0.14;
  // Números: blanco = tu daño normal · amarillo = golpe fuerte (>=32, puede stunear). Se ocultan con H.
  if(S.showDmg!==false)floaters.push({x:b.x,y:b.y-b.h-10,txt:'-'+dmg,t:0.8,c:dmg>=32?'#ffd933':'#fff'});
  // Chispas proporcionales al daño
  burst(b.x,b.y-40,dmg>=32?'#ffd933':'#fff',dmg>=32?10:4,320);
  if(dmg>=32){hitstop(0.1,0.35);shockRing(b.x,b.y-40,'#ffffff88',90);camShake=Math.max(camShake,2.5);}
  const now=performance.now();
  if(dmg>=32&&b.st!=='STUNNED'&&now-b.stunDr>(b.stunRes||3000)){
    b.st='STUNNED';b.t=1.4;b.stunDr=now;clearDelayedFor(b.pid);
    floaters.push({x:b.x,y:b.y-b.h-30,txt:'STUN',t:0.8,c:'#33e6ff'});shockRing(b.x,b.y-40,'#33e6ff',130);
  }
  if(!b.phase2&&b.hp<b.maxhp/2&&b.hp>0){
    b.phase2=true;
    // BPM sube YA (los tests lo verifican) y la transición es invulnerable.
    Rhythm.bpm=b.bpm[1];Rhythm.rebase(true);lastKickSeen=Rhythm.kickCount;
    startPhaseTransition(b);
  }
  if(b.hp<=0)killBoss(b);
}
function startPhaseTransition(b){
  b.st='TRANS';b.transMax=1.6;b.t=b.transMax;
  b.atkCount=0;b.lastPat='';b.pid=++patId;
  notes=[];noteCombo=0;eProj=[];
  showBanner('FASE 2 · '+b.type,b.idx===5?'¡ENFURECIDO! PISO CORROSIVO':'¡ENFURECIDO! '+b.bpm[1]+' BPM','#ff66ff',2.2);
  screenFlash('#ff66ff',0.35);camShakeT=0.7;camShake=10;
  hitstop(0.12,0.3);
  shockRing(b.x,b.y-40,b.color,120);burst(b.x,b.y-40,b.color,16,320);
  beep(110,0.5,0.3,'sawtooth');
  if(typeof Music!=='undefined'&&Music.syncBoss)Music.syncBoss(b.bpm[1],true);
}
function updatePhaseTransition(b,dt){
  b.t-=dt;
  if(Math.floor(performance.now()/45)%2===0)burst(b.x+(Math.random()-0.5)*90,b.y-20-Math.random()*70,b.color,1,80);
  if(b.t>0)return;
  b.st='IDLE';b.t=0.45;b.flash=0.2;
  shockRing(b.x,b.y-40,b.color,240);shockRing(b.x,b.y-40,'#fff',160);
  burst(b.x,b.y-40,b.color,24,420);burst(b.x,b.y-40,'#fff',10,300);
  camShake=Math.max(camShake,7);screenFlash('#fff',0.16);
  beep(160,0.25,0.2,'square');
}
function killBoss(b){
  b.dead=true;b.locked=false;S.bosses[b.type]=true;
  clearDelayedFor(b.pid);
  // Victoria segura: antes quedaban balas no-hell (rebotes/agujeros) golpeando tras morir.
  eProj=[];notes=[];noteCombo=0;
  platState={};floorDmgT=0;
  const def=BOSS_DEFS.find(d=>d.type===b.type);
  let gain=echoGain(180);
  if(def.pair&&S.bosses[def.pair])gain+=echoGain(80);
  S.echoes+=gain;
  const info=BOSS_SKILL_INFO[def.reward];
  if(def.reward&&!S.skills[def.reward]){S.skills[def.reward]=true;floaters.push({x:b.x,y:b.y-140,txt:'SKILL: '+(info||def.reward),t:2,c:'#3f6'});}
  beep(220,0.4,0.25,'sawtooth');beep(440,0.3,0.2,'square');
  burst(b.x,b.y-40,b.color,30,480);burst(b.x,b.y-40,'#fff',16,360);burst(b.x,b.y-40,'#ffd933',12,300);
  shockRing(b.x,b.y-40,b.color,260);shockRing(b.x,b.y-40,'#fff',170);
  // Animación de disolución: el sprite se desvanece hacia arriba mientras el cuerpo se rompe.
  fx.push({kind:'death',spr:b.spr,sw:b.sw||120,sh:b.sh||b.h,hue:b.hue,x:b.x,y:b.y,face:player&&player.x<b.x,t:1.2,max:1.2,color:b.color});
  // Polvo en puertas al abrir
  const a=ARENAS[b.idx];
  if(a)for(const dx of [a[0],a[1]])burst(dx,775,'#3f6',10,240);
  showBanner('¡'+b.type+' CAÍDO!','+'+gain+' ◈'+(info?' · '+info:''),'#ffd933',2.2);
  screenFlash('#fff',0.22);
  // Pequeña cura al ganar para poder continuar la run + respiro
  if(player){player.hp=Math.min(maxHP(),player.hp+20);iframes=Math.max(iframes,0.7);}
  // Vuelve a BPM exploración para que el siguiente boss ponga el suyo al entrar
  Rhythm.bpm=120;Rhythm.rebase();lastKickSeen=Rhythm.kickCount;
  save();updateDoorState();
  // Final: deja respirar la muerte del jefe y lanza la cinemática.
  if(def&&def.type===BOSS_DEFS[BOSS_DEFS.length-1].type&&!S.endingSeen&&BOSS_DEFS.every(d=>S.bosses[d.type])){
    later(()=>{if(state==='play')startEnding();},2.6,'ending');
  }
}
function attack(fromHold){
  if(atkCd>0||Piano.active||skillOpen||state!=='play')return false;
  const w=WEAPONS[wi],ev=timingMult();
  if(ev.r==='MISS')atkCd=w.cd*1.12;else atkCd=w.cd;
  if(comboT<=0)comboIdx=0;
  if(ev.r==='PERFECT')comboIdx=(comboIdx%3)+1;
  else if(ev.r==='GOOD'&&S.skills.combo_master)comboIdx=(comboIdx%3)+1;
  // PERFECT siempre sube · GOOD solo con combo_master · MISS no rompe, solo no sube
  if(ev.r!=='MISS')comboT=Math.max(0.95,Rhythm.kickGap*1.35);
  const comboM=comboIdx===3?(ev.r==='PERFECT'?1.7:ev.r==='GOOD'?1.28:1.0):comboIdx===2?(ev.r==='PERFECT'?1.22:1.12):1.0;
  const range=w.range*(comboIdx===3?1.18:1);
  player.en=Math.min(100,player.en+(ev.r==='PERFECT'?12:ev.r==='GOOD'?6:0));
  if(comboIdx===3&&ev.r==='PERFECT')player.en=Math.min(100,player.en+12);
  beep(ev.r==='PERFECT'?990:ev.r==='GOOD'?660:220,0.08,fromHold?0.05:0.18);
  if(ev.r==='PERFECT'){burst(player.x+player.face*34,player.y-20,'#ffd933',10,300);shockRing(player.x+player.face*34,player.y-20,'#ffd93388',90);}
  else if(ev.r==='GOOD'){burst(player.x+player.face*34,player.y-20,'#3f6',5,220);}
  if(!fromHold||ev.r!=='MISS'){$('timelabel').textContent=ev.r+' '+Math.round(ev.ms)+'ms'+(ev.r!=='MISS'?' · J=parry':'' );$('timelabel').style.color=ev.r==='PERFECT'?'#ffd933':ev.r==='GOOD'?'#3f6':'#f66';}
  swingT=0.16;swingKind=w.kind;
  // Parry con ataque al beat: radio fijo cerca del jugador, igual para todas las armas
  tryAttackParry(ev);
  if(w.kind==='wave'){
    pProj.push({x:player.x+player.face*30,y:player.y-16,vx:player.face*640,vy:0,w:26,h:20,life:w.range/640,dmg:Math.round(w.base*ev.m*comboM),kind:'wave',weapon:w.name,pierce:true,hits:[]});
  }else if(w.kind==='shot'){
    for(let i=-1;i<=1;i++)pProj.push({x:player.x+player.face*20,y:player.y-16+i*4,vx:player.face*980,vy:i*70,w:10,h:8,life:w.range/980,dmg:Math.round(w.base*ev.m*comboM),kind:'shot',weapon:w.name,hits:[]});
  }else{
    const hx=player.x+player.face*(8+range/2);
    const hitR={x:player.face>0?player.x+8:player.x-8-range,y:player.y-48,w:range,h:60};
    const dmgOf=(type)=>Math.round(w.base*ev.m*(EFFECT[w.name][type]||1)*comboM);
    let hit=false;
    slimes.forEach(s=>{if(!s.dead&&rectHit(hitR,{x:s.x-s.w/2,y:s.y-s.h,w:s.w,h:s.h})){hit=true;hurtSlime(s,dmgOf('Slime'),player.face);}});
    bosses.forEach(b=>{if(!b.dead&&Math.abs(b.x-player.x)<range+44&&Math.abs(b.y-player.y)<130){hit=true;dealBossDmg(b,dmgOf(b.type));}});
    if(hit)parts.push({x:hx,y:player.y-20,vx:0,vy:0,t:0.15,c:'#fff'});
  }
  syncWeapon();
  return true;
}
function special(){
  if(Piano.active||skillOpen||state!=='play')return;
  const w=WEAPONS[wi];let cost=w.cost*(S.skills.energy_efficiency?0.7:1);
  if(player.en<cost){$('timelabel').textContent='SIN ENERGÍA';return;}
  player.en-=cost;const ev=timingMult();const mult=ev.r==='PERFECT'?1.5:ev.r==='GOOD'?1.2:0.8;
  const dmg=Math.round(w.esp*mult);
  beep(440,0.2,0.2,'sawtooth');
  // Recompensa de ChoirWarden: el especial abre un vacío que limpia balas cercanas.
  if(S.skills.boss_blackhole){
    let n=0;
    for(const p of eProj){if(p.hole||p.life<=0)continue;if(Math.hypot(player.x-p.x,(player.y-16)-p.y)<220){p.life=0;n++;burst(p.x,p.y,'#33cc66',3,220);}}
    if(n){player.en=Math.min(100,player.en+Math.min(18,n*2));shockRing(player.x,player.y-16,'#33cc66',230);floaters.push({x:player.x,y:player.y-72,txt:'VACÍO x'+n+' +EN',t:0.9,c:'#33cc66'});}
  }
  if(w.kind==='melee'){
    bosses.forEach(b=>{if(!b.dead&&Math.hypot(b.x-player.x,(b.y-b.h/2)-(player.y-16))<170)dealBossDmg(b,dmg);});
    slimes.forEach(s=>{if(!s.dead&&Math.abs(s.x-player.x)<170)hurtSlime(s,dmg,player.face);});
    shockRing(player.x,player.y-20,'#33e6ff',180);burst(player.x,player.y-20,'#33e6ff',14,320);
  }else if(w.kind==='wave'){
    pProj.push({x:player.x+player.face*30,y:player.y-20,vx:player.face*620,vy:0,w:44,h:34,life:0.9,dmg,kind:'wave',big:true,weapon:w.name,pierce:true,hits:[]});
    shockRing(player.x+player.face*30,player.y-20,'#b34dff',140);
  }else{
    for(let k=0;k<5;k++)later(()=>{if(state==='play')pProj.push({x:player.x+player.face*20,y:player.y-16,vx:player.face*980,vy:(k-2)*70,w:10,h:8,life:0.5,dmg:Math.max(1,Math.round(dmg/5)),kind:'shot',weapon:w.name,hits:[]});},k*0.045);
  }
  syncWeapon();
}
// Parry con ataque al beat: J en PERFECT/GOOD destruye balas enemigas cercanas.
// PERFECT = radio grande + más energía · GOOD = radio menor · MISS = no hay parry.
// Las balas de agujero negro (hole) no se pueden parar con ataque.
function tryAttackParry(ev){
  if(!ev||ev.r==='MISS')return 0;
  const radius=(ev.r==='PERFECT'?145:100)+(S.skills.parry_reflect?35:0);
  let n=0;
  for(const p of eProj){
    if(p.hole||p.life<=0)continue;
    const d=Math.hypot(player.x-p.x,(player.y-16)-p.y);
    if(d<radius){p.life=0;n++;burst(p.x,p.y,'#33e6ff',4,240);}
  }
  if(n>0){
    eProj=eProj.filter(p=>p.life>0);
    player.en=Math.min(100,player.en+(ev.r==='PERFECT'?4*n:2*n));
    shockRing(player.x,player.y-16,'#33e6ff',radius+30);
    floaters.push({x:player.x,y:player.y-64,txt:'PARRY x'+n+' +EN',t:0.8,c:'#33e6ff'});
    beep(1200,0.08,0.16);
  }
  return n;
}
function hurtSlime(s,dmg,dir){
  const now=performance.now();s.hp-=dmg;s.flash=0.1;s.squash=0.25;if(dmg>=22)hitstop(0.1,0.35);beep(300,0.06,0.15);
  if(S.showDmg!==false)floaters.push({x:s.x,y:s.y-30,txt:'-'+dmg,t:0.7,c:dmg>=22?'#ffd933':'#fff'});
  burst(s.x,s.y-s.h*0.5,dmg>=22?'#ffd933':(s.color||'#9f9'),dmg>=22?8:4,260);
  if(dmg>=22&&now-s.dr>1200){s.stun=0.7;s.dr=now;}
  s.vx=dir*160;s.vy=-90;
  if(s.hp<=0&&!s.dead){
    s.dead=true;player.en=Math.min(100,player.en+20);
    const gain=echoGain(12+Math.floor(Math.random()*13));S.echoes+=gain;
    burst(s.x,s.y-s.h*0.5,s.color||'#3c6',14,340);shockRing(s.x,s.y-s.h*0.5,s.color||'#3c6',80);
    floaters.push({x:s.x,y:s.y-s.h-14,txt:'+'+gain+' ◈',t:0.8,c:'#ffd933'});
    save();
  }
}
function dash(){
  if(dashCd>0||state!=='play'||player.hurtT>0)return;const ev=timingMult();dashCd=0.45;dashT=0.17;
  if(S.skills.boss_teleport&&!player.onFloor){player.x+=player.face*140;player.y-=30;beep(880,0.1,0.15);}
  if(ev.r!=='MISS'){iframes=Math.max(iframes,0.25);player.en=Math.min(100,player.en+(ev.r==='PERFECT'?16:9));
    if(ev.r==='PERFECT')player.hp=Math.min(maxHP(),player.hp+(S.skills.dash_heal?10:8));}
  beep(ev.r==='MISS'?200:700,0.07,0.15);
  player.vx=player.face*680;
}
function hurtPlayer(dmg,srcX){
  if(iframes>0||deadT>0||state!=='play')return;
  dmg=Math.round(dmg*diff().dmgTaken);
  player.hp-=dmg;iframes=0.75;
  player.hurtT=0.34;player.hurtDir=srcX!==undefined?(player.x<srcX?-1:1):(-player.face||1);
  player.vx=player.hurtDir*340;player.vy=-220;jbuf=0;dashT=-1;
  comboIdx=0;comboT=0;breakNoteCombo(true);if(typeof syncWeapon==='function')syncWeapon();
  camShakeT=0.22;camShake=7;
  hitstop(0.1,0.35);beep(150,0.2,0.25,'sawtooth');beep(90,0.24,0.15,'square');
  burst(player.x,player.y-20,'#f44',10,260);
  if(S.showDmg!==false)floaters.push({x:player.x,y:player.y-54,txt:'-'+dmg,t:0.8,c:'#ff5577'});
  if(player.hp<=0)die();
}
function die(){
  if(deadT>0)return;deadT=1.1;beep(80,0.8,0.3,'sawtooth');
  notes=[];noteCombo=0;attackHeld=false;swingT=0;noteVis=0;
  const ln=document.getElementById('lanes');if(ln)ln.classList.remove('on');
  S.shade={x:player.x,y:Math.min(player.y,800),echoes:S.echoes};S.echoes=0;save();
}
function respawn(){player=newPlayer();player.hp=maxHP();deadT=0;Rhythm.bpm=120;Rhythm.rebase();resetWorld();player.hp=maxHP();player.x=checkpointX(S.checkpoint);}

// ---------- BULLET-HELL + NOTAS PIANO-TILES (boss lock-in) ----------
const NOTE_COLORS=['#33e6ff','#b34dff','#ffd933','#33ff99'];
// Autopista: 4 carriles en pantalla que caen sobre las cajas 1-4 del HUD.
// Cada ficha nace en un BOMBO y cae ~1.2s. J la rompe sola (la más cercana); 1-4/ZXCV opcional.
const HW_X=[402,454,506,558],HW_Y0=84,HW_HIT=420,NOTE_FALL=1.2,NOTE_MAX=6;
function noteLimit(){return (diff().good+70)/1000;}
function spawnNote(b,forceKey,stagger){
  if(notes.length>=NOTE_MAX||!b||b.dead)return;
  const now=performance.now()/1000,gap=Rhythm.kickGap||1;
  const lead=Math.max(1,Math.round(NOTE_FALL/gap));
  let tHit=(Rhythm.lastKick||now)+lead*gap+(stagger||0);
  if(tHit<now+0.5)tHit=now+0.5;
  const clash=k=>notes.some(n=>!n.dead&&n.key===k&&Math.abs(n.tHit-tHit)<0.18);
  let key=forceKey;
  if(key===undefined){
    const free=[0,1,2,3].filter(k=>!clash(k));
    if(!free.length)return;
    key=free[Math.floor(Math.random()*free.length)];
  }else if(clash(key)){
    const free=[0,1,2,3].filter(k=>!clash(k));
    if(!free.length)return;
    key=free[Math.floor(Math.random()*free.length)];
  }
  notes.push({x:HW_X[key],y:HW_Y0,key,tHit,spd:(HW_HIT-HW_Y0)/(tHit-now),t0:now,dead:false});
}
function breakNoteCombo(silent){
  if(noteCombo>=4&&!silent&&player)floaters.push({x:player.x,y:player.y-84,txt:'COMBO x'+noteCombo+' ROTO',t:0.9,c:'#f66'});
  noteCombo=0;
}
// auto=true: J rompe la ficha más cercana de cualquier carril. Devuelve true si rompió alguna.
function hitNote(key,auto){
  if(state!=='play'||Piano.active||skillOpen||tutHowOpen)return false;
  const b=activeBoss();if(!b)return false;
  const now=performance.now()/1000,D=diff(),lim=noteLimit();
  let best=null,bd=1e9;
  for(const n of notes){
    if(n.dead)continue;
    if(!auto&&n.key!==key)continue;
    const d=Math.abs(n.tHit-now);
    if(d<bd){bd=d;best=n;}
  }
  if(!best||bd>lim)return false;
  const k=best.key,r=bd<=D.perfect/1000?'PERFECT':bd<=D.good/1000?'GOOD':'LATE';
  const ms=Math.round(bd*1000);
  best.dead=true;
  noteCombo++;noteBest=Math.max(noteBest,noteCombo);
  const streak=Math.min(noteCombo-1,10);
  const dmg=(r==='PERFECT'?32:r==='GOOD'?20:10)+streak;
  player.en=Math.min(100,player.en+(r==='PERFECT'?10:r==='GOOD'?5:0));
  dealBossDmg(b,dmg);
  const comboTxt=noteCombo>=2?' x'+noteCombo:'';
  floaters.push({x:player.x,y:player.y-70,txt:r+' FICHA '+(k+1)+comboTxt,t:0.7,c:NOTE_COLORS[k]});
  $('timelabel').textContent=r+' ♪'+(k+1)+comboTxt+' '+ms+'ms';
  $('timelabel').style.color=r==='PERFECT'?'#ffd933':r==='GOOD'?'#3f6':'#f66';
  beep((r==='PERFECT'?1200:r==='GOOD'?900:440)+Math.min(noteCombo,12)*40,0.1,0.18);
  burst(best.x,HW_HIT,NOTE_COLORS[k],10,320);
  shockRing(best.x,best.y,NOTE_COLORS[k],70);
  return true;
}
// Barrage rítmico por boss: cada tipo favorece sus modos (personalidad).
// Resonator=RING/FAN simple · Bass=RAIN pesada · Choir=SPIRAL/FAN · Void=FAN/RAIN · Prime=SPIRAL rápido · Primordial=todo denso.
function fireKickBarrage(b){
  if(b.dead||b.st==='STUNNED'||b.st==='AIR'||b.st==='TRANS')return; // en el aire no hay fichas: solo esquiva
  const dx=player.x-b.x,dy=(player.y-16)-(b.y-50);
  const baseAng=Math.atan2(dy,dx);
  const hard=S.difficulty==='hard',easy=S.difficulty==='easy';
  // Escalado exponencial por índice: boss 0 tutorial, boss 5 infierno.
  const esc=b.idx||0,g=bossScale(b);
  const early=esc<2;
  const ph=(b.phase2?1.22:1)*g.dmg*(early?0.85:1);
  const ringN=Math.max(4,Math.round((easy?6:hard?11:early?8:9)*g.cnt));
  const fanN=Math.max(2,Math.round((easy?3:hard?5:early?3:4)*g.cnt));
  const rainN=Math.max(4,Math.round((easy?5:hard?9:7)*g.cnt));
  const spd=(easy?260:hard?360:early?250:320)*g.spd*(b.phase2?1.12:1);
  const col=b.color||'#ff2255';
  const pref={
    Resonator:[0,1,0,1],
    BassTitan:[3,1,3,0],
    ChoirWarden:[2,1,2,0],
    VoidHarvester:[1,3,1,2],
    EchoPrime:[2,1,2,3],
    EchoPrimordial:[0,1,2,3]
  }[b.type]||[0,1,2,3];
  const mode=pref[Rhythm.kickCount%pref.length];
  const sx=b.x,sy=b.y-50;
  burst(sx,sy,col,3,90); // fogonazo de salida, ahora visible y del color del jefe
  if(mode===0){ // RING radial
    for(let i=0;i<ringN;i++){const a=i/ringN*Math.PI*2+b.spiral*0.3;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,w:12,h:12,life:2.6,dmg:Math.round(11*ph),hell:true,col});}
    beep(140,0.14,0.2,'sawtooth');
  }else if(mode===1){ // FAN apuntado al jugador
    for(let i=0;i<fanN;i++){const off=(i-(fanN-1)/2)*0.16;const a=baseAng+off;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*1.25,vy:Math.sin(a)*spd*1.25,w:13,h:13,life:2.2,dmg:Math.round(12*ph),hell:true,col});}
    beep(180,0.1,0.18,'sawtooth');
  }else if(mode===2){ // SPIRAL doble rotatoria
    b.spiral+=0.55;
    for(const o of [0,Math.PI]){const a=b.spiral+o;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*0.9,vy:Math.sin(a)*spd*0.9,w:12,h:12,life:3,dmg:Math.round(10*ph),hell:true,col});}
    if(b.phase2){for(const o of [Math.PI/2,-Math.PI/2]){const a=b.spiral+o;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*0.9,vy:Math.sin(a)*spd*0.9,w:12,h:12,life:3,dmg:Math.round(10*ph),hell:true,col});}}
    beep(200,0.08,0.15,'sawtooth');
  }else{ // RAIN: lluvia con hueco sobre el jugador (esquiva lateral)
    const n=rainN;
    for(let i=0;i<n;i++){const rx=b.x-260+i*(520/Math.max(1,n-1));
      if(Math.abs(rx-player.x)<46)continue; // hueco
      eProj.push({x:rx,y:sy-160,vx:0,vy:(spd*0.85),w:12,h:12,life:2.4,dmg:Math.round(11*ph),hell:true,col});}
    beep(160,0.12,0.18,'sawtooth');
  }
  // Extra para bosses tardíos: doble presión en el mismo bombo (sin duplicar notas)
  if(!easy&&b.idx>=3&&b.st!=='STUNNED'){
    b.spiral+=0.2;
    const a2=b.spiral;
    eProj.push({x:sx,y:sy,vx:Math.cos(a2)*spd*0.85,vy:Math.sin(a2)*spd*0.85,w:12,h:12,life:2.6,dmg:Math.round(10*ph),hell:true,col});
    if(b.idx>=5||b.phase2){
      const a3=a2+Math.PI;
      eProj.push({x:sx,y:sy,vx:Math.cos(a3)*spd*0.85,vy:Math.sin(a3)*spd*0.85,w:12,h:12,life:2.6,dmg:Math.round(10*ph),hell:true,col});
    }
  }
  if(eProj.length>230)eProj.splice(0,eProj.length-230);
  // Notas piano-tiles: tutorial de una en una; dobles (2 carriles) en bosses tardíos y fase 2
  const kc=Rhythm.kickCount;
  if(b.phase2&&kc%4===0){
    const k1=Math.floor(Math.random()*4),k2=(k1+1+Math.floor(Math.random()*3))%4;
    spawnNote(b,k1);spawnNote(b,k2,0.12);
  }else if(b.idx>=2&&kc%4===2){
    const k1=Math.floor(Math.random()*4),k2=(k1+1+Math.floor(Math.random()*3))%4;
    spawnNote(b,k1);spawnNote(b,k2,0.14);
  }else if(kc%2===0)spawnNote(b);
}
// ---------- SALTO ENTRE PLATAFORMAS ----------
function planBossLeap(b,plat){
  const a=ARENAS[b.idx]||[0,WORLD_W];
  b.leapPlat=plat?plat.i:null;
  b.leapToX=plat?plat.x:Math.max(a[0]+90,Math.min(a[1]-90,player.x));
  b.leapToY=plat?plat.y:GROUND_TOP;
  b.pat=(plat&&b.phase2&&b.idx>=3&&Math.random()<0.45)?'SLAM':'LEAP';
  b.lastPat=b.pat;
}
function startBossLeap(b){
  b.st='LEAP';b.leapT=0.55;b.t=b.leapT;
  b.leapFromX=b.x;b.leapFromY=b.y;
  b.flash=0.25;b.pid=++patId;
  burst(b.x,b.y-20,b.color,8,180);beep(300,0.12,0.18,'sawtooth');
  camShake=Math.max(camShake,2);
}
function updateBossLeap(b,dt){
  b.t-=dt;
  const k=Math.min(1,1-Math.max(0,b.t)/b.leapT),e=k*k*(3-2*k);
  b.x=b.leapFromX+(b.leapToX-b.leapFromX)*e;
  b.y=b.leapFromY+(b.leapToY-b.leapFromY)*e-Math.sin(Math.PI*k)*140;
  if(Math.floor(performance.now()/55)%2===0)
    fx.push({kind:'bossghost',spr:b.spr,sw:b.sw||120,sh:b.sh||b.h,hue:b.hue,x:b.x,y:b.y,face:b.leapToX<b.leapFromX,t:0.2,max:0.2,color:b.color});
  if(b.t>0)return;
  b.x=b.leapToX;b.y=b.leapToY;
  const landed=b.leapPlat;
  b.st='IDLE';b.t=0.35;
  if(landed!==null&&landed!==undefined&&isPlatBroken(landed))b.y=bossSurfaceUnder(Object.assign({},b,{y:b.leapToY}));
  b.surfY=b.y;b.flash=0.2;
  shockRing(b.x,b.y-20,b.color,140);burst(b.x,b.y-20,b.color,14,260);camShake=Math.max(camShake,4);
  beep(120,0.18,0.22,'square');
  if(b.pat==='SLAM'){
    const R=b.phase2?215:175;
    if(Math.abs(player.x-b.x)<R&&Math.abs(player.y-b.y)<44)hurtPlayer(Math.round(16*bossScale(b).dmg),b.x);
    shockRing(b.x,b.y-14,b.color,R);burst(b.x,b.y-14,b.color,18,340);
    if(landed!==null&&landed!==undefined&&b.idx>=3&&b.phase2)breakPlatform(landed,0.55,2.8);
  }
  b.leapPlat=null;b.pat='';
}
const BOSS_PREFS={
  Resonator:[['DOUBLE',.3],['WAVE',.2],['PULSE',.15],['TELEPORT',.08],['SINGLE',.27]],
  BassTitan:[['WAVE',.3],['PULSE',.28],['DOUBLE',.17],['SINGLE',.25]],
  ChoirWarden:[['RICOCHET',.18],['DOUBLE',.22],['WAVE',.16],['TELEPORT',.1],['FAN',.14],['SINGLE',.2]],
  VoidHarvester:[['BLACKHOLE',.14],['DOUBLE',.2],['PULSE',.2],['FAN',.12],['SINGLE',.34]],
  EchoPrime:[['TELEPORT',.24],['DOUBLE',.22],['RICOCHET',.16],['WAVE',.15],['FAN',.13],['SINGLE',.1]],
  EchoPrimordial:[['TELEPORT',.14],['CLONE',.12],['RICOCHET',.12],['BLACKHOLE',.12],['DOUBLE',.16],['WAVE',.16],['FAN',.1],['SINGLE',.08]]
};
function weightedPick(opts,exclude){
  let total=0;for(const [p,w] of opts)if(p!==exclude)total+=w;
  if(total<=0)return opts[0][0];
  let r=Math.random()*total;
  for(const [p,w] of opts){if(p===exclude)continue;r-=w;if(r<=0)return p;}
  return opts[0][0];
}
function choosePattern(b,dx,adx){
  b.atkCount=(b.atkCount||0)+1;
  // Patrón aéreo: cada 6 ataques (5 en fase 2) sube fuera de alcance y bombardea.
  const airEvery=b.phase2?5:6;
  if(b.atkCount%airEvery===0){b.pat='AIR';return;}
  // Firma única cada N ataques (en fase 2 cae un ataque antes).
  const every=Math.max(2,(b.sigEvery||4)-(b.phase2?1:0));
  if(b.atkCount%every===0){b.pat='SIG';return;}
  // Plataformas: si el jugador está arriba, el boss salta a por él (y aplasta en fase 2).
  const plat=platformUnderPlayer(),bs=b.surfY||GROUND_TOP;
  if(plat&&plat.y<bs-2&&Math.random()<(b.phase2?0.6:0.35)){planBossLeap(b,plat);return;}
  if(bs<GROUND_TOP-2&&Math.random()<0.5){planBossLeap(b,null);return;}
  // Personalidad por boss + variedad: nunca repite el mismo patrón dos veces seguidas.
  let opts=BOSS_PREFS[b.type]||BOSS_PREFS.Resonator;
  if(adx<110){
    opts=b.type==='BassTitan'?[['PULSE',.6],['WAVE',.4]]:[['WAVE',.55],['PULSE',.3],['FAN',.15]];
  }else if(adx>330){
    // A distancia no tiene sentido el pulso de cuerpo a cuerpo: presiona con ataques que llegan.
    opts=opts.filter(([p])=>p!=='PULSE');
    if(b.phase2)opts=opts.map(([p,w])=>[p,p==='TELEPORT'||p==='FAN'?w*1.5:w]);
  }
  b.pat=weightedPick(opts,b.lastPat);
  b.lastPat=b.pat;
}
// ---------- FASE AÉREA ----------
function startAirBoss(b){
  const a=ARENAS[b.idx]||[0,WORLD_W];
  clearDelayedFor(b.pid);b.pid=++patId;
  b.st='AIR';b.airT=0;b.airAtk=0;b.airHit=false;
  b.airMax=b.phase2?2.3:2.5;
  b.airY=GROUND_TOP-300;
  b.airStartY=b.y;
  const side=Math.random()<0.5?-1:1;
  b.airX=Math.max(a[0]+90,Math.min(a[1]-90,player.x+side*180));
  b.airLandY=bossSurfaceUnder({x:b.airX,y:b.airY,w:b.w});
  b.flash=0.18;b.evadeT=0;
  // Sin fichas mientras está fuera de alcance: la ventana es de esquiva, no de DPS.
  notes=[];noteCombo=0;
  showBanner('AIRE','¡FUERA DE ALCANCE!','#33e6ff',1.4);
  screenFlash('#33e6ff',0.10);
  beep(520,0.2,0.14,'sine');beep(780,0.3,0.1,'sine');
}
function updateAirBoss(b,dt){
  b.airT+=dt;
  const a=ARENAS[b.idx]||[0,WORLD_W];
  b.x+=(b.airX-b.x)*Math.min(1,dt*7);
  b.x=Math.max(a[0]+50,Math.min(a[1]-50,b.x));
  const rise=0.5,fall=0.55,fallStart=Math.max(rise+0.2,(b.airMax||2.5)-fall);
  const y0=(b.airStartY===undefined?GROUND_TOP:b.airStartY),y1=(b.airLandY===undefined?GROUND_TOP:b.airLandY);
  if(b.airT<rise){const k=b.airT/rise;b.y=y0+(b.airY-y0)*(1-Math.pow(1-k,3));}
  else if(b.airT<fallStart)b.y=b.airY;
  else{const k=Math.min(1,(b.airT-fallStart)/fall);b.y=b.airY+(y1-b.airY)*k*k;}
  if(b.airAtk===0&&b.airT>=0.65){b.airAtk=1;fireAirAttack(b,0);}
  if(b.airAtk===1&&b.airT>=1.35){b.airAtk=2;fireAirAttack(b,1);}
  if(b.airT>=(b.airMax||2.5)){
    b.st='IDLE';b.t=b.phase2?0.45:0.7;b.y=y1;b.surfY=y1;b.airT=0;b.airAtk=0;b.airHit=false;
    b.flash=0.18;b.contactCd=Math.max(b.contactCd||0,0.5);
    shockRing(b.x,b.y-20,b.color,150);burst(b.x,b.y-20,b.color,12,260);camShake=Math.max(camShake,3);
    beep(160,0.14,0.16,'square');
  }
}
// Cada jefe tiene su firma aérea: nieve de escombros, orbes, fan o anillo.
function fireAirAttack(b,k){
  const sx=b.x,sy=b.y-40,col=b.color||'#f66',g=bossScale(b),ph=(b.phase2?1.22:1)*g.dmg;
  const easy=S.difficulty==='easy',hard=S.difficulty==='hard';
  const spd=(easy?260:hard?400:340)*g.spd*(b.phase2?1.08:1);
  const dmg=n=>Math.round(n*ph*(easy?0.8:hard?1.12:1));
  const aim=Math.atan2((player.y-16)-sy,player.x-sx);
  const shot=(a,s,w,d,life)=>{eProj.push({x:sx,y:sy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,w:w||12,h:w||12,life:life||2.4,dmg:d,hell:true,col});};
  if(k===0){
    if(b.type==='BassTitan'||b.type==='EchoPrimordial'){
      // LLUVIA: escombros alrededor del jugador; moverse deja un hueco.
      const n=Math.max(4,Math.round((b.phase2?7:5)*g.cnt));
      for(let i=0;i<n;i++)eProj.push({x:player.x+(i-(n-1)/2)*72,y:sy-150,vx:0,vy:390,w:15,h:15,life:2.4,dmg:dmg(10),hell:true,col});
      shockRing(sx,sy,col,170);beep(90,0.3,0.22,'sawtooth');
    }else if(b.type==='ChoirWarden'||b.type==='VoidHarvester'){
      // CORO: orbes que caen y estallan en abanico dirigido.
      const n=b.phase2?4:3;
      for(let i=0;i<n;i++)eProj.push({x:player.x+(i-(n-1)/2)*130,y:sy-150,vx:0,vy:190,w:18,h:18,life:2.8,dmg:dmg(8),hell:true,col,fuse:0.7,split:b.phase2?5:4});
      beep(240,0.25,0.18,'sine');
    }else{
      // ABANICO aéreo apuntado al jugador.
      const n=b.phase2?5:4;
      for(let i=0;i<n;i++)shot(aim+(i-(n-1)/2)*0.18,spd,13,dmg(10));
      beep(300,0.12,0.16,'sawtooth');
    }
  }else{
    if(b.type==='VoidHarvester'){
      // HORIZONTE: agujero bajo el jugador + anillo desde el aire.
      const tx=player.x,ty=Math.max(GROUND_TOP-250,Math.min(GROUND_TOP-70,player.y-100));
      shockRing(tx,ty,'#33cc66',190);
      eProj.push({x:tx,y:ty,hole:true,t:b.phase2?3:2.4});
      for(let i=0;i<8;i++)shot(i/8*6.283,spd*0.85,11,dmg(8));
      beep(70,0.5,0.22,'sine');
    }else if(b.type==='EchoPrime'){
      // CRUZ: abanico rápido y estrecho.
      const n=Math.max(4,Math.round((b.phase2?7:5)*g.cnt));
      for(let i=0;i<n;i++)shot(aim+(i-(n-1)/2)*0.13,spd*1.25,12,dmg(10));
      beep(1200,0.08,0.12);
    }else{
      // ANILLO radial desde el aire.
      const n=Math.max(8,Math.round(((b.phase2?14:10)+(b.idx>=3?2:0))*Math.sqrt(g.cnt))),off=Math.random()*6.283;
      for(let i=0;i<n;i++)shot(off+i/n*6.283,spd*0.9,12,dmg(8));
      beep(160,0.2,0.18,'sawtooth');
    }
  }
}
function cloneSlime(b,ox,dir){
  if(slimes.length>=22)return;
  const st=SLIME_TYPES.mite;
  slimes.push({x:b.x+(ox||40),y:b.y-20,vx:0,vy:0,w:st.w,h:st.h,hp:st.hp,maxhp:st.hp,dir:dir||-1,home:b.x,t:0,stun:0,dr:0,contactCd:0,squash:0,type:'clone',color:'#cc33cc',hue:280,spd:st.spd,chase:st.chase,contact:10,jump:st.jump});
}
// Firma por boss: un ataque exclusivo que rompe el bucle y enseña su identidad.
function fireSignature(b,dx){
  const sx=b.x,sy=b.y-50,g=bossScale(b),ph=(b.phase2?1.25:1)*g.dmg,dir=Math.sign(dx)||1,col=b.color||'#f66';
  const id=++patId;b.pid=id;
  const alive=()=>!b.dead&&b.st!=='STUNNED'&&b.pid===id;
  switch(b.type){
    case 'Resonator': // CASCADA: tres pulsos de suelo, salta el tercero o dash.
      for(let i=0;i<3;i++)later(()=>{
        if(!alive())return;
        const R2=170+i*90;
        shockRing(sx,b.y-40,col,R2);burst(sx,b.y-40,col,10,260);
        if(Math.abs(player.x-sx)<R2&&Math.abs(player.y-b.y)<90)hurtPlayer(Math.round(11*ph),sx);
        beep(110+i*35,0.28,0.22,'sawtooth');
      },i*0.38,id);
      break;
    case 'BassTitan': // TERREMOTO: ondas de suelo a ambos lados + escombros.
      hitstop(0.1,0.35);camShakeT=0.4;camShake=9;
      for(const d of [-1,1])eProj.push({x:sx+d*30,y:GROUND_TOP-18,vx:d*330,vy:0,w:34,h:26,life:2.1,dmg:Math.round(18*ph),hell:true,col,ground:true});
      for(let i=0;i<3;i++)later(()=>{
        if(!alive())return;
        eProj.push({x:player.x+(i-1)*80,y:GROUND_TOP-300,vx:0,vy:400,w:16,h:16,life:1.5,dmg:Math.round(13*ph),hell:true,col});
        burst(player.x+(i-1)*80,GROUND_TOP-300,col,5,120);
      },0.18+i*0.14,id);
      shockRing(sx,GROUND_TOP-16,col,240);burst(sx,GROUND_TOP-16,col,22,380);
      beep(70,0.5,0.3,'sawtooth');beep(120,0.35,0.2,'square');
      break;
    case 'ChoirWarden': // SERMÓN: tres orbes que caen sobre el jugador y estallan en abanico.
      for(let i=0;i<3;i++){
        const ox=player.x+(i-1)*110;
        eProj.push({x:ox,y:GROUND_TOP-330,vx:0,vy:220,w:18,h:18,life:2.6,dmg:Math.round(11*ph),hell:true,col,fuse:0.9,split:5});
        burst(ox,GROUND_TOP-330,col,5,120);
      }
      shockRing(sx,sy,col,150);burst(sx,sy,col,14,240);beep(240,0.3,0.2,'sine');
      break;
    case 'VoidHarvester': { // HORIZONTE: agujero avisado bajo el jugador + lluvia radial.
      const tx=player.x,ty=Math.max(GROUND_TOP-230,Math.min(GROUND_TOP-80,player.y-100));
      later(()=>{
        if(!alive())return;
        shockRing(tx,ty,'#33cc66',200);burst(tx,ty,'#33cc66',18,300);
        eProj.push({x:tx,y:ty,hole:true,t:3.4});
        beep(60,0.6,0.3,'sawtooth');
      },0.55,id);
      for(let i=0;i<8;i++)later(()=>{
        if(!alive())return;
        const a=Math.random()*6.283;
        eProj.push({x:sx,y:sy,vx:Math.cos(a)*220,vy:Math.sin(a)*220,w:11,h:11,life:2,dmg:Math.round(9*ph),hell:true,col});
      },0.9+i*0.05,id);
      break;
    }
    case 'EchoPrime': // DESTELLO: parpadea al otro lado y dispara una cruz dirigida.
      later(()=>{
        if(!alive())return;
        const a=ARENAS[b.idx]||[200,WORLD_W-200];
        const side=player.x>(a[0]+a[1])/2?-1:1;
        burst(sx,sy,'#ffe633',18,360);shockRing(sx,sy,'#ffe633',150);
        b.x=Math.max(a[0]+70,Math.min(a[1]-70,player.x+side*210));clampBoss(b);b.y=b.surfY;
        burst(b.x,b.y-50,'#ffe633',18,360);
        const ang=Math.atan2((player.y-16)-(b.y-50),player.x-b.x);
        for(let i=-2;i<=2;i++){const aa=ang+i*0.13;
          eProj.push({x:b.x,y:b.y-50,vx:Math.cos(aa)*420,vy:Math.sin(aa)*420,w:12,h:12,life:2,dmg:Math.round(11*ph),hell:true,col:'#ffe633'});}
        beep(1400,0.08,0.2);beep(900,0.06,0.15);
      },0.4,id);
      break;
    default: { // EchoPrimordial · APOCALIPSIS: anillo + lluvia + eco clon.
      const n=b.phase2?18:14;
      for(let i=0;i<n;i++){const a=i/n*6.283+b.spiral;
        eProj.push({x:sx,y:sy,vx:Math.cos(a)*230,vy:Math.sin(a)*230,w:12,h:12,life:2.6,dmg:Math.round(10*ph),hell:true,col});}
      for(let i=0;i<7;i++){const rx=sx-280+i*93;if(Math.abs(rx-player.x)<40)continue;
        eProj.push({x:rx,y:sy-200,vx:0,vy:300,w:13,h:13,life:2.4,dmg:Math.round(11*ph),hell:true,col});}
      cloneSlime(b,-50,-dir);if(b.phase2)cloneSlime(b,50,dir);
      b.spiral+=0.4;shockRing(sx,sy,col,260);burst(sx,sy,col,26,420);
      screenFlash(col,0.18);beep(90,0.5,0.3,'sawtooth');
      break;
    }
  }
}
function firePattern(b,dx){
  if(b.pat==='AIR'){startAirBoss(b);return;}
  if(b.pat==='SIG'){fireSignature(b,dx);return;}
  if(b.pat==='LEAP'||b.pat==='SLAM'){startBossLeap(b);return;}
  const dir=Math.sign(dx)||1,g=bossScale(b),ph=(b.phase2?1.25:1)*g.dmg,col=b.color||'#ff2255';
  const id=++patId;b.pid=id;
  const alive=()=>!b.dead&&b.st!=='STUNNED'&&b.pid===id;
  const aim=()=>{const lead=b.phase2?0.18:0.1;return Math.atan2((player.y-16+(player.vy||0)*lead)-(b.y-50),(player.x+(player.vx||0)*lead)-b.x);};
  if(b.pat==='RUSH'){
    // Gap-closer: la telegrafía es la línea de EMBESTIDA; al frenar escupe un abanico.
    const dist=Math.max(1,Math.abs(dx));
    const spd=Math.min(1300,Math.max(420,dist/0.36))*g.spd;
    b.lungeVx=dir*spd;b.st='LUNGE';b.t=Math.min(0.65,dist/spd);b.flash=0.25;
    burst(b.x,b.y-40,col,10,220);beep(240,0.2,0.25,'sawtooth');camShake=Math.max(camShake,3);
  }else if(b.pat==='SINGLE'||b.pat==='DOUBLE'){
    const offs=b.pat==='DOUBLE'?[-0.08,0.08]:[0];
    offs.forEach((off,k)=>later(()=>{if(!alive())return;const a=aim()+off;
      eProj.push({x:b.x,y:b.y-50,vx:Math.cos(a)*720*g.spd,vy:Math.sin(a)*720*g.spd,w:16,h:16,life:1.7,dmg:Math.round(16*ph),hell:true,col});
      beep(180,0.08,0.15,'sawtooth');burst(b.x,b.y-50,col,3,140);},0.08+k*0.05,id));
  }else if(b.pat==='WAVE'){later(()=>{if(!alive())return;eProj.push({x:b.x+dir*10,y:GROUND_TOP-22,vx:dir*700*g.spd,vy:0,w:34,h:24,life:1.2,dmg:Math.round(22*ph),hell:true,col,ground:true});shockRing(b.x,b.y-40,col,110);beep(200,0.12,0.2,'sawtooth');},0.1,id);}
  else if(b.pat==='PULSE'){later(()=>{if(!alive())return;const R2=b.type==='BassTitan'?200:160;if(Math.abs(player.x-b.x)<R2&&Math.abs(player.y-b.y)<90)hurtPlayer(Math.round(14*ph),b.x);shockRing(b.x,b.y-40,col,R2);burst(b.x,b.y-40,col,12,300);beep(120,0.3,0.25,'sawtooth');},0.1,id);}
  else if(b.pat==='RICOCHET'){later(()=>{if(!alive())return;eProj.push({x:b.x,y:player.y-16,vx:dir*550*g.spd,vy:0,leg:400,bounce:b.phase2?3:2,life:3,dmg:Math.round(18*ph),w:14,h:14,hell:true,col});},0.1,id);}
  else if(b.pat==='FAN'){later(()=>{if(!alive())return;const n=Math.max(3,Math.round((b.phase2?7:5)*g.cnt)),a0=aim();
    for(let i=0;i<n;i++){const a=a0+(i-(n-1)/2)*0.14;
      eProj.push({x:b.x,y:b.y-50,vx:Math.cos(a)*390*g.spd,vy:Math.sin(a)*390*g.spd,w:12,h:12,life:2.1,dmg:Math.round(9*ph),hell:true,col});}
    beep(260,0.1,0.16,'sawtooth');},0.1,id);}
  else if(b.pat==='BLACKHOLE'){
    // Ya no nace lejos del jugador: el vórtice aparece bajo sus pies con aviso.
    const tx=player.x,ty=Math.max(GROUND_TOP-250,Math.min(GROUND_TOP-70,player.y-100));
    shockRing(tx,ty,'#33cc66',190);beep(80,0.25,0.18,'sine');
    later(()=>{if(!alive())return;eProj.push({x:tx,y:ty,hole:true,t:b.phase2?3.4:2.8});
      shockRing(tx,ty,'#33cc66',150);burst(tx,ty,'#33cc66',14,240);},0.5,id);
  }
  else if(b.pat==='TELEPORT'){later(()=>{if(!alive())return;const a=ARENAS[b.idx]||[200,WORLD_W-200];const ox=b.x,oy=b.y-50;
    const side=Math.random()<0.5?-1:1;
    let nx=player.x+(230+Math.random()*90)*side;
    nx=Math.max(a[0]+70,Math.min(a[1]-70,nx));
    if(Math.abs(nx-player.x)<150)nx=player.x-220*side;
    b.x=Math.max(a[0]+70,Math.min(a[1]-70,nx));clampBoss(b);b.y=b.surfY;
    burst(ox,oy,col,12,280);shockRing(ox,oy,col,110);burst(b.x,b.y-50,col,12,280);
    const ang=Math.atan2((player.y-16)-(b.y-50),player.x-b.x),n=Math.max(2,Math.round((b.phase2?5:3)*g.cnt));
    for(let i=0;i<n;i++){const aa=ang+(i-(n-1)/2)*0.14;
      eProj.push({x:b.x,y:b.y-50,vx:Math.cos(aa)*520*g.spd,vy:Math.sin(aa)*520*g.spd,w:13,h:13,life:1.8,dmg:Math.round(10*ph),hell:true,col});}
    beep(600,0.08,0.15);},0.33,id);}
  else if(b.pat==='CLONE'){later(()=>{if(!alive())return;cloneSlime(b,40,-dir);if(b.phase2)cloneSlime(b,-40,dir);},0.4,id);}
}
