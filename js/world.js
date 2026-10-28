// js/world.js — estado, física, checkpoints
'use strict';
let state='menu',skillOpen=false;
let endingT=0;
let camX=0,camY=300;
let player,slimes=[],bosses=[],pProj=[],eProj=[],parts=[],floaters=[],notes=[],fx=[];
let banner=null,flashT=0,flashCol='#fff';
let lastKickSeen=0,noteCombo=0,noteBest=0;
let doors=[];
let shards=[],locks=[];
let platState={},floorDmgT=0;
let atkCd=0,comboIdx=0,comboT=0,dashT=0,dashCd=0,iframes=0,coyote=0,jbuf=0,jumps=0,deadT=0;
let attackHeld=false,swingT=0,swingKind='',switchT=0,noteVis=0;
let camShakeT=0,camShake=0;
let currentArea=-1,areaT=0;
let wi=0;
let patId=0;
let _warnArena=-1;

function maxHP(){return Math.round((100+(S.skills.hp_1?20:0)+(S.skills.hp_2?30:0))*diff().hpMult);}
function checkpointX(id){const c=CHECKPOINTS.find(c=>c.id===id);return c?c.x:180;}
function newPlayer(){const sx=checkpointX(S.checkpoint);return{x:sx,y:700,vx:0,vy:0,w:24,h:32,hp:maxHP(),en:100,face:1,onFloor:false,wallDir:0,hurtT:0,hurtDir:1,landT:0,ghostT:0};}
function resetWorld(){
  player=newPlayer();slimes=[];bosses=[];pProj=[];eProj=[];parts=[];floaters=[];notes=[];fx=[];banner=null;flashT=0;lastKickSeen=Rhythm.kickCount;noteCombo=0;delayed=[];_warnArena=-1;
  doors=[];shards=[];locks=[];wi=0;atkCd=0;comboIdx=0;comboT=0;dashT=0;dashCd=0;iframes=0;deadT=0;camShakeT=0;camShake=0;currentArea=-1;areaT=0;
  attackHeld=false;swingT=0;swingKind='';switchT=0;noteVis=0;
  platState={};floorDmgT=0;
  ARENAS.forEach(([a,b])=>{doors.push({x:a,open:true});doors.push({x:b,open:true});});
  SHARD_DEFS.forEach(([x,y],i)=>{if(!S.shards['sh'+i])shards.push({id:'sh'+i,x,y,t:Math.random()*6});});
  LOCK_DEFS.forEach(L=>{if(!S.locks[L.id])locks.push(Object.assign({done:false},L,{y:780}));});
  SLIME_DEFS.forEach(([x,type])=>{const st=SLIME_TYPES[type]||SLIME_TYPES.slime;
    slimes.push({x,y:700,vx:0,vy:0,w:st.w,h:st.h,hp:st.hp,maxhp:st.hp,dir:1,home:x,t:0,stun:0,dr:0,contactCd:0,squash:0,type,color:st.color,hue:st.hue,spd:st.spd,chase:st.chase,contact:st.contact,jump:st.jump});});
  BOSS_DEFS.forEach((d,i)=>{if(!S.bosses[d.type])bosses.push(Object.assign({},d,{y:GROUND_TOP,surfY:GROUND_TOP,leapToX:d.x,leapToY:GROUND_TOP,leapPlat:null,slam:false,vx:0,vy:0,w:52,h:84,maxhp:d.hp,hpAnim:d.hp,st:'IDLE',t:0.5,phase2:false,contactCd:0,stun:0,stunDr:0,flash:0,hitT:0,idx:i,spiral:Math.random()*6.28,locked:false,atkCount:0,lastPat:'',pid:0,dashCd:0.9,farT:0,evadeCd:0.8,evadeT:0,evadeDir:1,strafeT:0,strafeDir:1,lungeVx:0,airT:0,airY:GROUND_TOP,airX:d.x,airMax:0,airAtk:0,airHit:false}));});
  updateDoorState();
  if(typeof syncWeapon==='function')syncWeapon();
}
function screenFlash(col,dur){flashT=Math.max(flashT||0,dur||0.22);flashCol=col||'#fff';}
function showBanner(txt,sub,col,dur){banner={txt,sub:sub||'',col:col||'#fff',t:dur||1.6,max:dur||1.6};}
// Boss en lock-in SELLADO: solo el boss con locked=true ataca.
// Se activa al pisar su arena y no se abre hasta matarlo (sin escape).
function activeBoss(){
  if(!player)return null;
  return bosses.find(b=>!b.dead&&b.locked)||null;
}
function tryLockBosses(){
  if(!player||state!=='play')return;
  bosses.forEach(b=>{
    if(b.dead||b.locked)return;
    const a=ARENAS[b.idx];if(!a)return;
    // Margen 34px: puerta (12) + medio jugador (12) + colchón (10).
    // Antes era +8 y la puerta se cerraba encima del jugador y moveBody lo expulsaba fuera -> softlock.
    if(player.x>a[0]+34&&player.x<a[1]-34){
      b.locked=true;b.t=0.6;b.st='IDLE';noteCombo=0;
      // Cada boss impone su propio BPM (antes se arrastraba el del boss anterior)
      Rhythm.bpm=(b.bpm&&b.bpm[0])||120;Rhythm.rebase();lastKickSeen=Rhythm.kickCount;
      // Asegura que el jugador queda bien dentro, nunca solapando la puerta
      player.x=Math.max(a[0]+50,Math.min(a[1]-50,player.x));
      player.vx*=0.3;
      floaters.push({x:b.x,y:b.y-b.h-60,txt:'¡LOCK-IN! Sin salida',t:1.6,c:'#f66'});
      floaters.push({x:player.x,y:player.y-90,txt:'▼ SELLADO ▼',t:1.6,c:'#f66'});
      if(typeof showBanner==='function')showBanner(b.type,'LOCK-IN · '+Rhythm.bpm+' BPM',b.color,1.5);
      screenFlash(b.color,0.32);camShakeT=0.35;camShake=8;
      if(typeof Music!=='undefined'&&Music.syncBoss)Music.syncBoss(Rhythm.bpm,true);
      beep(90,0.5,0.3,'sawtooth');beep(180,0.3,0.2,'square');
      // Polvo en ambas puertas al cerrar
      for(const dx of [a[0],a[1]])burst(dx,775,'#f66',12,260);
      hitstop(0.08,0.4);
      updateDoorState();
    }
  });
}
// Recuperación sellado total: si el boss está locked pero el jugador quedó fuera
// (túnel por dash/lag o partida vieja), teletransporta dentro en vez de dejarlo fuera.
function fixLockedOutPlayer(){
  if(!player||state!=='play')return;
  const b=activeBoss();if(!b)return;
  const a=ARENAS[b.idx];if(!a)return;
  if(player.x<a[0]-10||player.x>a[1]+10){
    const cx=(a[0]+a[1])/2;
    player.x=player.x<cx?a[0]+70:a[1]-70;
    player.y=Math.min(player.y,760);player.vx=0;player.vy=0;
    iframes=Math.max(iframes,0.8);
    floaters.push({x:player.x,y:player.y-90,txt:'¡Devuelto a la arena!',t:1.4,c:'#ffd933'});
    beep(880,0.15,0.2);
    burst(player.x,player.y-20,'#ffd933',14,300);
  }
}
// Aviso proximity: cuando te acercas a una arena sin matar, muestra hint una vez
function checkArenaWarning(){
  if(!player||state!=='play')return null;
  for(let i=0;i<ARENAS.length;i++){
    const b=bosses.find(x=>x.idx===i&&!x.dead);if(!b)continue;
    if(b.locked)continue;
    const a=ARENAS[i];
    if((player.x>a[0]-190&&player.x<a[0]+34)||(player.x>a[1]-34&&player.x<a[1]+190)){
      if(_warnArena!==i){_warnArena=i;beep(330,0.12,0.15,'square');}
      return i;
    }
  }
  _warnArena=-1;
  return null;
}
function updateDoorState(){
  // Sellado: las puertas de una arena con boss locked+vivo quedan cerradas
  // aunque te alejes. Solo se abren al matar al boss.
  doors.forEach(dr=>{dr.open=true;});
  bosses.forEach(b=>{
    if(b.dead||!b.locked)return;
    const a=ARENAS[b.idx];if(!a)return;
    doors.forEach(d=>{if(Math.abs(d.x-a[0])<5||Math.abs(d.x-a[1])<5)d.open=false;});
  });
}
function solids(){
  const s=[];
  PLATS.forEach((p,i)=>{if(!isPlatBroken(i))s.push({x:p[0]-p[2]/2,y:p[1]-p[3]/2,w:p[2],h:p[3]});});
  s.push({x:-200,y:GROUND_TOP,w:WORLD_W+400,h:200});
  s.push({x:-30,y:200,w:20,h:900});s.push({x:WORLD_W+10,y:200,w:20,h:900});
  // Puerta gruesa (24px) para evitar túnel con dash a 680px/s + lag (rdt 0.05 = 34px/frame)
  doors.forEach(d=>{if(!d.open)s.push({x:d.x-12,y:622,w:24,h:256});});
  return s;
}
// Plataformas frágiles: primero avisan (siguen sólidas) y luego caen unos segundos.
function isPlatBroken(i){const s=platState[i];return !!(s&&s.w<=0);}
function breakPlatform(i,warn,down){
  if(i===undefined||i===null||platState[i])return;
  platState[i]={w:warn||0.55,d:down||2.8};
  const p=PLATS[i];if(p)burst(p[0],p[1]-p[3]/2,'#f66',8,180);
  beep(140,0.1,0.14,'square');
}
function updatePlatforms(dt){
  for(const k in platState){
    const s=platState[k];
    if(s.w>0)s.w-=dt;
    else{s.d-=dt;if(s.d<=0)delete platState[k];}
  }
}
// Plataforma bajo los pies del jugador (para apuntar saltos/ataques del boss).
function platformUnderPlayer(){
  if(!player)return null;
  for(let i=PLATS.length-1;i>=0;i--){
    if(isPlatBroken(i))continue;
    const p=PLATS[i],top=p[1]-p[3]/2;
    if(player.x>p[0]-p[2]/2-8&&player.x<p[0]+p[2]/2+8&&Math.abs(player.y-top)<10)
      return{i,x:p[0],y:top,w:p[2],l:p[0]-p[2]/2,r:p[0]+p[2]/2};
  }
  return null;
}
// Superficie más alta bajo el boss: le permite quedarse de pie en las escaleras.
function bossSurfaceUnder(b){
  let top=GROUND_TOP;
  const half=(b.w||52)*0.3;
  for(let i=0;i<PLATS.length;i++){
    if(isPlatBroken(i))continue;
    const p=PLATS[i],t=p[1]-p[3]/2;
    if(b.x+half>p[0]-p[2]/2&&b.x-half<p[0]+p[2]/2&&t>=b.y-10&&t<top)top=t;
  }
  return top;
}
function settleBoss(b){
  if(b.st==='AIR'||b.st==='LEAP'||b.st==='TRANS')return;
  b.surfY=bossSurfaceUnder(b);
}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function clampBoss(b){
  const a=ARENAS[b.idx];if(!a)return;
  b.x=Math.max(a[0]+40,Math.min(a[1]-40,b.x));
  // En AIR/LEAP/TRANS la y la controla su animación; en suelo pisa plataformas.
  if(b.st!=='AIR'&&b.st!=='LEAP'&&b.st!=='TRANS'){settleBoss(b);b.vx=0;b.vy=0;}
}
function moveBody(e,dt){
  const Ss=solids();
  // Substeps de máx 8px para no atravesar puertas finas a alta velocidad
  const steps=Math.max(1,Math.ceil((Math.abs(e.vx*dt)+Math.abs(e.vy*dt))/8));
  const sdt=dt/steps;
  for(let st=0;st<steps;st++){
    e.x+=e.vx*sdt;
    let r={x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h};
    for(const s of Ss){if(rectHit(r,s)){if(e.vx>0)e.x=s.x-e.w/2;else if(e.vx<0)e.x=s.x+s.w+e.w/2;e.vx=0;r={x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h};}}
    e.y+=e.vy*sdt;e.onFloor=false;
    r={x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h};
    for(const s of Ss){if(rectHit(r,s)){if(e.vy>0){e.y=s.y;e.vy=0;e.onFloor=true;}else if(e.vy<0){e.y=s.y+s.h+e.h;e.vy=0;}r={x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h};}}
    if(e.vx===0&&e.vy===0&&e.onFloor)break;
  }
}
function checkCheckpoints(){
  // Activa el checkpoint más avanzado que el jugador haya superado
  let curIdx=CHECKPOINTS.findIndex(c=>c.id===S.checkpoint);
  if(curIdx<0)curIdx=0;
  for(let i=curIdx+1;i<CHECKPOINTS.length;i++){
    if(player.x>=CHECKPOINTS[i].x-40){
      S.checkpoint=CHECKPOINTS[i].id;save();
      floaters.push({x:player.x,y:player.y-70,txt:'CHECKPOINT',t:1.2,c:'#3f6'});
      beep(880,0.15,0.2);
    } else break;
  }
}
// Fallback: si el jugador recargó justo tras matar al Primordial, el final
// también se abre al cruzar el "Fin del Vacío" (sin repetir la animación en bucle).
function checkFinale(){
  if(state!=='play'||S.endingSeen||!S.bosses.EchoPrimordial)return false;
  if(player.x<15480)return false;
  startEnding();return true;
}
