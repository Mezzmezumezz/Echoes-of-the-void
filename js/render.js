// js/render.js — Kenney Pixel Platformer (CC0) + fallback procedural por rects
'use strict';
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x-camX),Math.round(y-camY),w,h);}
const PAT_LABEL={SINGLE:'TIRO',DOUBLE:'DOBLE',WAVE:'ONDA',PULSE:'PULSO',RICOCHET:'REBOTE',BLACKHOLE:'VACÍO',TELEPORT:'SALTO',CLONE:'ECO',FAN:'ABANICO',SIG:'FIRMA',RUSH:'EMBESTIDA',AIR:'AIRE'};
function draw(){
  if(state==='ending'){drawEnding();return;}
  ctx.imageSmoothingEnabled=false;
  const shx=camShake?Math.round((Math.random()*2-1)*camShake):0;
  const shy=camShake?Math.round((Math.random()*2-1)*camShake):0;
  camX+=shx;camY+=shy;
  // fondo degradado (tinte por zona) + luna + estrellas 2 capas
  const area=AREAS[currentArea]||AREAS[0];
  const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,area.bg||'#0b0b18');grd.addColorStop(0.6,'#14141f');grd.addColorStop(1,'#1d1426');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f5f3ce';ctx.beginPath();ctx.arc(800-camX*0.05,90,26,0,7);ctx.fill();
  ctx.fillStyle='#d9d6a8';ctx.beginPath();ctx.arc(792-camX*0.05,84,26,0,7);ctx.fillStyle='#0b0b18';ctx.beginPath();ctx.arc(792-camX*0.05,84,22,0,7);ctx.fill();
  ctx.fillStyle='#22223a';for(let i=0;i<40;i++){const sx=((i*457)-camX*0.3)%W;ctx.fillRect((sx+W)%W,(i*89)%H,2,2);}
  ctx.fillStyle='#3a3a5c';for(let i=0;i<24;i++){const sx=((i*733+200)-camX*0.15)%W;ctx.fillRect((sx+W)%W,(i*137)%H,1,1);}
  // suelo: sprites Kenney (hierba + tierra 18px) o fallback procedural
  let groundSpr=Assets.ok('grass')&&Assets.ok('dirt');
  if(groundSpr){
    R(0,GROUND_TOP,WORLD_W,H,'#2b2b3d'); // base por si algún tile aún carga
    const x0=Math.max(0,Math.floor(camX/18)*18),x1=Math.min(WORLD_W,camX+W+18);
    for(let wx=x0;wx<x1;wx+=18){
      ctx.drawImage(Assets.img.grass,Math.round(wx-camX),Math.round(GROUND_TOP-camY),18,18);
      for(let wy=GROUND_TOP+18;wy<camY+H;wy+=18)
        ctx.drawImage(Assets.img.dirt,Math.round(wx-camX),Math.round(wy-camY),18,18);
    }
  }else{
    R(0,GROUND_TOP,WORLD_W,H,'#2b2b3d');R(0,GROUND_TOP,WORLD_W,4,'#5c5c8a');R(0,GROUND_TOP+4,WORLD_W,2,'#3d7a44');
    for(let x=0;x<WORLD_W;x+=64){R(x,GROUND_TOP+8,32,3,'#34344a');}
  }
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
  // slimes: sprite Kenney con squash, o fallback procedural (flash solo lectura)
  slimes.forEach(s=>{if(s.dead)return;const sq=s.squash||0;const w=s.w*(1+sq),h=s.h*(1-sq*0.8);
    if(Assets.draw('slime',s.x,s.y,w+6,h+8,false,{hue:s.hue})){
      if((s.flash||0)>0){ctx.globalAlpha=0.7;R(s.x-w/2,s.y-h,w,h,'#fff');ctx.globalAlpha=1;}
      else if(s.stun>0){ctx.globalAlpha=0.45;R(s.x-w/2,s.y-h,w,h,'#88f');ctx.globalAlpha=1;}
      return;
    }
    R(s.x-w/2,s.y-h,w,h,(s.flash||0)>0?'#fff':s.stun>0?'#88f':(s.color||'#3c6'));
    R(s.x-w/2,s.y-h,w,3,'#7f6');R(s.x-6,s.y-h+6,5,6,'#fff');R(s.x+2,s.y-h+6,5,6,'#fff');R(s.x-5,s.y-h+7,3,4,'#000');R(s.x+3,s.y-h+7,3,4,'#000');});
  // bosses animados: hoja de sprites, rebote idle, shake de telegrafía y aura en fase 2
  bosses.forEach(b=>{
    if(b.x-camX<-240||b.x-camX>W+240)return;
    const t=performance.now()/1000;
    const bh=b.sh||b.h;
    const idle=Math.sin(t*2.6+b.idx*1.7)*2;
    const shake=b.st==='TELE'?Math.sin(performance.now()/28)*3:0;
    const hit=(b.hitT||0)>0?Math.sin(performance.now()/20)*4*(b.hitT/0.14):0;
    const bx=b.x+shake+hit;
    const baseFps=b.fps||8;
    const fps=b.st==='STUNNED'?baseFps*0.3:b.st==='TELE'?baseFps*0.45:b.phase2?baseFps*1.5:baseFps;
    const frame=Math.floor(t*fps+b.idx*2.3);
    const white=(b.flash||0)>0;
    const alpha=(!b.locked&&!b.dead)?0.55:1;
    if(b.phase2){const pu=0.18+0.1*Math.sin(t*6);ctx.fillStyle='rgba(255,217,51,'+pu+')';ctx.beginPath();ctx.arc(b.x-camX,b.y-bh*0.45-camY,bh*0.62,0,7);ctx.fill();}
    if(b.st==='LUNGE'){const d=Math.sign(b.lungeVx)||1;
      ctx.strokeStyle=b.color;ctx.globalAlpha=0.5;ctx.lineWidth=2;
      for(let i=0;i<4;i++){const ly=b.y-bh*0.2-i*18;ctx.beginPath();ctx.moveTo(bx-camX-d*(50+i*18),ly-camY);ctx.lineTo(bx-camX-d*(120+i*28),ly-camY);ctx.stroke();}
      ctx.globalAlpha=1;}
    const sprBoss=Assets.drawSheet(b.spr,frame,bx,b.y+idle,b.sw||120,bh,{hue:b.hue,white,alpha,flip:player&&player.x<b.x});
    if(!sprBoss){
      ctx.globalAlpha=alpha;
      R(bx-b.w/2,b.y-b.h,b.w,b.h,white?'#fff':b.color);R(bx-b.w/2,b.y-b.h,b.w,6,'#ffffff55');
      R(bx-14,b.y-b.h+16,10,10,b.locked?'#fff':'#666');R(bx+4,b.y-b.h+16,10,10,b.locked?'#fff':'#666');R(bx-11,b.y-b.h+19,4,5,'#000');R(bx+7,b.y-b.h+19,4,5,'#000');
      ctx.globalAlpha=1;
    }
    const top=b.y-bh;
    // Fase aérea: escudo visible mientras está fuera de alcance.
    if(b.st==='AIR'){
      const pu=0.35+0.22*Math.sin(t*7);
      ctx.save();
      ctx.strokeStyle='#33e6ff';ctx.globalAlpha=pu;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(bx-camX,b.y-bh*0.5-camY,bh*0.68+6,0,7);ctx.stroke();
      ctx.globalAlpha=0.10;ctx.fillStyle='#33e6ff';ctx.fill();
      ctx.globalAlpha=0.85;ctx.fillStyle='#33e6ff';ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillText('AIRE · ESQUIVA',bx-camX,top-40-camY);
      ctx.restore();
    }
    if(b.phase2){
      const pu=2+Math.sin(performance.now()/120)*1.5;
      ctx.strokeStyle='#ffd933';ctx.lineWidth=pu;ctx.strokeRect(bx-(b.sw||b.w)/2-3-camX,top-3-camY,(b.sw||b.w)+6,bh+6);
    }
    // Telegrafía legible: qué ataque viene y hacia dónde, sin adivinar.
    if(b.st==='TELE'){
      const dur=b.tele||0.35,k=1-Math.max(0,b.t)/dur;
      ctx.save();
      ctx.strokeStyle=b.color;ctx.globalAlpha=0.3+0.4*k;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(bx-camX,b.y-bh*0.5-camY,(b.sw||b.w)*0.6+(1-k)*70,0,7);ctx.stroke();
      if(player&&['SINGLE','DOUBLE','FAN'].includes(b.pat)){
        const ang=Math.atan2((player.y-16)-(b.y-50),player.x-b.x),len=300;
        ctx.globalAlpha=0.15+0.25*k;ctx.setLineDash([8,8]);
        ctx.beginPath();ctx.moveTo(bx-camX,b.y-50-camY);ctx.lineTo(bx-camX+Math.cos(ang)*len,b.y-50-camY+Math.sin(ang)*len);ctx.stroke();
        ctx.setLineDash([]);
      }else if(player&&(b.pat==='WAVE'||b.pat==='RICOCHET')){
        const d=Math.sign(player.x-b.x)||1;
        ctx.globalAlpha=0.15+0.25*k;ctx.setLineDash([8,8]);
        ctx.beginPath();ctx.moveTo(bx-camX,b.y-50-camY);ctx.lineTo(bx-camX+d*300,b.y-50-camY);ctx.stroke();ctx.setLineDash([]);
      }else if(player&&b.pat==='RUSH'){
        // Flecha viva hacia el jugador: la embestida se puede saltar o dashear.
        const d=Math.sign(player.x-b.x)||1;
        ctx.globalAlpha=0.25+0.45*k;ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.setLineDash([16,8]);
        ctx.beginPath();ctx.moveTo(bx-camX,b.y-50-camY);ctx.lineTo(player.x-camX,b.y-50-camY);ctx.stroke();ctx.setLineDash([]);
        ctx.lineWidth=3;
        for(let i=1;i<=4;i++){const ax=bx+d*i*55;
          ctx.beginPath();ctx.moveTo(ax-camX-d*10,b.y-62-camY);ctx.lineTo(ax-camX,b.y-50-camY);ctx.lineTo(ax-camX-d*10,b.y-38-camY);ctx.stroke();}
      }else if(b.pat==='PULSE'){
        const R2=b.type==='BassTitan'?200:160;
        ctx.globalAlpha=0.25+0.35*k;
        ctx.beginPath();ctx.arc(bx-camX,b.y-40-camY,R2*k,0,7);ctx.stroke();
      }else if(b.pat==='AIR'){
        // Flecha vertical: el boss va a subir y atacar desde arriba.
        ctx.globalAlpha=0.25+0.35*k;ctx.setLineDash([6,10]);
        ctx.beginPath();ctx.moveTo(bx-camX,b.y-bh-camY);ctx.lineTo(bx-camX,b.y-bh-160-camY);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(bx-9-camX,b.y-bh-160-camY+14);ctx.lineTo(bx-camX,b.y-bh-160-camY);ctx.lineTo(bx+9-camX,b.y-bh-160-camY+14);ctx.stroke();
      }
      ctx.restore();
      const ptxt=b.pat==='SIG'?(b.sigName||'FIRMA'):(PAT_LABEL[b.pat]||b.pat);
      ctx.save();ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillStyle=b.color;
      ctx.globalAlpha=0.65+0.35*Math.sin(t*18);ctx.fillText(ptxt,bx-camX,top-40-camY);ctx.restore();
      ctx.globalAlpha=1;
    }
    if(b.locked){/* el sello ya se ve en las puertas + HUD del boss */}
    else if(!b.dead){ctx.fillStyle='#888';ctx.font='11px monospace';ctx.fillText('zZ… entra',b.x-28-camX,top-40-camY);}
    ctx.globalAlpha=1;
    if(b.st==='TELE'){ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.strokeRect(bx-(b.sw||b.w)/2-4-camX,top-4-camY,(b.sw||b.w)+8,bh+8);}
    if(b.st==='STUNNED'){
      ctx.fillStyle='#33e6ff';ctx.font='12px monospace';
      for(let i=0;i<3;i++){const sa=t*5+i*2.094;ctx.fillText('★',bx-6+Math.cos(sa)*22-camX,top-8+Math.sin(sa)*6-camY);}
    }
    ctx.fillStyle='#000';ctx.fillRect(bx-30-camX,top-24-camY,60,8);ctx.fillStyle=b.phase2?'#f80':'#f33';ctx.fillRect(bx-30-camX,top-24-camY,60*Math.max(0,b.hp/b.maxhp),8);
    ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(b.type+' '+Math.ceil(Math.max(0,b.hp)),bx-30-camX,top-28-camY);});
  // HUD grande del boss: barra suavizada + fase + racha de fichas
  const hb=activeBoss();
  if(hb&&state==='play'){
    const hx=10,hy=136,hw=260,hh=10;
    ctx.save();
    ctx.fillStyle='#000b';ctx.fillRect(hx-4,hy-20,hw+8,44);
    ctx.font='bold 12px monospace';ctx.fillStyle=hb.color;
    ctx.fillText('BOSS · '+hb.type+(hb.phase2?'  [FASE 2]':'')+(hb.st==='AIR'?'  [AIRE]':''),hx,hy-6);
    ctx.fillStyle='#2a0b12';ctx.fillRect(hx,hy,hw,hh);
    const trail=Math.max(0,Math.min(1,(hb.hpAnim===undefined?hb.hp:hb.hpAnim)/hb.maxhp));
    ctx.fillStyle='#ffffff66';ctx.fillRect(hx,hy,hw*trail,hh);
    ctx.fillStyle=hb.phase2?'#ff9a3d':hb.color;ctx.fillRect(hx,hy,hw*Math.max(0,hb.hp/hb.maxhp),hh);
    ctx.fillStyle='#0008';for(let i=1;i<4;i++)ctx.fillRect(hx+Math.round(hw*i/4),hy,1,hh);
    ctx.font='10px monospace';ctx.fillStyle='#d8d8e8';
    ctx.fillText(Math.ceil(Math.max(0,hb.hp))+' / '+hb.maxhp+' · RACHA x'+noteCombo,hx,hy+24);
    ctx.restore();
  }
  // estelas de la embestida/esquiva del boss
  fx.forEach(f=>{
    if(f.kind!=='bossghost')return;
    const a=Math.max(0,f.t/f.max);
    if(!Assets.drawSheet(f.spr,0,f.x,f.y,f.sw,f.sh,{hue:f.hue,alpha:a*0.3,flip:f.face})){ctx.globalAlpha=a*0.25;R(f.x-f.sw/2,f.y-f.sh,f.sw,f.sh,f.color||'#f66');ctx.globalAlpha=1;}
  });
  // muerte del boss: disolución con eco ascendente
  fx.forEach(f=>{
    if(f.kind!=='death')return;
    const k=Math.max(0,f.t/f.max),rise=(1-k)*46,sc=1+(1-k)*0.35;
    if(!Assets.drawSheet(f.spr,Math.floor((1-k)*10),f.x,f.y-rise,f.sw*sc,f.sh*sc,{hue:f.hue,white:k>0.82,alpha:Math.min(1,k*1.5),flip:f.face})){
      ctx.globalAlpha=Math.min(1,k*1.5);R(f.x-f.sw*sc/2,f.y-f.sh*sc-rise,f.sw*sc,f.sh*sc,f.color||'#f66');ctx.globalAlpha=1;
    }
  });
  pProj.forEach(p=>{
    const px=Math.round(p.x-camX),py=Math.round(p.y-camY),dir=p.vx<0?-1:1;
    if(p.kind==='wave'){
      const rr=p.big?22:14;
      ctx.save();ctx.translate(px,py);ctx.scale(dir,1);
      ctx.strokeStyle=p.big?'#d18aff':'#b34dff';ctx.lineWidth=p.big?5:3;ctx.beginPath();ctx.arc(0,0,rr,-1.25,1.25);ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,rr-4,-1.1,1.1);ctx.stroke();
      ctx.restore();
    }else{
      if(p.rb){ctx.fillStyle='rgba(255,217,51,0.25)';ctx.fillRect(px-10,py-1,20,3);}
      else{ctx.fillStyle='rgba(255,217,51,0.22)';ctx.fillRect(px-dir*20-2,py-2,20,4);}
      ctx.fillStyle='#ffd933';ctx.fillRect(px-4,py-3,8,6);
      ctx.fillStyle='#fff';ctx.fillRect(px-2,py-1,4,2);
    }
  });
  // bullet-hell: color del jefe, estela y formas distintas por ataque
  eProj.forEach(p=>{
    const px=p.x-camX,py=p.y-camY;
    if(p.hole){
      ctx.save();ctx.translate(px,py);ctx.rotate(performance.now()/420);
      ctx.strokeStyle='#b4f';ctx.lineWidth=3;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,16+i*5+Math.sin(performance.now()/110+i)*2,i*2.094,i*2.094+1.4);ctx.stroke();}
      ctx.strokeStyle='#33cc66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,11+3*Math.sin(performance.now()/70),0,7);ctx.stroke();
      ctx.restore();
    }else{
      const r=Math.max(4,(p.w||16)*0.42),col=p.col||(p.hell?'#ff2255':'#f6c');
      ctx.strokeStyle=col;ctx.globalAlpha=0.35;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-p.vx*0.035,py-p.vy*0.035);ctx.stroke();ctx.globalAlpha=1;
      if(p.fuse!==undefined){
        const pu=1+0.22*Math.sin(performance.now()/90);
        ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,r*1.45*pu,0,7);ctx.fill();
        ctx.strokeStyle='#fff';ctx.globalAlpha=0.75;ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,r*1.15,0,7);ctx.stroke();
        ctx.globalAlpha=0.55;ctx.beginPath();ctx.arc(px,py,r*1.9,-1.57,-1.57+6.283*Math.max(0,1-p.fuse/0.85));ctx.stroke();ctx.globalAlpha=1;
      }else if(p.ground){
        ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(px,py,r*1.5,r*0.8,0,0,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px-2,py-2,r*0.5,r*0.3,0,0,7);ctx.fill();
      }else{
        ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,r*0.38,0,7);ctx.fill();
      }
    }
  });
  // Autopista piano-tiles: 4 carriles que caen sobre las cajas 1-4; aparece/desvanece con noteVis
  if(noteVis>0.01&&player){
    const nowS=performance.now()/1000,sinceKick=nowS-Rhythm.lastKick,vv=noteVis,win=noteLimit();
    for(let i=0;i<4;i++){const lx=HW_X[i];
      ctx.fillStyle='rgba(255,255,255,'+(0.045*vv).toFixed(3)+')';ctx.fillRect(lx-22,HW_Y0-14,44,HW_HIT-HW_Y0+24);
      ctx.fillStyle=NOTE_COLORS[i];ctx.globalAlpha=0.5*vv;ctx.fillRect(lx-22,HW_HIT-1,44,2);ctx.globalAlpha=1;}
    // Banda + línea de golpe: destella en cada BOMBO (cue visual)
    ctx.fillStyle='rgba(255,255,255,'+(0.06*vv).toFixed(3)+')';ctx.fillRect(HW_X[0]-30,HW_HIT-12,(HW_X[3]-HW_X[0])+60,24);
    const flash=sinceKick<0.15?1-sinceKick/0.15:0;
    ctx.fillStyle='#fff';ctx.globalAlpha=vv*(0.35+0.65*flash);ctx.fillRect(HW_X[0]-30,HW_HIT-1,(HW_X[3]-HW_X[0])+60,2);ctx.globalAlpha=1;
    for(const n of notes){
      if(n.dead)continue;
      const px=n.x,py=n.y,c=NOTE_COLORS[n.key];
      if(py<-24||py>560)continue;
      const tLeft=n.tHit-nowS;
      if(tLeft>0&&tLeft<0.6){const ar=16+tLeft*100;ctx.strokeStyle=c;ctx.globalAlpha=Math.max(0,0.5-tLeft*0.6)*vv;ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,ar,0,7);ctx.stroke();ctx.globalAlpha=1;}
      if(sinceKick<0.12){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.globalAlpha=vv;ctx.beginPath();ctx.arc(px,py,17,0,7);ctx.stroke();}
      const near=tLeft<win&&tLeft>-win;
      if(near){ctx.shadowColor=c;ctx.shadowBlur=12;}
      ctx.globalAlpha=vv;
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(px,py-13);ctx.lineTo(px+13,py);ctx.lineTo(px,py+13);ctx.lineTo(px-13,py);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#000';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(String(n.key+1),px,py+5);ctx.textAlign='left';
      ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py-13);ctx.lineTo(px+13,py);ctx.lineTo(px,py+13);ctx.lineTo(px-13,py);ctx.closePath();ctx.stroke();
      ctx.globalAlpha=1;
    }
  }
  // estela del dash (fantasmas detrás del jugador)
  fx.forEach(f=>{
    if(f.kind!=='ghost')return;
    const a=Math.max(0,f.t/f.max);
    if(Assets.ok('player'))Assets.draw('player',f.x,f.y,26,34,f.face<0,{alpha:a*0.35,hue:190});
    else{ctx.globalAlpha=a*0.3;R(f.x-12,f.y-32,24,32,'#33e6ff');ctx.globalAlpha=1;}
  });
  // player: sprite Kenney (casco) o fallback procedural · bob al andar + squash al aterrizar
  if(deadT<=0&&player){
    const hurt=(player.hurtT||0)>0;
    const blink=iframes>0&&!hurt&&Math.floor(performance.now()/60)%2;
    const c=blink?'#88f':'#33e6ff';
    const recoil=hurt?player.hurtDir*5:0;
    const white=hurt&&((player.hurtT||0)>0.26||Math.floor(performance.now()/55)%2===0);
    const land=player.landT||0,sx=1+land*0.55,sy=1-land*0.75;
    const walk=player.onFloor&&Math.abs(player.vx)>40?Math.sin(performance.now()/85)*1.3:0;
    if(dashT>0){R(player.x-12-player.face*20+recoil,player.y-32,20,32,'#8ff8');}
    if(Assets.ok('player')){
      if(blink)ctx.globalAlpha=0.35;
      Assets.draw('player',player.x+recoil,player.y+walk,26,34,player.face<0,{white,sx,sy});
      ctx.globalAlpha=1;
    }else{
      R(player.x-12+recoil,player.y-32*sy,24*sx,32*sy,white?'#fff':c);R(player.x-12+recoil,player.y-32*sy,24*sx,5,'#1a8aaa');
      R(player.x+(player.face>0?2:-9)+recoil,player.y-24,7,6,'#fff');R(player.x+(player.face>0?4:-7)+recoil,player.y-23,3,4,'#000');
      R(player.x-12+recoil,player.y-6,24,6,'#224'); // botas
    }
    if(hurt){ctx.strokeStyle='rgba(255,85,119,'+(0.8*(player.hurtT/0.34)).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x-camX,player.y-16-camY,20+(0.34-player.hurtT)*40,0,7);ctx.stroke();}
  }
  parts.forEach(p=>{
    if(p.ring){
      ctx.strokeStyle=p.c||'#fff';ctx.globalAlpha=Math.max(0,Math.min(1,(p.t||0.4)*2.2));ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(p.x-camX,p.y-camY,p.r||10,0,7);ctx.stroke();ctx.globalAlpha=1;
    }else R(p.x-3,p.y-3,6,6,p.c);
  });
  ctx.fillStyle='#fff';ctx.font='13px monospace';
  floaters.forEach(f=>{ctx.fillStyle=f.c;ctx.fillText(f.txt,f.x-camX,f.y-camY);});
  if(player){
    const wNow=WEAPONS[wi];
    if(swingT>0&&swingKind==='melee'){
      const pr=1-swingT/0.16,rad=36+comboIdx*6;
      ctx.save();ctx.translate(player.x-camX,player.y-20-camY);ctx.scale(player.face,1);
      const a0=-1.15+pr*1.5,a1=a0+0.85;
      ctx.strokeStyle=wNow.color;ctx.globalAlpha=0.85*(swingT/0.16);ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,rad,a0,a1);ctx.stroke();
      ctx.strokeStyle='#fff';ctx.globalAlpha=0.9*(swingT/0.16);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,rad-3,a0,a1);ctx.stroke();
      ctx.restore();ctx.globalAlpha=1;
    }else if(swingT>0){
      const k=swingT/0.16,px=player.x+player.face*24-camX,py=player.y-18-camY;
      ctx.fillStyle=wNow.color;ctx.globalAlpha=k;ctx.beginPath();ctx.arc(px,py,6+6*(1-k),0,7);ctx.fill();ctx.globalAlpha=1;
    }
    if(switchT>0){
      const k=1-switchT/0.25;
      ctx.strokeStyle=wNow.color;ctx.globalAlpha=switchT/0.25;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(player.x-camX,player.y-20-camY,26+k*24,0,7);ctx.stroke();ctx.globalAlpha=1;
    }
  }
  // cartel de zona al cambiar de área
  if(areaT>0&&currentArea>=0){const a=AREAS[currentArea],tx=W/2;ctx.save();ctx.globalAlpha=Math.min(1,areaT);ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillStyle='#e8e2ff';ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.fillText(a.name,tx,38);ctx.font='10px monospace';ctx.fillStyle='#9a94b8';ctx.fillText('— ZONA '+(currentArea+1)+' / '+AREAS.length+' —',tx,54);ctx.restore();}
  // banner central animado (lock-in, fase 2, boss caído)
  if(banner){
    const a=Math.min(1,banner.t*3),front=Math.min(1,(banner.max-banner.t)*5),slide=(1-front)*12;
    ctx.save();ctx.textAlign='center';
    ctx.globalAlpha=a*0.85;ctx.fillStyle='#08080fee';ctx.fillRect(W/2-200,136,400,66);
    ctx.globalAlpha=a*0.9;ctx.strokeStyle=banner.col;ctx.lineWidth=1;ctx.strokeRect(W/2-200,136,400,66);
    ctx.globalAlpha=a;ctx.shadowColor=banner.col;ctx.shadowBlur=16;
    ctx.font='bold 24px monospace';ctx.fillStyle=banner.col;ctx.fillText(banner.txt,W/2,172-slide);
    ctx.shadowBlur=0;ctx.font='11px monospace';ctx.fillStyle='#e8e8f0';ctx.fillText(banner.sub,W/2,192-slide);
    ctx.restore();
  }
  // vignette roja al recibir daño
  if(player&&player.hurtT>0){ctx.fillStyle='rgba(255,30,70,'+(0.16*player.hurtT/0.34).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  // flash de pantalla (lock-in / fase 2 / muerte del boss)
  if(flashT>0){ctx.save();ctx.globalAlpha=Math.min(0.4,flashT);ctx.fillStyle=flashCol;ctx.fillRect(0,0,W,H);ctx.restore();}
  camX-=shx;camY-=shy;
}
// ---------- FINAL: cinemática en canvas (historia + créditos) ----------
function endingFade(t,from,to){
  return Math.max(0,Math.min(1,(t-from)/0.55,(to-t)/0.55));
}
function endingCreditsHeight(){
  let h=0;
  for(const c of ENDING_CREDITS)h+=c.k==='title'?44:c.k==='role'?20:c.k==='gap'?14:22;
  return h;
}
function drawEndingCredits(et){
  const cx=W/2,h=endingCreditsHeight();
  let y=H-30-et*ENDING_CREDIT_SPEED;
  ctx.textAlign='center';
  for(const c of ENDING_CREDITS){
    if(c.k==='title'){
      if(y>-60&&y<H+30){ctx.globalAlpha=Math.min(1,et/0.7);ctx.fillStyle='#ffd933';ctx.font='bold 24px monospace';ctx.fillText(c.text,cx,y);}
      y+=44;
    }else if(c.k==='role'){
      if(y>-20&&y<H+20){ctx.globalAlpha=0.9;ctx.fillStyle='#33e6ff';ctx.font='bold 10px monospace';ctx.fillText(c.text,cx,y);}
      y+=20;
    }else if(c.k==='gap'){
      y+=14;
    }else{
      if(y>-20&&y<H+20){ctx.globalAlpha=0.95;ctx.fillStyle='#e8e8f0';ctx.font='15px monospace';ctx.fillText(c.text,cx,y);}
      y+=22;
    }
  }
  // desvanecido en los bordes para que el rollo entre/salga limpio
  const top=ctx.createLinearGradient(0,0,0,90);
  top.addColorStop(0,'#05050a');top.addColorStop(1,'rgba(5,5,10,0)');
  ctx.globalAlpha=1;ctx.fillStyle=top;ctx.fillRect(0,0,W,90);
  const bot=ctx.createLinearGradient(0,H-64,0,H);
  bot.addColorStop(0,'rgba(5,5,10,0)');bot.addColorStop(0.55,'#05050a');bot.addColorStop(1,'#05050a');
  ctx.fillStyle=bot;ctx.fillRect(0,H-64,W,64);
  ctx.globalAlpha=Math.min(1,et/0.7);
  ctx.fillStyle='#33e6ff';ctx.font='bold 11px monospace';ctx.fillText('CRÉDITOS',cx,54);
  // Cierre tras pasar todas las líneas
  const total=(H+50+h)/ENDING_CREDIT_SPEED;
  if(et>total+1.2){
    const a=Math.min(1,et-total-1.2);
    ctx.globalAlpha=a;
    ctx.fillStyle='#ffd933';ctx.font='bold 38px monospace';ctx.fillText('FIN',cx,H*0.43);
    ctx.fillStyle='#8a93a6';ctx.font='13px monospace';ctx.fillText('El Vacío vuelve a latir.',cx,H*0.43+32);
  }
  ctx.globalAlpha=1;
}
function drawEnding(){
  const t=endingT,cx=W/2,cy=H*0.52,sy=H*0.20;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha=1;
  ctx.fillStyle='#05050a';ctx.fillRect(0,0,W,H);
  // polvo de ecos: estrellas con parallax + destellos
  for(let i=0;i<90;i++){
    const z=0.25+((i*37)%7)/7*0.85;
    const x=((i*137.31+t*5*z)%W+W)%W;
    const y=((i*89.73-t*9*z)%H+H)%H;
    const tw=0.5+0.5*Math.sin(t*1.4+i);
    ctx.globalAlpha=0.12+0.4*z*(0.35+0.65*tw);
    ctx.fillStyle=i%9===0?'#ffd933':i%5===0?'#b34dff':'#9df';
    ctx.fillRect(x,y,z>0.8?2:1,z>0.8?2:1);
  }
  // sigilo central: anillos y partículas en órbita
  const oa=Math.min(1,t/0.8)*(t>=ENDING_CREDITS_AT?Math.max(0,1-(t-ENDING_CREDITS_AT)/1.6):1);
  if(oa>0){
    ctx.strokeStyle='#33e6ff';ctx.lineWidth=1.5;
    for(let i=0;i<4;i++){
      const r=38+i*24+Math.sin(t*1.3+i)*4;
      ctx.globalAlpha=oa*(0.35-i*0.06);
      ctx.beginPath();ctx.arc(cx,sy,r,t*0.22+i*1.2,t*0.22+i*1.2+2.2);ctx.stroke();
    }
    for(let i=0;i<20;i++){
      const a=t*0.45+i*0.314,r=54+((i*23)%44)+Math.sin(t*2+i)*6;
      const px=cx+Math.cos(a)*r,py=sy+Math.sin(a)*r*0.7;
      ctx.globalAlpha=oa*(0.25+0.35*(0.5+0.5*Math.sin(t*3+i)));
      ctx.fillStyle=i%3===0?'#ffd933':'#33e6ff';
      ctx.fillRect(px-1,py-1,2,2);
    }
    ctx.globalAlpha=oa*0.6;ctx.strokeStyle='#e8e2ff';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,sy,36+Math.sin(t*2)*3,0,7);ctx.stroke();
  }
  ctx.textAlign='center';
  if(t<ENDING_CREDITS_AT){
    for(const s of ENDING_STORY){
      if(t<s.from||t>s.to)continue;
      const a=endingFade(t,s.from,s.to);if(a<=0)continue;
      ctx.globalAlpha=a;
      ctx.fillStyle='#33e6ff';ctx.font='bold 11px monospace';
      ctx.fillText(s.title,cx,cy-58);
      ctx.fillStyle='#e8e2ff';ctx.font='bold 22px monospace';
      ctx.fillText(s.lines[0],cx,cy-8);
      ctx.fillStyle='#9a94b8';ctx.font='13px monospace';
      for(let i=1;i<s.lines.length;i++)ctx.fillText(s.lines[i],cx,cy+22+(i-1)*20);
    }
  }else{
    drawEndingCredits(t-ENDING_CREDITS_AT);
  }
  ctx.globalAlpha=Math.min(0.7,0.25+t*0.1);ctx.fillStyle='#7f8797';ctx.font='11px monospace';
  ctx.fillText(t>=ENDING_CREDITS_AT?'Enter / Esc / clic · volver al título':'Enter / Esc / clic · saltar a créditos',cx,H-22);
  if(t<1){ctx.globalAlpha=1-t;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);}
  ctx.restore();
}
function drawMinimap(){
  const m=$('minimap').getContext('2d');m.clearRect(0,0,240,28);m.fillStyle='#111';m.fillRect(0,0,240,28);
  ARENAS.forEach(a=>{m.fillStyle='#333';m.fillRect(a[0]/WORLD_W*240,0,1,28);});
  CHECKPOINTS.forEach(c=>{m.fillStyle='#3a3';m.fillRect(c.x/WORLD_W*240,18,2,6);});
  bosses.forEach(b=>{m.fillStyle=b.dead?'#555':'#f44';m.fillRect(b.x/WORLD_W*240,8,5,5);});
  if(player){m.fillStyle='#3f9';m.fillRect(player.x/WORLD_W*240,6,4,8);}
}
