// js/update.js — bucle de simulación
'use strict';
function update(rdt){
  // Pausa total: congela ritmo (sin catch-up de beeps) y timers escalados
  if(state!=='play'||skillOpen||tutHowOpen||state==='pause'||Piano.active){
    Rhythm.hold();updateTimescale(rdt);
    return;
  }
  Rhythm.update();updateTimescale(rdt);
  updateDelayed(rdt*timeScale);
  const dt=rdt*timeScale;
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
  if(dashT<=0){
    if(dir!==0)player.vx+=Math.sign(dir*300-player.vx)*Math.min(Math.abs(dir*300-player.vx),acc*dt);
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
  if(jbuf>0){
    if(coyote>0){player.vy=-460;jbuf=0;coyote=0;beep(600,0.06,0.1);}
    else if(player.wallDir!==0&&S.skills.wall_jump){player.vy=-400;player.vx=-player.wallDir*340;player.face=-player.wallDir;jbuf=0;beep(600,0.06,0.1);}
    else if(S.skills.double_jump&&jumps<1){player.vy=-460*0.92;jumps++;jbuf=0;beep(750,0.06,0.1);}
  }
  if(!(keys['Space']||keys['KeyW'])&&player.vy<-150)player.vy*=(1-6*dt);
  dashCd-=dt;dashT-=dt;iframes-=dt;atkCd-=dt;
  if(keys['ShiftLeft']||keys['ShiftRight'])dash();
  if(dashT>0){player.vx=player.face*680;player.vy=0;}
  else if(dashT>-0.05&&dashT<=0){player.vx*=0.55;dashT=-1;}
  moveBody(player,dt);
  tryLockBosses();
  fixLockedOutPlayer();
  updateDoorState();
  const warnArena=checkArenaWarning();
  checkCheckpoints();
  if(player.y>1200){player.hp=0;die();return;}
  shards=shards.filter(sh=>{sh.t+=dt;if(Math.abs(sh.x-player.x)<24&&Math.abs((sh.y)-(player.y-16))<40){S.shards[sh.id]=true;S.echoes+=echoGain(10);save();beep(1320,0.15,0.2);floaters.push({x:sh.x,y:sh.y,txt:'+10 ◈',t:1,c:'#ffd933'});return false;}return true;});
  const beat2=Rhythm.count%2===0; // par = BOMBO: slimes saltan solo en bombos
  slimes.forEach(s=>{if(s.dead)return;s.t+=dt;s.contactCd-=dt;s.squash=Math.max(0,(s.squash||0)-dt);s.flash=Math.max(0,(s.flash||0)-dt);
    if(s.stun>0){s.stun-=dt;}
    else{
      const dx=player.x-s.x;
      if(Math.abs(dx)<200){s.dir=Math.sign(dx)||1;s.vx=s.dir*42;
        if(beat2&&Math.abs(dx)>25&&Math.abs(dx)<240&&s.onFloor){s.vy=-180;s.vx=s.dir*140;s.squash=0.2;beep(250,0.05,0.06);}
      }else{s.vx=s.dir*70;if(Math.abs(s.x-s.home)>160)s.dir*=-1;}
    }
    s.vy+=1100*dt;moveBody(s,dt);
    if(Math.abs(s.x-player.x)<28&&Math.abs(s.y-player.y)<40&&s.contactCd<=0){s.contactCd=0.8;hurtPlayer(12);}
  });
  slimes=slimes.filter(s=>!s.dead);
  bosses.forEach(b=>{if(b.dead)return;
    clampBoss(b);
    b.flash-=dt;b.contactCd-=dt;
    if(!b.locked)return; // dormido: ni patrones, ni barrage, ni contacto
    const dx=player.x-b.x,adx=Math.abs(dx);
    b.t-=dt;
    if(b.st==='STUNNED'){if(b.t<=0){b.st='IDLE';b.t=0.5;}return;}
    if(b.st==='IDLE'&&b.t<=0){b.st='TELE';b.t=0.35;b.flash=0.35;choosePattern(b,dx,adx);}
    else if(b.st==='TELE'&&b.t<=0){firePattern(b,dx);b.st='IDLE';b.t=b.phase2?0.85:1.15;}
    if(adx<42&&Math.abs(b.y-player.y)<80&&b.contactCd<=0){b.contactCd=0.9;hurtPlayer(b.contact);}
  });
  bosses=bosses.filter(b=>!b.dead);
  pProj.forEach(p=>{p.x+=p.vx*dt;p.life-=dt;
    slimes.forEach(s=>{if(!s.dead&&Math.abs(s.x-p.x)<20&&Math.abs(s.y-16-p.y)<24){hurtSlime(s,p.dmg,Math.sign(p.vx));p.life=0;}});
    bosses.forEach(b=>{if(!b.dead&&Math.abs(b.x-p.x)<34&&Math.abs(b.y-40-p.y)<60){
      dealBossDmg(b,Math.round(p.dmg*(EFFECT[WEAPONS[wi].name][b.type]||1)));p.life=0;}});
  });
  // Tus disparos también hacen parry a distancia: destruyen balas enemigas al chocar
  for(const pp of pProj){
    if(pp.life<=0)continue;
    for(const ep of eProj){
      if(ep.hole||ep.life<=0)continue;
      if(Math.abs(ep.x-pp.x)<18&&Math.abs(ep.y-pp.y)<16){
        ep.life=0;pp.life-=0.34;
        parts.push({x:ep.x,y:ep.y,vx:0,vy:-60,t:0.25,c:'#33e6ff'});
        player.en=Math.min(100,player.en+1);
        if(pp.life<=0)break;
      }
    }
  }
  pProj=pProj.filter(p=>p.life>0&&p.x>0&&p.x<WORLD_W);
  eProj.forEach(p=>{
    if(p.hole){p.t-=rdt;const dx=player.x-p.x,dy=(player.y-16)-p.y,d=Math.hypot(dx,dy)||1;
      if(d<160&&d>1){movePlayerBy(-dx/d*280*dt,-dy/d*280*dt);p.tick=(p.tick||0)-dt;if(p.tick<=0){p.tick=0.5;hurtPlayer(6);}}
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
          for(let i=0;i<8;i++)parts.push({x:player.x,y:player.y-30,vx:(Math.random()-0.5)*360,vy:-Math.random()*280,t:0.4,c:'#33e6ff'});
        }
        beep(1200,0.1,0.2);
      }else{p.life=0;hurtPlayer(p.dmg);}
    }
  });
  eProj=eProj.filter(p=>(p.hole?p.t>0:p.life>0));
  // Notas osu/piano-tiles: vuelan al jugador; si te tocan sin golpearlas duelen y rompen racha
  for(const n of notes){n.x+=n.vx*dt;n.y+=n.vy*dt;n.life-=dt;n.tick-=dt;
    if(n.tick<=0){n.tick=0.09;parts.push({x:n.x,y:n.y,vx:(Math.random()-0.5)*60,vy:-40-Math.random()*40,t:0.25,c:NOTE_COLORS[n.key]});}}
  for(const n of notes){
    if(Math.hypot(player.x-n.x,(player.y-16)-n.y)<NOTE_HURT_R){
      n.life=0;hurtPlayer(8);breakNoteCombo();
      floaters.push({x:player.x,y:player.y-60,txt:'MISS ♪'+(n.key+1),t:0.7,c:'#f66'});
    }
  }
  notes=notes.filter(n=>n.life>0&&n.x>-50&&n.x<WORLD_W+50&&n.y<1100);
  parts.forEach(p=>{
    p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;
    if(!p.nograv)p.vy=(p.vy||0)+800*dt;
    if(p.ring){p.r=(p.r||6)+(p.vr||260)*dt;}
    p.t-=dt;
  });
  parts=parts.filter(p=>p.t>0);floaters.forEach(f=>{f.y-=40*dt;f.t-=dt;});floaters=floaters.filter(f=>f.t>0);
  // Tutorial superior desactivado por petición: ya no muestra carteles arriba.
  // Se oculta siempre por si quedó visible de una partida anterior.
  if(tutIdx!==-1||tutT>0){tutIdx=-1;tutT=0;const el=$('tutorial');if(el)el.style.display='none';}
  camX=Math.max(0,Math.min(WORLD_W-W,player.x-W/2));camY=Math.max(180,Math.min(360,player.y-300));
  $('bpmlabel').textContent=Rhythm.bpm+' BPM · BOMBO '+Rhythm.kickCount;
  $('hpfill').style.width=(100*player.hp/maxHP())+'%';$('hptext').textContent=Math.ceil(player.hp)+' / '+maxHP();
  $('enfill').style.width=player.en+'%';$('echoes').textContent='◈ '+S.echoes;
  const ab2=activeBoss();
  let hint='E:'+Math.round(player.en)+' '+WEAPONS[wi].name+' x:'+Math.round(player.x)+' ['+S.checkpoint+']';
  if(ab2)hint+=' · 1-4 golpea NOTAS ♪'+(noteCombo>=2?' x'+noteCombo:'')+' · ¡Sin salida!';
  else if(warnArena!==null&&warnArena!==undefined)hint+=' · ⚠ ¡La arena se SELLARÁ al entrar! Entra con vida/energía';
  $('hint').textContent=hint;
  markLanes();
  drawMinimap();
}
