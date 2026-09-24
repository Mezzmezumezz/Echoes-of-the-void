// js/combat.js — combate, bosses con timers escalados
'use strict';
function timingMult(){return Rhythm.evaluate();}
function burst(x,y,color,n,spd){
  for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()-0.5)*spd,vy:-Math.random()*spd*0.8,t:0.4+Math.random()*0.3,c:color});
}
function shockRing(x,y,color,maxR){
  parts.push({x,y,vx:0,vy:0,t:0.45,c:color,nograv:true,ring:true,r:6,vr:(maxR||160)/0.45});
}
function dealBossDmg(b,dmg){
  if(b.dead)return;
  b.hp-=dmg;b.flash=0.12;
  // Números: blanco = tu daño normal · amarillo = golpe fuerte (>=32, puede stunear). Se ocultan con H.
  if(S.showDmg!==false)floaters.push({x:b.x,y:b.y-b.h-10,txt:'-'+dmg,t:0.8,c:dmg>=32?'#ffd933':'#fff'});
  // Chispas proporcionales al daño
  burst(b.x,b.y-40,dmg>=32?'#ffd933':'#fff',dmg>=32?10:4,320);
  if(dmg>=32){hitstop(0.1,0.35);shockRing(b.x,b.y-40,'#ffffff88',90);}
  const now=performance.now();
  if(dmg>=32&&now-b.stunDr>3000){b.st='STUNNED';b.t=1.4;b.stunDr=now;clearDelayedFor(b.pid);floaters.push({x:b.x,y:b.y-b.h-30,txt:'STUN',t:0.8,c:'#33e6ff'});shockRing(b.x,b.y-40,'#33e6ff',130);}
  if(!b.phase2&&b.hp<b.maxhp/2){
    b.phase2=true;Rhythm.bpm=b.bpm[1];Rhythm.rebase();
    floaters.push({x:b.x,y:b.y-b.h-50,txt:'FASE 2 · ¡Enfurecido!',t:1.4,c:'#f0f'});
    shockRing(b.x,b.y-40,b.color,220);shockRing(b.x,b.y-40,'#ffffff',140);
    burst(b.x,b.y-40,b.color,22,420);burst(b.x,b.y-40,'#fff',10,300);
    beep(110,0.4,0.3,'sawtooth');beep(220,0.3,0.25,'square');
    // En fase 2 suelta ráfaga inicial según tipo para avisar el cambio
    later(()=>{if(!b.dead&&b.locked)fireKickBarrage(b);},0.4);
  }
  if(b.hp<=0)killBoss(b);
}
function killBoss(b){
  b.dead=true;b.locked=false;S.bosses[b.type]=true;
  eProj=eProj.filter(p=>!p.hell);notes=[];noteCombo=0;
  const def=BOSS_DEFS.find(d=>d.type===b.type);
  S.echoes+=echoGain(180);
  if(def.pair&&S.bosses[def.pair])S.echoes+=echoGain(80);
  if(def.reward&&!S.skills[def.reward]){S.skills[def.reward]=true;floaters.push({x:b.x,y:b.y-140,txt:'SKILL: '+def.reward,t:2,c:'#3f6'});}
  beep(220,0.4,0.25,'sawtooth');beep(440,0.3,0.2,'square');
  burst(b.x,b.y-40,b.color,30,480);burst(b.x,b.y-40,'#fff',16,360);burst(b.x,b.y-40,'#ffd933',12,300);
  shockRing(b.x,b.y-40,b.color,260);shockRing(b.x,b.y-40,'#fff',170);
  // Polvo en puertas al abrir
  const a=ARENAS[b.idx];
  if(a){for(const dx of [a[0],a[1]]){for(let i=0;i<10;i++)parts.push({x:dx,y:700+Math.random()*150,vx:(Math.random()-0.5)*240,vy:-Math.random()*200,t:0.5,c:'#3f6'});}}
  floaters.push({x:b.x,y:b.y-110,txt:'¡BOSS CAÍDO! +180 ◈',t:2,c:'#ffd933'});
  // Pequeña cura al ganar para poder continuar la run
  if(player)player.hp=Math.min(maxHP(),player.hp+20);
  // Vuelve a BPM exploración para que el siguiente boss ponga el suyo al entrar
  Rhythm.bpm=120;Rhythm.rebase();lastKickSeen=Rhythm.kickCount;
  save();updateDoorState();
}
function attack(){
  if(atkCd>0||Piano.active||skillOpen||state!=='play')return;
  const w=WEAPONS[wi],ev=timingMult();
  if(ev.r==='MISS')atkCd=w.cd*1.4;else atkCd=w.cd;
  if(comboT<=0)comboIdx=0;
  if(ev.r==='PERFECT')comboIdx=(comboIdx%3)+1;
  else if(ev.r==='GOOD'){if(S.skills.combo_master)comboIdx=(comboIdx%3)+1;else if(comboIdx===2&&Math.random()<0.65)comboIdx=3;}
  else comboIdx=0;
  comboT=0.95;
  let comboM=comboIdx===3?(ev.r==='PERFECT'?1.7:ev.r==='GOOD'?1.28:1.0):comboIdx===2?(ev.r==='PERFECT'?1.22:1.12):1.0;
  const range=w.range*(comboIdx===3?1.42:comboIdx===2?1.18:1);
  player.en=Math.max(0,Math.min(100,player.en+(ev.r==='PERFECT'?12:ev.r==='GOOD'?6:-8)));
  if(comboIdx===3&&ev.r==='PERFECT')player.en=Math.min(100,player.en+12);
  beep(ev.r==='PERFECT'?990:ev.r==='GOOD'?660:220,0.08,0.18);
  // Feedback: chispas + anillo en PERFECT/GOOD
  if(ev.r==='PERFECT'){burst(player.x+player.face*34,player.y-20,'#ffd933',10,300);shockRing(player.x+player.face*34,player.y-20,'#ffd93388',90);}
  else if(ev.r==='GOOD'){burst(player.x+player.face*34,player.y-20,'#3f6',5,220);}
  // sin hitstop en ataques normales: el slow-mo constante se sentía horrible
  $('timelabel').textContent=ev.r+' '+Math.round(ev.ms)+'ms'+(ev.r!=='MISS'?' · J=parry':'' );$('timelabel').style.color=ev.r==='PERFECT'?'#ffd933':ev.r==='GOOD'?'#3f6':'#f66';
  // Parry con ataque: también vale para armas a distancia (radio base 100/135 alrededor del jugador)
  tryAttackParry(ev,range);
  if(w.name==='VoidWave'){pProj.push({x:player.x+player.face*30,y:player.y-16,vx:player.face*760,w:18,h:10,life:0.55,dmg:Math.round(w.base*ev.m),kind:'wave'});}
  else if(w.name==='EchoShot'){for(let i=-1;i<=1;i++)pProj.push({x:player.x+player.face*20,y:player.y-16+i*14,vx:player.face*900,w:14,h:6,life:0.5,dmg:Math.round(w.base*0.6*ev.m),kind:'shot'});}
  else{
    const hx=player.x+player.face*(w.box[0]/2+14);
    const hitR={x:hx-range/2,y:player.y-40,w:range,h:56};
    const dmgOf=(type)=>Math.round(w.base*ev.m*(EFFECT[w.name][type]||1)*comboM);
    let hit=false;
    slimes.forEach(s=>{if(!s.dead&&rectHit(hitR,{x:s.x-s.w/2,y:s.y-s.h,w:s.w,h:s.h})){hit=true;hurtSlime(s,dmgOf('Slime'),player.face);}});
    bosses.forEach(b=>{if(!b.dead&&Math.abs(b.x-player.x)<range+40&&Math.abs(b.y-player.y)<120){hit=true;dealBossDmg(b,dmgOf(b.type));}});
    if(hit)parts.push({x:hx,y:player.y-20,vx:0,vy:0,t:0.15,c:'#fff'});
  }
}
function special(){
  if(Piano.active||skillOpen||state!=='play')return;
  const w=WEAPONS[wi];let cost=w.cost*(S.skills.energy_efficiency?0.7:1);
  if(player.en<cost){$('timelabel').textContent='SIN ENERGÍA';return;}
  player.en-=cost;const ev=timingMult();const mult=ev.r==='PERFECT'?1.5:ev.r==='GOOD'?1.2:0.8;
  const dmg=Math.round(w.esp*mult);
  beep(440,0.2,0.2,'sawtooth');
  if(w.name==='PulseBlade'){bosses.forEach(b=>{if(!b.dead&&Math.abs(b.x-player.x)<130)dealBossDmg(b,dmg);});slimes.forEach(s=>{if(!s.dead&&Math.abs(s.x-player.x)<130)hurtSlime(s,dmg,player.face);});parts.push({x:player.x,y:player.y-20,vx:0,vy:0,t:0.3,c:'#33e6ff'});}
  else if(w.name==='VoidWave'){bosses.forEach(b=>{if(!b.dead&&Math.abs(b.x-player.x)<200)dealBossDmg(b,dmg);});parts.push({x:player.x,y:player.y-20,vx:0,vy:0,t:0.4,c:'#b34dff'});}
  else{for(let k=0;k<3;k++)later(()=>{if(state==='play')pProj.push({x:player.x,y:player.y-30,vx:player.face*700,w:14,h:6,life:0.6,dmg:Math.round(dmg/3),kind:'shot'});},k*0.07);}
}
// Parry con ataque al beat: J en PERFECT/GOOD destruye balas enemigas cercanas.
// PERFECT = radio grande + más energía · GOOD = radio menor · MISS = no hay parry.
// Las balas de agujero negro (hole) no se pueden parar con ataque.
function tryAttackParry(ev,range){
  if(!ev||ev.r==='MISS')return 0;
  const radius=ev.r==='PERFECT'?Math.max(135,(range||70)+45):100;
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
    if(S.showDmg===false){/* respeta toggle de números: el anillo ya avisa */}
  }
  return n;
}
function hurtSlime(s,dmg,dir){
  const now=performance.now();s.hp-=dmg;s.flash=0.1;s.squash=0.25;if(dmg>=22)hitstop(0.1,0.35);beep(300,0.06,0.15);
  if(S.showDmg!==false)floaters.push({x:s.x,y:s.y-30,txt:'-'+dmg,t:0.7,c:'#fff'});
  if(dmg>=22&&now-s.dr>1200){s.stun=0.7;s.dr=now;}
  s.vx=dir*160;s.vy=-90;
  if(s.hp<=0&&!s.dead){s.dead=true;player.en=Math.min(100,player.en+20);S.echoes+=echoGain(12+Math.floor(Math.random()*13));save();}
}
function dash(){
  if(dashCd>0||state!=='play')return;const ev=timingMult();dashCd=0.45;dashT=0.17;
  if(S.skills.boss_teleport&&!player.onFloor){player.x+=player.face*140;player.y-=30;beep(880,0.1,0.15);}
  if(ev.r!=='MISS'){iframes=Math.max(iframes,0.25);player.en=Math.min(100,player.en+(ev.r==='PERFECT'?16:9));
    if(ev.r==='PERFECT')player.hp=Math.min(maxHP(),player.hp+(S.skills.dash_heal?10:8));}
  beep(ev.r==='MISS'?200:700,0.07,0.15);
  player.vx=player.face*680;
}
function hurtPlayer(dmg){
  if(iframes>0||deadT>0||state!=='play')return;
  dmg=Math.round(dmg*diff().dmgTaken);
  player.hp-=dmg;iframes=0.5;hitstop(0.12,0.35);beep(150,0.2,0.25,'sawtooth');
  parts.push({x:player.x,y:player.y-20,vx:0,vy:0,t:0.3,c:'#f00'});
  if(player.hp<=0)die();
}
function die(){
  if(deadT>0)return;deadT=1.1;beep(80,0.8,0.3,'sawtooth');
  S.shade={x:player.x,y:Math.min(player.y,800),echoes:S.echoes};S.echoes=0;save();
}
function respawn(){player=newPlayer();player.hp=maxHP();deadT=0;Rhythm.bpm=120;Rhythm.rebase();resetWorld();player.hp=maxHP();player.x=checkpointX(S.checkpoint);}

// ---------- BULLET-HELL + NOTAS OSU/PIANO-TILES (boss lock-in) ----------
const NOTE_COLORS=['#33e6ff','#b34dff','#ffd933','#33ff99'];
const NOTE_SPEED=300,NOTE_HIT_R=150,NOTE_HURT_R=24;
function spawnNote(b,forceKey,angOff,spdMul){
  if(notes.length>=7)return;
  const key=forceKey!==undefined?forceKey:Math.floor(Math.random()*4);
  const sx=b.x,sy=b.y-60;
  let dx=player.x-sx,dy=(player.y-16)-sy;
  if(angOff){const a=Math.atan2(dy,dx)+angOff;const d=Math.hypot(dx,dy)||1;dx=Math.cos(a)*d;dy=Math.sin(a)*d;}
  const d=Math.hypot(dx,dy)||1,sp=NOTE_SPEED*(spdMul||1);
  notes.push({x:sx,y:sy,vx:dx/d*sp,vy:dy/d*sp,key,life:4.5,tick:0,dist0:d});
  beep(660+key*165,0.09,0.12);
}
function breakNoteCombo(silent){
  if(noteCombo>=4&&!silent)floaters.push({x:player.x,y:player.y-84,txt:'COMBO x'+noteCombo+' ROTO',t:0.9,c:'#f66'});
  noteCombo=0;
}
function hitNote(key){
  if(state!=='play'||Piano.active||skillOpen||tutHowOpen)return;
  const b=activeBoss();if(!b)return;
  let best=null,bd=1e9;
  for(const n of notes){if(n.key!==key)continue;
    const d=Math.hypot(player.x-n.x,(player.y-16)-n.y);
    if(d<bd){bd=d;best=n;}}
  if(!best||bd>NOTE_HIT_R){beep(180,0.05,0.08);player.en=Math.max(0,player.en-2);breakNoteCombo(true);return;} // whiff: -2 en + rompe racha
  const ev=Rhythm.evaluate();
  notes.splice(notes.indexOf(best),1);
  noteCombo++;noteBest=Math.max(noteBest,noteCombo);
  const streak=Math.min(noteCombo-1,10);
  const dmg=(ev.r==='PERFECT'?34:ev.r==='GOOD'?22:8)+streak;
  player.en=Math.min(100,player.en+(ev.r==='PERFECT'?10:ev.r==='GOOD'?5:0));
  dealBossDmg(b,dmg);
  const comboTxt=noteCombo>=2?' x'+noteCombo:'';
  floaters.push({x:player.x,y:player.y-70,txt:(ev.r==='PERFECT'?'PERFECT ':'')+'♪'+(key+1)+comboTxt,t:0.7,c:NOTE_COLORS[key]});
  $('timelabel').textContent=ev.r+' ♪'+(key+1)+comboTxt+' '+Math.round(ev.ms)+'ms';
  $('timelabel').style.color=ev.r==='PERFECT'?'#ffd933':ev.r==='GOOD'?'#3f6':'#f66';
  const base=ev.r==='PERFECT'?1200:ev.r==='GOOD'?900:440;
  beep(base+Math.min(noteCombo,12)*40,0.1,0.18);
  for(let i=0;i<10;i++)parts.push({x:best.x,y:best.y,vx:(Math.random()-0.5)*320,vy:-Math.random()*260,t:0.45,c:NOTE_COLORS[key]});
}
// Barrage rítmico por boss: cada tipo favorece sus modos (personalidad).
// Resonator=RING/FAN simple · Bass=RAIN pesada · Choir=SPIRAL/FAN · Void=FAN/RAIN · Prime=SPIRAL rápido · Primordial=todo denso.
function fireKickBarrage(b){
  if(b.dead||b.st==='STUNNED')return;
  const dx=player.x-b.x,dy=(player.y-16)-(b.y-50);
  const baseAng=Math.atan2(dy,dx);
  const hard=S.difficulty==='hard',easy=S.difficulty==='easy';
  // Escalado real por índice: boss 0 tutorial, boss 5 infierno. Antes el 0 se sentía más denso que el resto.
  const esc=b.idx; // 0..5
  const ph=(b.phase2?1.22:1)*(esc<2?0.85:0.9+esc*0.06);
  const early=b.idx<2;
  const ringN=easy?6+Math.floor(esc/2):(hard?11+esc:(b.phase2?11+esc:(early?8:9+esc)));
  const fanN=easy?3:(hard?5+Math.floor(esc/2):(early?3:4+Math.floor(esc/2)));
  const rainN=easy?5+esc:(hard?9+esc:7+esc);
  const spd=(hard?320+esc*8:(b.phase2?300+esc*10:(early?250:275+esc*10)))*(b.phase2?1.12:1);
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
  if(mode===0){ // RING radial
    for(let i=0;i<ringN;i++){const a=i/ringN*Math.PI*2+b.spiral*0.3;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,w:12,h:12,life:2.6,dmg:Math.round(11*ph),hell:true});}
    beep(140,0.14,0.2,'sawtooth');
  }else if(mode===1){ // FAN apuntado al jugador
    for(let i=0;i<fanN;i++){const off=(i-(fanN-1)/2)*0.16;const a=baseAng+off;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*1.25,vy:Math.sin(a)*spd*1.25,w:13,h:13,life:2.2,dmg:Math.round(12*ph),hell:true});}
    beep(180,0.1,0.18,'sawtooth');
  }else if(mode===2){ // SPIRAL doble rotatoria
    b.spiral+=0.55;
    for(const o of [0,Math.PI]){const a=b.spiral+o;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*0.9,vy:Math.sin(a)*spd*0.9,w:12,h:12,life:3,dmg:Math.round(10*ph),hell:true});}
    if(b.phase2){for(const o of [Math.PI/2,-Math.PI/2]){const a=b.spiral+o;
      eProj.push({x:sx,y:sy,vx:Math.cos(a)*spd*0.9,vy:Math.sin(a)*spd*0.9,w:12,h:12,life:3,dmg:Math.round(10*ph),hell:true});}}
    beep(200,0.08,0.15,'sawtooth');
  }else{ // RAIN: lluvia con hueco sobre el jugador (esquiva lateral)
    const n=rainN;
    for(let i=0;i<n;i++){const rx=b.x-260+i*(520/Math.max(1,n-1));
      if(Math.abs(rx-player.x)<46)continue; // hueco
      eProj.push({x:rx,y:sy-160,vx:0,vy:(spd*0.85),w:12,h:12,life:2.4,dmg:Math.round(11*ph),hell:true});}
    beep(160,0.12,0.18,'sawtooth');
  }
  // Extra para bosses tardíos: doble presión en el mismo bombo (sin duplicar notas)
  if(!easy&&b.idx>=3&&b.st!=='STUNNED'){
    b.spiral+=0.2;
    const a2=b.spiral;
    eProj.push({x:sx,y:sy,vx:Math.cos(a2)*spd*0.85,vy:Math.sin(a2)*spd*0.85,w:12,h:12,life:2.6,dmg:Math.round(10*ph),hell:true});
    if(b.idx>=5||b.phase2){
      const a3=a2+Math.PI;
      eProj.push({x:sx,y:sy,vx:Math.cos(a3)*spd*0.85,vy:Math.sin(a3)*spd*0.85,w:12,h:12,life:2.6,dmg:Math.round(10*ph),hell:true});
    }
  }
  if(eProj.length>160)eProj.splice(0,eProj.length-160);
  // Notas piano-tiles: tutorial simple al inicio, dobles/streams después
  const kc=Rhythm.kickCount;
  const late=b.idx>=2;
  if(b.phase2&&kc%4===0){
    const k1=Math.floor(Math.random()*4);
    spawnNote(b,k1,-0.12,0.9);spawnNote(b,(k1+1)%4,0,1);spawnNote(b,(k1+2)%4,0.12,1.1);
  }else if(late&&kc%4===2){
    const k1=Math.floor(Math.random()*4);const k2=(k1+1+Math.floor(Math.random()*3))%4;
    spawnNote(b,k1,-0.09,0.95);spawnNote(b,k2,0.09,1.05);
  }else if(b.idx===0&&kc%2===0){
    spawnNote(b); // Resonator: de una en una para aprender
  }else if(kc%2===0)spawnNote(b);
}
function choosePattern(b,dx,adx){
  const r=Math.random();
  // Personalidad por boss + gates de skills como mejora (no como bloqueo total del early)
  if(adx<110){
    if(b.type==='BassTitan')b.pat=r<0.6?'PULSE':'WAVE';
    else b.pat='WAVE';
    return;
  }
  switch(b.type){
    case 'Resonator': // Tutorial: tiro simple y dobles, poco teleport
      if(r<0.35)b.pat='DOUBLE';else if(r<0.55)b.pat='WAVE';else if(r<0.7)b.pat='PULSE';else if(r<0.78)b.pat='TELEPORT';else b.pat='SINGLE';
      break;
    case 'BassTitan': // Tanque: waves y pulses pesados
      if(r<0.35)b.pat='WAVE';else if(r<0.6)b.pat='PULSE';else if(r<0.75)b.pat='DOUBLE';else b.pat='SINGLE';
      break;
    case 'ChoirWarden': // Coro: ricochets y dobles
      if(adx>280&&r<0.45)b.pat='RICOCHET';
      else if(r<0.55)b.pat='DOUBLE';else if(r<0.7)b.pat='WAVE';else if(r<0.8)b.pat='TELEPORT';else b.pat='SINGLE';
      break;
    case 'VoidHarvester': // Vacío: blackhole + fans
      if(adx>220&&r<0.4)b.pat=(S.skills.boss_blackhole||r<0.2)?'BLACKHOLE':'WAVE';
      else if(r<0.55)b.pat='DOUBLE';else if(r<0.7)b.pat='PULSE';else b.pat='SINGLE';
      break;
    case 'EchoPrime': // Rápido: teleports y dobles
      if(r<0.3)b.pat='TELEPORT';else if(r<0.5)b.pat='DOUBLE';else if(r<0.62&&S.skills.boss_ricochet)b.pat='RICOCHET';else if(r<0.75)b.pat='WAVE';else b.pat='SINGLE';
      break;
    default: // Primordial: todo + clones
      if(r<0.22)b.pat='TELEPORT';else if(r<0.34&&(S.skills.boss_clone||true))b.pat='CLONE';
      else if(r<0.48)b.pat='RICOCHET';else if(r<0.6)b.pat='BLACKHOLE';else if(r<0.75)b.pat='DOUBLE';else b.pat='WAVE';
      break;
  }
}
function firePattern(b,dx){
  const dir=Math.sign(dx)||1,ph=b.phase2?1.25:1;
  const id=++patId;b.pid=id;
  const alive=()=>!b.dead&&b.st!=='STUNNED'&&b.pid===id;
  if(b.pat==='SINGLE'||b.pat==='DOUBLE'){
    const shots=b.pat==='DOUBLE'?[-11,11]:[0];
    shots.forEach((oy,k)=>later(()=>{if(!alive())return;eProj.push({x:b.x,y:b.y-50+oy,vx:dir*760,vy:0,w:18,h:18,life:1.25,dmg:Math.round(16*ph)});beep(180,0.08,0.15,'sawtooth');burst(b.x,b.y-50,b.color,3,140);},0.1+k*0.04,id));
  }else if(b.pat==='WAVE'){later(()=>{if(!alive())return;eProj.push({x:b.x+dir*10,y:b.y-40,vx:dir*700,vy:0,w:32,h:22,life:1.0,dmg:Math.round(22*ph)});shockRing(b.x,b.y-40,b.color,110);beep(200,0.12,0.2,'sawtooth');},0.1,id);}
  else if(b.pat==='PULSE'){later(()=>{if(!alive())return;const R2=b.type==='BassTitan'?200:160;if(Math.abs(player.x-b.x)<R2)hurtPlayer(Math.round(14*ph));shockRing(b.x,b.y-40,b.color,R2);burst(b.x,b.y-40,b.color,12,300);beep(120,0.3,0.25,'sawtooth');},0.1,id);}
  else if(b.pat==='RICOCHET'){later(()=>{if(!alive())return;eProj.push({x:b.x,y:b.y-50,vx:dir*550,vy:0,leg:400,bounce:b.phase2?3:2,life:3,dmg:Math.round(18*ph),w:14,h:14});},0.1,id);}
  else if(b.pat==='BLACKHOLE'){const hx=b.x+(dx>0?200:-200);eProj.push({x:hx,y:b.y-100,hole:true,t:b.phase2?3.5:2.8});}
  else if(b.pat==='TELEPORT'){later(()=>{if(!alive())return;const a=ARENAS[b.idx]||[200,9250];const lo=a[0]+60,hi=a[1]-60;for(let i=0;i<10;i++){const nx=lo+Math.random()*(hi-lo);if(Math.abs(nx-player.x)>200){b.x=nx;break;}}clampBoss(b);eProj.push({x:b.x,y:b.y-50,vx:dir*760,vy:0,w:18,h:18,life:1.2,dmg:16});},0.33,id);}
  else if(b.pat==='CLONE'){later(()=>{if(!alive())return;slimes.push({x:b.x+40,y:b.y-20,vx:0,vy:0,w:26,h:24,hp:45,dir:-dir,home:b.x,t:0,stun:0,dr:0,contactCd:0,squash:0});},0.4,id);}
}
