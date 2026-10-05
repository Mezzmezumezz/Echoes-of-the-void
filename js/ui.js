// js/ui.js — piano, skills, pausa, dificultad, input (fixes Esc + J)
'use strict';
// ---------- PIANO ----------
const Piano={active:false,seq:[],idx:0,mode:null,ref:null,
  start(mode,ref,n){this.active=true;this.mode=mode;this.ref=ref;this.idx=0;this.seq=Array.from({length:n},()=>Math.floor(Math.random()*4));
    showOverlay('piano',true);$('pianoTitle').textContent=mode==='shade'?'Sombra: recupera '+ref.echoes+' ◈':'Lock: '+ref.id;this.prog();this.light();},
  prog(){$('pianoProg').textContent=(this.idx)+' / '+this.seq.length;},
  light(){document.querySelectorAll('.pkey').forEach(k=>k.classList.remove('lit'));const k=document.querySelector('.pkey[data-k="'+this.seq[this.idx]+'"]');if(k){setTimeout(()=>{if(this.active)k.classList.add('lit');},150);}},
  press(k){if(!this.active)return;document.querySelectorAll('.pkey').forEach(x=>x.classList.remove('lit'));
    const ev=Rhythm.evaluate();let ok=(k===this.seq[this.idx]);
    if(this.mode==='shade')ok=ok&&ev.r!=='MISS';
    beep(ok?1100:200,0.1,0.2);
    if(!ok){if(this.mode==='lock'){this.idx=0;this.prog();this.light();}else{this.fail();}return;}
    this.idx++;this.prog();
    if(this.idx>=this.seq.length)this.win();else this.light();},
  win(){beep(1320,0.3,0.2);this.active=false;showOverlay('piano',false);
    if(this.mode==='shade'){S.echoes+=echoGain(this.ref.echoes);S.shade=null;}
    else{S.echoes+=echoGain(this.ref.reward);S.locks[this.ref.id]=true;locks=locks.filter(l=>l.id!==this.ref.id);}
    save();},
  fail(){this.active=false;showOverlay('piano',false);if(this.mode==='shade'){S.shade=null;save();}}
};
// Devuelve true si consumió la tecla (abrió piano) -> el llamador NO debe atacar
function tryInteract(){
  if(Piano.active||skillOpen||tutHowOpen||state!=='play')return false;
  if(S.shade&&Math.abs(S.shade.x-player.x)<60){Piano.start('shade',S.shade,6);return true;}
  const L=locks.find(l=>Math.abs(l.x-player.x)<60);
  if(L){Piano.start('lock',L,L.notes);return true;}
  return false;
}

// ---------- SKILL / PAUSA / DIFICULTAD ----------
function renderSkills(){
  $('skillEchoes').textContent=S.echoes+' ◈';const g=$('skillGrid');g.innerHTML='';
  SKILLS.forEach(sk=>{const has=!!S.skills[sk.id];const reqOk=sk.req.every(r=>S.skills[r]);const can=!has&&reqOk&&S.echoes>=sk.cost;
    const d=document.createElement('div');d.className='scard '+(has?'ok':can?'av':'lock');
    d.innerHTML='<b>'+sk.name+'</b><br>'+sk.desc+'<br>Coste: '+sk.cost+(sk.req.length?'<br>Req: '+sk.req.join(','):'');
    if(!has){const b=document.createElement('button');b.textContent=can?'Comprar':'Bloqueado';b.disabled=!can;b.onclick=()=>{S.echoes-=sk.cost;S.skills[sk.id]=true;if(sk.id.startsWith('hp_'))player.hp=maxHP();save();renderSkills();beep(880,0.12,0.2);};d.appendChild(b);}
    g.appendChild(d);});
}
function showOverlay(id,on){const el=$(id);el.classList.toggle('hidden',!on);if(on){const b=el.querySelector('button');if(b)b.focus();}}
function openSkill(){if(Piano.active||tutHowOpen||state!=='play')return;skillOpen=true;renderSkills();showOverlay('skill',true);}
function closeSkill(){skillOpen=false;showOverlay('skill',false);}
function pauseGame(){if(state!=='play'||tutHowOpen)return;state='pause';showOverlay('pause',true);}
function resumeGame(){if(state!=='pause')return;state='play';showOverlay('pause',false);}
function syncWeapon(){$('weapon').textContent=WEAPONS[wi].name+' · '+diff().name;}
function cycleWeapon(d){wi=(wi+d+3)%3;syncWeapon();beep(500+wi*150,0.06,0.12);}
function flashLane(k){const el=document.querySelector('.lane[data-k="'+k+'"]');if(!el)return;el.classList.add('lit');setTimeout(()=>el.classList.remove('lit'),150);beep(660+k*165,0.06,0.08);}
function markLanes(){
  const ab=activeBoss&&state==='play'?activeBoss():null;
  const box=$('lanes');if(box)box.classList.toggle('on',!!ab);
  if(!ab)return;
  const now=performance.now()/1000,win=(diff().good+60)/1000;
  for(let k=0;k<4;k++){
    const el=document.querySelector('.lane[data-k="'+k+'"]');if(!el)continue;
    let near=false;
    for(const n of notes){if(n.key!==k||n.dead)continue;
      if(Math.abs(n.tHit-now)<win){near=true;break;}}
    el.classList.toggle('near',near);
  }
}
function setDifficulty(d){if(!DIFFS[d])return;S.difficulty=d;save();if(player)player.hp=Math.min(player.hp,maxHP());markDiff();syncWeapon();beep(700,0.1,0.15);}
function markDiff(){document.querySelectorAll('.dsect').forEach(el=>{const on=el.dataset.d===S.difficulty;el.classList.toggle('sel',on);el.setAttribute('aria-pressed',on);});const dl=$('difflabel');if(dl)dl.textContent='Dificultad: '+diff().name;}

// ---------- TUTORIAL SIMPLE ----------
let tutHowOpen=false;
function openHow(){tutHowOpen=true;showOverlay('how',true);}
function closeHow(){tutHowOpen=false;showOverlay('how',false);if(!S.howDone){S.howDone=true;save();}}

// ---------- SLIDE TO START (pantalla de título, homenaje a SlideCommit) ----------
// Sin dependencias: pointer events + teclado (flechas/Enter/End), commit -> dismissTitle().
function initSlide(){
  const sc=$('slideStart');if(!sc||sc.dataset.ready)return;sc.dataset.ready='1';
  const handle=sc.querySelector('.sc-handle'),fill=sc.querySelector('.sc-fill');
  let x=0,drag=null,done=false;
  const grip=()=>handle.offsetWidth,TRAVEL=()=>Math.max(1,sc.clientWidth-8-grip());
  const set=v=>{x=Math.max(0,Math.min(TRAVEL(),v));handle.style.left=(4+x)+'px';fill.style.width=(x+grip())+'px';sc.setAttribute('aria-valuenow',String(Math.round(x/TRAVEL()*100)));};
  const home=()=>{sc.classList.add('anim');set(0);setTimeout(()=>sc.classList.remove('anim'),280);};
  const commit=()=>{if(done)return;done=true;sc.classList.add('anim','done');set(TRAVEL());handle.textContent='✓';beep(880,0.12,0.2);setTimeout(dismissTitle,450);};
  sc.addEventListener('pointerdown',e=>{if(done||e.button!==0)return;e.preventDefault();sc.classList.remove('anim');drag={id:e.pointerId,grab:(e.clientX-sc.getBoundingClientRect().left)-x};try{sc.setPointerCapture(e.pointerId);}catch(_){}});
  sc.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;set(e.clientX-sc.getBoundingClientRect().left-drag.grab);});
  const up=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;if(x>=TRAVEL()*0.98)commit();else home();};
  sc.addEventListener('pointerup',up);sc.addEventListener('pointercancel',up);
  sc.addEventListener('keydown',e=>{
    const step=TRAVEL()/10;
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();sc.classList.remove('anim');set(x+step);if(x>=TRAVEL())commit();}
    else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();set(x-step);}
    else if(e.key==='Enter'||e.key==='End'){e.preventDefault();commit();}
    else if(e.key==='Home'||e.key==='Escape'){e.preventDefault();home();}
  });
  set(0);
  try{sc.focus({preventScroll:true});}catch(_){try{sc.focus();}catch(_){}}
}

// ---------- INPUT (FIX Esc + FIX J) ----------
const keys={};
function onKeyDown(e){
  const t=$('title');if(t&&!t.classList.contains('hidden'))return; // el slider gestiona sus teclas
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.repeat)return;keys[e.code]=true;try{ac();}catch(_){}
  if(e.code==='Space'||e.code==='KeyW')jbuf=0.12;
  // Tutorial simple: se cierra con Enter/J/Espacio/Esc
  if(tutHowOpen){
    if(['Enter','KeyJ','Space','Escape'].includes(e.code)){closeHow();}
    return;
  }
  // FIX: Esc funciona en play/pause/skill, antes del early-return
  if(e.code==='Escape'){
    if(Piano.active)return;
    if(skillOpen){closeSkill();return;}
    if(state==='play'){pauseGame();return;}
    if(state==='pause'){resumeGame();return;}
    return;
  }
  if(state!=='play'){if(e.code==='Enter'&&state==='menu')startGame();return;}
  if(e.code==='KeyT'){skillOpen?closeSkill():openSkill();return;}
  if(e.code==='KeyH'){S.showDmg=(S.showDmg===false);save();beep(700,0.08,0.12);
    if(player)floaters.push({x:player.x,y:player.y-70,txt:S.showDmg?'Números: ON':'Números: OFF',t:1,c:'#fff'});
    return;}
  if(e.code==='KeyQ'){if(state==='play'&&!skillOpen)cycleWeapon(1);return;}
  // FIX: J interactúa O ataca, no ambas
  if(e.code==='KeyJ'){const used=tryInteract();if(!used)attack();return;}
  if(e.code==='KeyE'||e.code==='KeyK'){special();return;}
  // Carriles: 1-4 o Z-X-C-V (fila inferior, mano izquierda). Vale para notas de boss y piano de locks.
  const laneKey={Digit1:0,Digit2:1,Digit3:2,Digit4:3,KeyZ:0,KeyX:1,KeyC:2,KeyV:3}[e.code];
  if(laneKey!==undefined){Piano.press(laneKey);hitNote(laneKey);flashLane(laneKey);return;}
}
function onKeyUp(e){keys[e.code]=false;}
addEventListener('keydown',onKeyDown);
addEventListener('keyup',onKeyUp);
