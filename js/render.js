// js/render.js — dibujo procedural mejorado (pixel-art por rects)
'use strict';
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x-camX),Math.round(y-camY),w,h);}
function draw(){
  // fondo degradado + luna + estrellas 2 capas
  const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#0b0b18');grd.addColorStop(0.6,'#14141f');grd.addColorStop(1,'#1d1426');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f5f3ce';ctx.beginPath();ctx.arc(800-camX*0.05,90,26,0,7);ctx.fill();
  ctx.fillStyle='#d9d6a8';ctx.beginPath();ctx.arc(792-camX*0.05,84,26,0,7);ctx.fillStyle='#0b0b18';ctx.beginPath();ctx.arc(792-camX*0.05,84,22,0,7);ctx.fill();
  ctx.fillStyle='#22223a';for(let i=0;i<40;i++){const sx=((i*457)-camX*0.3)%W;ctx.fillRect((sx+W)%W,(i*89)%H,2,2);}
  ctx.fillStyle='#3a3a5c';for(let i=0;i<24;i++){const sx=((i*733+200)-camX*0.15)%W;ctx.fillRect((sx+W)%W,(i*137)%H,1,1);}
  // suelo con borde + hierba
  R(0,GROUND_TOP,WORLD_W,H,'#2b2b3d');R(0,GROUND_TOP,WORLD_W,4,'#5c5c8a');R(0,GROUND_TOP+4,WORLD_W,2,'#3d7a44');
  for(let x=0;x<WORLD_W;x+=64){R(x,GROUND_TOP+8,32,3,'#34344a');}
  // plataformas con highlight
  PLATS.forEach(p=>{const px=p[0]-p[2]/2,py=p[1]-p[3]/2;
    R(px,py,p[2],p[3],p[3]>100?'#3d3d5c':'#5a5a8a');
    R(px,py,p[2],2,'#8a8ab8');
    R(px,py+p[3]-2,p[2],2,'#2a2a3e');
  });
  ARENAS.forEach(([a,b],i)=>{R(a,GROUND_TOP-32,b-a,32,'#22222f');R(a,GROUND_TOP-32,b-a,2,'#44445e');ctx.fillStyle='#888';ctx.font='12px monospace';ctx.fillText('BOSS '+(i+1),a+20-camX,GROUND_TOP-46-camY);});
  // checkpoints: poste + bandera
  CHECKPOINTS.forEach(c=>{if(c.id==='start')return;const active=CHECKPOINTS.findIndex(k=>k.id===S.checkpoint)>=CHECKPOINTS.findIndex(k=>k.id===c.id);
    R(c.x-2,GROUND_TOP-48,4,48,'#888');R(c.x+2,GROUND_TOP-48,22,14,active?'#3f6':'#555');R(c.x+2,GROUND_TOP-48,22,2,'#fff');});
  // puertas: cerrada=roja con glow · abierta=gris/verde · cercana a boss vivo=amarilla de aviso
  doors.forEach(d=>{
    if(!d.open){
      const pulse=2+Math.sin(performance.now()/150)*1;
      R(d.x-12,622,24,256,'#a33');R(d.x-12,622,24,8,'#f66');R(d.x-12,700,24,4,'#711');R(d.x-12,780,24,4,'#711');
      ctx.strokeStyle='#f66';ctx.lineWidth=pulse;ctx.strokeRect(d.x-12-camX,622-camY,24,256);
      ctx.fillStyle='#f66';ctx.font='bold 10px monospace';ctx.fillText('LOCK',d.x-14-camX,616-camY);
    }else{
      let warn=false;
      if(player&&state==='play'){
        for(const b of bosses){if(b.dead)continue;const a=ARENAS[b.idx];if(!a)continue;
          if(Math.abs(d.x-a[0])<5||Math.abs(d.x-a[1])<5){if(Math.abs(player.x-d.x)<190)warn=true;}}
      }
      R(d.x-12,622,24,256,warn?'#6b5a1e':'#2c2c3a');
      R(d.x-12,622,4,256,warn?'#ffd933':'#3f6');
      if(warn){ctx.fillStyle='#ffd933';ctx.font='10px monospace';ctx.fillText('⚠ SELLABLE',d.x-30-camX,616-camY);}
    }
  });
  // shards diamante con glow
  const tn=performance.now()/800;
  shards.forEach(s=>{const f=Math.sin(tn+s.t)*6;const y=s.y+f;
    R(s.x-11,y-11,22,22,'#443a00');R(s.x-8,y-8,16,16,'#ffd933');R(s.x-3,y-3,6,6,'#fff');R(s.x-8,y+10,16,2,'#aa8a00');});
  // locks cofre
  locks.forEach(l=>{R(l.x-12,l.y-32,24,32,'#1e6aa8');R(l.x-12,l.y-32,24,6,'#3aa0f0');R(l.x-2,l.y-20,4,12,'#ffd933');ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText('J',l.x-4-camX,l.y-36-camY);});
  if(S.shade){R(S.shade.x-12,S.shade.y-32,24,32,'#555');R(S.shade.x-12,S.shade.y-32,24,6,'#888');R(S.shade.x-7,S.shade.y-24,4,4,'#0ff');R(S.shade.x+3,S.shade.y-24,4,4,'#0ff');}
  // slimes con squash (flash se decrementa en update con dt, aquí solo lectura)
  slimes.forEach(s=>{if(s.dead)return;const sq=s.squash||0;const w=s.w*(1+sq),h=s.h*(1-sq*0.8);
    R(s.x-w/2,s.y-h,w,h,(s.flash||0)>0?'#fff':s.stun>0?'#88f':'#3c6');
    R(s.x-w/2,s.y-h,w,3,'#7f6');R(s.x-6,s.y-h+6,5,6,'#fff');R(s.x+2,s.y-h+6,5,6,'#fff');R(s.x-5,s.y-h+7,3,4,'#000');R(s.x+3,s.y-h+7,3,4,'#000');});
  // bosses con ojos + corona fase2 (dormido = atenuado + zZ, flash solo lectura)
  bosses.forEach(b=>{const c=(b.flash||0)>0?'#fff':b.color;
    if(!b.locked&&!b.dead)ctx.globalAlpha=0.55;
    R(b.x-b.w/2,b.y-b.h,b.w,b.h,c);R(b.x-b.w/2,b.y-b.h,b.w,6,'#ffffff55');
    R(b.x-14,b.y-b.h+16,10,10,b.locked?'#fff':'#666');R(b.x+4,b.y-b.h+16,10,10,b.locked?'#fff':'#666');R(b.x-11,b.y-b.h+19,4,5,'#000');R(b.x+7,b.y-b.h+19,4,5,'#000');
    if(b.phase2){
      R(b.x-b.w/2,b.y-b.h-10,b.w,8,'#ffd933');
      const pu=2+Math.sin(performance.now()/120)*1.5;
      ctx.strokeStyle='#ffd933';ctx.lineWidth=pu;ctx.strokeRect(b.x-b.w/2-3-camX,b.y-b.h-3-camY,b.w+6,b.h+6);
    }
    if(b.locked){ctx.fillStyle='#f66';ctx.font='bold 11px monospace';ctx.fillText('▼ LOCKED ▼',b.x-34-camX,b.y-b.h-36-camY);}
    else if(!b.dead){ctx.fillStyle='#888';ctx.font='11px monospace';ctx.fillText('zZ… entra',b.x-28-camX,b.y-b.h-26-camY);}
    ctx.globalAlpha=1;
    if(b.st==='TELE'){ctx.strokeStyle='#f00';ctx.lineWidth=3;ctx.strokeRect(b.x-b.w/2-4-camX,b.y-b.h-4-camY,b.w+8,b.h+8);}
    if(b.st==='STUNNED'){ctx.fillStyle='#33e6ff';ctx.font='12px monospace';ctx.fillText('★',b.x-6-camX,b.y-b.h-14-camY);}
    ctx.fillStyle='#000';ctx.fillRect(b.x-30-camX,b.y-b.h-22-camY,60,8);ctx.fillStyle=b.phase2?'#f80':'#f33';ctx.fillRect(b.x-30-camX,b.y-b.h-22-camY,60*Math.max(0,b.hp/b.maxhp),8);
    ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(b.type+' '+Math.ceil(b.hp),b.x-30-camX,b.y-b.h-26-camY);});
  pProj.forEach(p=>{R(p.x-9,p.y-5,p.w,p.h,'#8ff');R(p.x-9,p.y-5,p.w,2,'#fff');});
  // bullet-hell: balas rojas circulares con núcleo blanco
  eProj.forEach(p=>{if(p.hole){ctx.strokeStyle='#b4f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x-camX,p.y-camY,20+5*Math.sin(performance.now()/100),0,7);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x-camX,p.y-camY,10+3*Math.sin(performance.now()/70),0,7);ctx.stroke();}else{const px=p.x-camX,py=p.y-camY;ctx.fillStyle=p.hell?'#ff2255':'#f6c';ctx.beginPath();ctx.arc(px,py,8,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,3.2,0,7);ctx.fill();}});
  // notas osu/piano-tiles: diamante de color + número de tecla
  if(activeBoss&&player){
    const ab=activeBoss();
    if(ab){ctx.strokeStyle='#ffffff33';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x-camX,player.y-16-camY,NOTE_HIT_R,0,7);ctx.stroke();}
  }
  notes.forEach(n=>{const px=n.x-camX,py=n.y-camY,c=NOTE_COLORS[n.key];
    const dd=player?Math.hypot(player.x-n.x,(player.y-16)-n.y):300;
    const ring=14+Math.min(dd,420)*0.32;
    ctx.strokeStyle=c;ctx.globalAlpha=0.75;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(px,py,ring,0,7);ctx.stroke();ctx.globalAlpha=1;
    // Anillo de aproximación al BOMBO: se encoge hacia 17 cuando llega el kick (estilo osu)
    try{
      const nowS=performance.now()/1000;
      const gap=Rhythm.kickGap||0.5;
      const tKick=Math.max(0,(Rhythm.next||nowS)-nowS);
      const k=(Rhythm.isKickBeat((Rhythm.count||0)+1))?Math.max(0,Math.min(1,1-tKick/gap)):1;
      const appr=17+(1-k)*46;
      if(k<1){ctx.strokeStyle='#ffffffcc';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px,py,appr,0,7);ctx.stroke();}
    }catch(_){}
    if((performance.now()/1000-Rhythm.lastKick)<0.12){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px,py,17,0,7);ctx.stroke();}
    ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(px,py-13);ctx.lineTo(px+13,py);ctx.lineTo(px,py+13);ctx.lineTo(px-13,py);ctx.closePath();ctx.fill();
    ctx.fillStyle='#000';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(String(n.key+1),px,py+5);ctx.textAlign='left';
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py-13);ctx.lineTo(px+13,py);ctx.lineTo(px,py+13);ctx.lineTo(px-13,py);ctx.closePath();ctx.stroke();});
  // player con visor + espada
  if(deadT<=0&&player){
    const blink=iframes>0&&Math.floor(performance.now()/60)%2;
    const c=blink?'#88f':'#33e6ff';
    if(dashT>0){R(player.x-12-player.face*20,player.y-32,20,32,'#8ff8');}
    R(player.x-12,player.y-32,24,32,c);R(player.x-12,player.y-32,24,5,'#1a8aaa');
    R(player.x+(player.face>0?2:-9),player.y-24,7,6,'#fff');R(player.x+(player.face>0?4:-7),player.y-23,3,4,'#000');
    R(player.x-12,player.y-6,24,6,'#224'); // botas
  }
  parts.forEach(p=>{
    if(p.ring){
      ctx.strokeStyle=p.c||'#fff';ctx.globalAlpha=Math.max(0,Math.min(1,(p.t||0.4)*2.2));ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(p.x-camX,p.y-camY,p.r||10,0,7);ctx.stroke();ctx.globalAlpha=1;
    }else R(p.x-3,p.y-3,6,6,p.c);
  });
  ctx.fillStyle='#fff';ctx.font='13px monospace';
  floaters.forEach(f=>{ctx.fillStyle=f.c;ctx.fillText(f.txt,f.x-camX,f.y-camY);});
  if(atkCd>0.05&&player){ctx.strokeStyle=WEAPONS[wi].color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x-camX,player.y-16-camY,40+comboIdx*6,-0.6+player.face*0.4,1.2+player.face*0.4);ctx.stroke();}
}
function drawMinimap(){
  const m=$('minimap').getContext('2d');m.clearRect(0,0,240,28);m.fillStyle='#111';m.fillRect(0,0,240,28);
  CHECKPOINTS.forEach(c=>{m.fillStyle='#3a3';m.fillRect(c.x/WORLD_W*240,18,2,6);});
  bosses.forEach(b=>{m.fillStyle=b.dead?'#555':'#f44';m.fillRect(b.x/WORLD_W*240,8,5,5);});
  if(player){m.fillStyle='#3f9';m.fillRect(player.x/WORLD_W*240,6,4,8);}
}
