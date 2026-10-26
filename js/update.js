// js/update.js — bucle de simulación
'use strict';
function update(rdt){
  // Final: el mundo queda congelado bajo la cinemática; solo avanza su reloj.
  if(state==='ending'){endingT+=rdt;Rhythm.hold();updateTimescale(rdt);return;}
  // Pausa total: congela ritmo (sin catch-up de beeps) y timers escalados
  if(state!=='play'||skillOpen||tutHowOpen||state==='pause'||Piano.active){
    Rhythm.hold();updateTimescale(rdt);
    return;
  }
  Rhythm.update();updateTimescale(rdt);
  updateDelayed(rdt*timeScale);
  if(state==='ending')return;
  const dt=rdt*timeScale;
  if(banner){banner.t-=rdt;if(banner.t<=0)banner=null;}
  flashT=Math.max(0,flashT-rdt*2.2);
  for(const f of fx)f.t-=dt;
  fx=fx.filter(f=>f.t>0);
  if(deadT>0){deadT-=rdt;Rhythm.hold();if(deadT<=0)respawn();return;}
  // BOMBO: barrage bullet-hell + notas (solo en lock-in)
  if(Rhythm.kickCount>lastKickSeen){
    lastKickSeen=Rhythm.kickCount;
    const ab=activeBoss();
    if(ab&&Math.abs(player.x-ab.x)<900)fireKickBarrage(ab);
  }
  const L=keys['KeyA']||keys['ArrowLeft'],R=keys['KeyD']||keys['ArrowRight'];
  const dir=(R?1:0)-(L?1:0);
  if(dir!==0)player.face=dir;
  const onF=player.onFloor;
  const acc=onF?2200:1400,fri=onF?2400:600;
  player.hurtT=Math.max(0,(player.hurtT||0)-dt);
  if(dashT<=0){
    if(player.hurtT>0){player.vx*=Math.max(0,1-4*dt);}
    else if(dir!==0)player.vx+=Math.sign(dir*300-player.vx)*Math.min(Math.abs(dir*300-player.vx),acc*dt);
    else player.vx+=Math.sign(0-player.vx)*Math.min(Math.abs(player.vx),fri*dt);
  }
  let g=1600;if(player.vy>0)g*=1.35;
  player.wallDir=0;
  if(S.skills.wall_jump&&!onF&&player.vy>=-80){
    const Ss=solids();const r={x:player.x-player.w/2,y:player.y-player.h,w:player.w,h:player.h};
    for(const s of Ss){if(s.h>100&&Math.abs(s.w)<30){
      if(r.x+r.w+14>s.x&&r.x-14<s.x+s.w&&r.y<s.y+s.h&&r.y+r.h>s.y){player.wallDir=player.x<s.x?-1:1;break;}
    }}
    if(player.wallDir!==0&&((player.wallDir===1&&L)||(player.wallDir===-1&&R))){player.vy=Math.min(player.vy,90);player.vx=0;player.face=-player.wallDir;}
  }
  player.vy+=g*dt;if(player.vy>900)player.vy=900;
  if(onF){coyote=0.15;jumps=0;}else coyote-=dt;
  comboT=Math.max(0,comboT-dt);jbuf-=dt;
  if(comboT<=0&&comboIdx!==0){comboIdx=0;syncWeapon();}
  if(jbuf>0&&player.hurtT<=0){
    if(coyote>0){player.vy=-520;jbuf=0;coyote=0;beep(600,0.06,0.1);}
    else if(player.wallDir!==0&&S.skills.wall_jump){player.vy=-440;player.vx=-player.wallDir*340;player.face=-player.wallDir;jbuf=0;beep(600,0.06,0.1);}
    else if(S.skills.double_jump&&jumps<1){player.vy=-520*0.92;jumps++;jbuf=0;beep(750,0.06,0.1);}
  }
  if(!(keys['Space']||keys['KeyW'])&&player.vy<-150)player.vy*=(1-6*dt);
  dashCd-=dt;dashT-=dt;iframes-=dt;atkCd-=dt;swingT=Math.max(0,swingT-dt);switchT=Math.max(0,switchT-dt);
  if(attackHeld&&keys['KeyJ']&&atkCd<=0)attack(true); // mantener J = auto-ataque (no rompe fichas)
  if(keys['ShiftLeft']||keys['ShiftRight'])dash();
  if(dashT>0){player.vx=player.face*680;player.vy=0;}
  else if(dashT>-0.05&&dashT<=0){player.vx*=0.55;dashT=-1;}
  const wasOn=player.onFloor,fallV=player.vy;
  moveBody(player,dt);
  // Aterrizaje: polvo + squash (feedback físico que antes no existía).
  if(!wasOn&&player.onFloor&&fallV>360){
    player.landT=0.14;
    for(let i=0;i<6;i++)parts.push({x:player.x+(Math.random()-0.5)*22,y:player.y,vx:(Math.random()-0.5)*140,vy:-Math.random()*60,t:0.28,c:'#8a8ab8'});
    camShakeT=Math.max(camShakeT,0.08);camShake=Math.max(camShake,2);
    beep(120,0.05,0.05,'sine');
  }
  player.landT=Math.max(0,(player.landT||0)-dt);
  // Estela del dash: fantasmas del sprite mientras dura.
  if(dashT>0){
    player.ghostT=(player.ghostT||0)-dt;
    if(player.ghostT<=0){player.ghostT=0.035;fx.push({kind:'ghost',x:player.x,y:player.y,face:player.face,t:0.24,max:0.24});}
  }
  tryLockBosses();
  fixLockedOutPlayer();
  updateDoorState();
  const warnArena=checkArenaWarning();
  checkCheckpoints();
  if(checkFinale())return;
  if(player.y>1200){player.hp=0;die();return;}
  shards=shards.filter(sh=>{sh.t+=dt;if(Math.abs(sh.x-player.x)<24&&Math.abs((sh.y)-(player.y-16))<40){S.shards[sh.id]=true;S.echoes+=echoGain(10);save();beep(1320,0.15,0.2);floaters.push({x:sh.x,y:sh.y,txt:'+10 ◈',t:1,c:'#ffd933'});return false;}return true;});
  const onKick=Rhythm.count%2===0; // los enemigos saltan solo en BOMBO (coincide con kickPat)
  slimes.forEach(s=>{if(s.dead)return;s.t+=dt;s.contactCd-=dt;s.squash=Math.max(0,(s.squash||0)-dt);s.flash=Math.max(0,(s.flash||0)-dt);
    if(s.stun>0){s.stun-=dt;}
    else{
      const dx=player.x-s.x,spd=s.spd||42,chase=s.chase||70,jump=s.jump||180;
      if(Math.abs(dx)<200){s.dir=Math.sign(dx)||1;s.vx=s.dir*spd;
        if(onKick&&Math.abs(dx)>25&&Math.abs(dx)<240&&s.onFloor){s.vy=-jump;s.vx=s.dir*(spd*3.2);s.squash=0.2;beep(250,0.05,0.06);}
      }else{s.vx=s.dir*chase;if(Math.abs(s.x-s.home)>160)s.dir*=-1;}
    }
    s.vy+=1100*dt;moveBody(s,dt);
    if(Math.abs(s.x-player.x)<28&&Math.abs(s.y-player.y)<40&&s.contactCd<=0){s.contactCd=0.8;hurtPlayer(s.contact||12,s.x);}
  });
  slimes=slimes.filter(s=>!s.dead);
  bosses.forEach(b=>{if(b.dead)return;
    clampBoss(b);
    b.flash-=dt;b.hitT=Math.max(0,(b.hitT||0)-dt);b.contactCd-=dt;
    const target=Math.max(0,b.hp);
    b.hpAnim=(b.hpAnim===undefined?target:b.hpAnim)+(target-b.hpAnim)*Math.min(1,dt*6);
    if(!b.locked)return; // dormido: ni patrones, ni barrage, ni contacto
    b.t-=dt;
    b.evadeCd=(b.evadeCd||0)-dt;
    b.dashCd=(b.dashCd||0)-dt;
    if(b.st==='STUNNED'){if(b.t<=0){b.st='IDLE';b.t=0.5;}return;}
    const dx=player.x-b.x,adx=Math.abs(dx);
    const diffM=S.difficulty==='easy'?0.7:S.difficulty==='hard'?1.25:1;
    // Embestida: cierra la distancia y castiga el campamento a distancia.
    if(b.st==='LUNGE'){
      b.x+=b.lungeVx*dt;
      if(Math.abs(b.lungeVx)>1)clampBoss(b);
      if(Math.floor(performance.now()/55)%2===0)fx.push({kind:'bossghost',spr:b.spr,sw:b.sw||120,sh:b.sh||b.h,hue:b.hue,x:b.x,y:b.y,face:b.lungeVx<0,t:0.22,max:0.22,color:b.color});
      const passed=(player.x-b.x)*Math.sign(b.lungeVx)<=70;
      if(passed||b.t<=0){
        if(passed)b.x=player.x-Math.sign(b.lungeVx)*70;
        clampBoss(b);
        b.st='IDLE';b.t=0.4;b.lungeVx=0;b.dashCd=(b.phase2?1.1:2.1)/diffM;
        camShake=Math.max(camShake,4);shockRing(b.x,b.y-40,b.color,120);burst(b.x,b.y-40,b.color,14,280);
        // Al frenar escupe un abanico: no puedes quedarte pegado pegado sin moverte.
        const ang=Math.atan2((player.y-16)-(b.y-50),player.x-b.x),n=b.phase2?5:3;
        for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*0.17;
          eProj.push({x:b.x,y:b.y-50,vx:Math.cos(a)*390,vy:Math.sin(a)*390,w:12,h:12,life:1.7,dmg:Math.round(10*(b.phase2?1.25:1)),hell:true,col:b.color});}
        beep(300,0.14,0.2,'sawtooth');
      }
    }
    if(b.st==='IDLE'){
      const keep=b.keep||240;
      b.farT=adx>Math.max(300,keep+100)?(b.farT||0)+dt:0;
      const spd=(b.speed||40)*(b.phase2?1.55:1.1)*diffM;
      let m=0;
      if(adx>keep+50)m=Math.sign(dx);
      else if(adx<keep-90)m=-Math.sign(dx);
      else{
        b.strafeT=(b.strafeT||0)-dt;
        if(b.strafeT<=0){b.strafeT=0.9+Math.random()*1.1;b.strafeDir=Math.random()<0.5?-1:1;}
        m=b.strafeDir||1;
      }
      if(m!==0){b.x+=m*spd*dt;clampBoss(b);}
      // Esquiva lateral: si le llega un disparo, deja de ser un blanco fijo.
      if(b.evadeT>0){
        b.evadeT-=dt;b.x+=b.evadeDir*(b.phase2?500:380)*diffM*dt;clampBoss(b);
        if(Math.floor(performance.now()/50)%2===0)fx.push({kind:'bossghost',spr:b.spr,sw:b.sw||120,sh:b.sh||b.h,hue:b.hue,x:b.x,y:b.y,face:b.evadeDir<0,t:0.18,max:0.18,color:b.color});
      }else if(b.evadeCd<=0){
        let ed=0;
        for(const p of pProj){if(p.life<=0)continue;const vd=Math.sign(p.vx)||1,ahead=(b.x-p.x)*vd;
          if(ahead>0&&ahead<210&&Math.abs(p.y-(b.y-48))<72){ed=vd;break;}}
        if(ed!==0){
          const a=ARENAS[b.idx],nx=b.x+ed*95;
          if(a&&(nx<a[0]+60||nx>a[1]-60))ed=-ed;
          b.evadeDir=ed;b.evadeT=0.22;b.evadeCd=(b.phase2?0.9:1.7)/diffM;
        }
      }
      // Anti-camp: si te quedas lejos demasiado tiempo, embiste sí o sí.
      const campLimit=(b.phase2?0.55:1.0)/diffM;
      if(b.st==='IDLE'&&b.dashCd<=0&&(b.farT||0)>campLimit){
        b.farT=0;b.st='TELE';b.t=(b.tele||0.35)*0.8;b.flash=0.35;b.pat='RUSH';b.pid=++patId;
        beep(90,0.25,0.2,'sawtooth');
      }
    }
    if(b.st==='IDLE'&&b.t<=0&&b.evadeT<=0){b.st='TELE';b.t=b.tele||0.35;b.flash=0.35;choosePattern(b,dx,adx);}
    else if(b.st==='TELE'&&b.t<=0){firePattern(b,dx);if(b.st!=='LUNGE'){b.st='IDLE';b.t=(b.idle||1.15)*(b.phase2?0.55:0.85);}}
    if(adx<42&&Math.abs(b.y-player.y)<80&&b.contactCd<=0){b.contactCd=0.9;hurtPlayer(b.contact,b.x);}
  });
  bosses=bosses.filter(b=>!b.dead);
  pProj.forEach(p=>{p.x+=p.vx*dt;if(p.vy)p.y+=p.vy*dt;p.life-=dt;
    const fresh=o=>!p.hits||!p.hits.includes(o);
    slimes.forEach(s=>{if(!s.dead&&fresh(s)&&Math.abs(s.x-p.x)<s.w*0.7+8&&Math.abs(s.y-s.h*0.5-p.y)<s.h*0.7+10){
      const seff=(EFFECT[p.weapon]&&EFFECT[p.weapon].Slime)||1;
      hurtSlime(s,Math.round(p.dmg*seff),Math.sign(p.vx)||1);
      burst(p.x,p.y,'#fff',3,180);if(p.hits)p.hits.push(s);if(!p.pierce)p.life=0;}});
    bosses.forEach(b=>{if(!b.dead&&fresh(b)){
      const bw=(b.sw||b.w)*0.55,bh=(b.sh||b.h);
      if(Math.abs(b.x-p.x)<bw&&p.y>b.y-bh&&p.y<b.y+8){
        const eff=(EFFECT[p.weapon]&&EFFECT[p.weapon][b.type])||1;
        const dealt=Math.round(p.dmg*eff);
        dealBossDmg(b,dealt);
        burst(p.x,p.y,b.color||'#fff',dealt>=20?5:3,220);
        if(dealt>=20)shockRing(p.x,p.y,b.color||'#fff',48);
        if(p.hits)p.hits.push(b);if(!p.pierce)p.life=0;
      }
    }});
  });
  // Recompensa de Resonator/BassTitan: las balas de EchoShot rebotan una vez al agotar su alcance.
  if(S.skills.boss_ricochet)for(const p of pProj){
    if(p.life<=0&&p.kind==='shot'&&!p.rb){p.rb=true;p.life=0.34;p.vx*=-1;p.vy=(p.vy||0)*0.4;burst(p.x,p.y,'#ffd933',4,180);beep(1000,0.04,0.08);}
  }
  // Tus disparos ya NO destruyen balas enemigas: el bullet-hell se esquiva o se para con el parry al beat.
  pProj=pProj.filter(p=>p.life>0&&p.x>0&&p.x<WORLD_W);
  eProj.forEach(p=>{
    // Orbes del Coro: cargan en el aire y estallan en abanico dirigido.
    if(p.fuse!==undefined){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.fuse-=dt;
      if(p.fuse<=0){
        const ang=Math.atan2((player.y-16)-p.y,player.x-p.x),n=p.split||4;
        for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*0.18;
          eProj.push({x:p.x,y:p.y,vx:Math.cos(a)*300,vy:Math.sin(a)*300,w:11,h:11,life:1.8,dmg:p.dmg,hell:true,col:p.col});}
        p.life=0;burst(p.x,p.y,p.col||'#b333ff',8,240);beep(300,0.1,0.12,'sawtooth');
      }
      return;
    }
    if(p.hole){p.t-=rdt;const dx=player.x-p.x,dy=(player.y-16)-p.y,d=Math.hypot(dx,dy)||1;
      if(d<160&&d>1){const mx=-dx/d*280*dt,my=-dy/d*280*dt,Ss=solids();
        if(!Ss.some(s=>rectHit({x:player.x-player.w/2+mx,y:player.y-player.h,w:player.w,h:player.h},s)))player.x+=mx;
        if(!Ss.some(s=>rectHit({x:player.x-player.w/2,y:player.y-player.h+my,w:player.w,h:player.h},s)))player.y+=my;
        p.tick=(p.tick||0)-dt;if(p.tick<=0){p.tick=0.5;hurtPlayer(6,p.x);}}
      return;}
    if(p.bounce!==undefined){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.leg-=Math.hypot(p.vx,p.vy)*dt;
      if(p.leg<=0){p.bounce--;if(p.bounce<0)p.life=0;else{p.leg=400;p.vx*=-1;p.vy+=(Math.random()-0.5)*100;}}
      p.life-=dt;
    }else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
    if(Math.abs(player.x-p.x)<18&&Math.abs((player.y-16)-p.y)<20){
      const ev=Rhythm.evaluate();
      if(S.skills.parry_reflect&&ev.r!=='MISS'){
        p.life=0;player.en=Math.min(100,player.en+4);
        let b=null;
        if(bosses.length){b=bosses.reduce((a,b2)=>Math.abs(b2.x-player.x)<Math.abs(a.x-player.x)?b2:a,bosses[0]);}
        if(b){dealBossDmg(b,36);floaters.push({x:player.x,y:player.y-60,txt:'PARRY',t:0.8,c:'#33e6ff'});
          burst(player.x,player.y-30,'#33e6ff',8,360);
        }
        beep(1200,0.1,0.2);
      }else{p.life=0;hurtPlayer(p.dmg,p.x);}
    }
  });
  eProj=eProj.filter(p=>(p.hole?p.t>0:p.life>0));
  // Notas piano-tiles: caen por carriles; si pasan no quitan vida, drenan energía y rompen racha
  const tNow=performance.now()/1000,missLim=noteLimit();
  for(const n of notes){
    n.x=HW_X[n.key];n.y=HW_HIT-(n.tHit-tNow)*n.spd;
    if(!n.dead&&tNow-n.tHit>missLim){
      n.dead=true;player.en=Math.max(0,player.en-4);breakNoteCombo();
      beep(180,0.08,0.1);
      floaters.push({x:HW_X[n.key],y:HW_HIT-18,txt:'MISS FICHA '+(n.key+1),t:0.7,c:'#f66'});
      burst(HW_X[n.key],HW_HIT,'#f66',6,200);
    }
  }
  notes=notes.filter(n=>!n.dead&&tNow-n.t0<8);
  noteVis=Math.max(0,Math.min(1,noteVis+(activeBoss()?5*dt:-4*dt)));
  parts.forEach(p=>{
    p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;
    if(!p.nograv)p.vy=(p.vy||0)+800*dt;
    if(p.ring){p.r=(p.r||6)+(p.vr||260)*dt;}
    p.t-=dt;
  });
  parts=parts.filter(p=>p.t>0);floaters.forEach(f=>{f.y-=40*dt;f.t-=dt;});floaters=floaters.filter(f=>f.t>0);
  camShakeT=Math.max(0,camShakeT-rdt);if(camShakeT<=0)camShake=0;
  camX=Math.max(0,Math.min(WORLD_W-W,player.x-W/2));camY=Math.max(-120,Math.min(360,player.y-300));
  const ai=AREAS.findIndex(a=>player.x>=a.from&&player.x<a.to);
  areaT=Math.max(0,areaT-rdt);
  if(ai>=0&&ai!==currentArea){currentArea=ai;areaT=2.6;}
  $('bpmlabel').textContent=Rhythm.bpm+' BPM · BOMBO '+Rhythm.kickCount;
  $('hpfill').style.width=(100*player.hp/maxHP())+'%';$('hptext').textContent=Math.ceil(player.hp)+' / '+maxHP();
  $('enfill').style.width=player.en+'%';$('echoes').textContent='◈ '+S.echoes;
  const ab2=activeBoss();
  let hint='E:'+Math.round(player.en)+' '+WEAPONS[wi].name+' x:'+Math.round(player.x)+' ['+S.checkpoint+']';
  if(ab2)hint+=' · J ataca y rompe ficha'+(noteCombo>=2?' x'+noteCombo:'')+' · 1-4/ZXCV opcional';
  else if(warnArena!==null&&warnArena!==undefined)hint+=' · ⚠ ¡La arena se SELLARÁ al entrar! Entra con vida/energía';
  $('hint').textContent=hint;
  markLanes();
  drawMinimap();
}
