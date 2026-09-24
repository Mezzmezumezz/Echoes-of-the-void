// js/ui.js — piano, skills, pausa, rueda, dificultad, input (fixes Esc + J)
'use strict';
// ---------- PIANO ----------
const Piano={active:false,seq:[],idx:0,mode:null,ref:null,
  start(mode,ref,n){this.active=true;this.mode=mode;this.ref=ref;this.idx=0;this.seq=Array.from({length:n},()=>Math.floor(Math.random()*4));
    $('piano').classList.remove('hidden');$('pianoTitle').textContent=mode==='shade'?'Sombra: recupera '+ref.echoes+' ◈':'Lock: '+ref.id;this.prog();this.light();},
  prog(){$('pianoProg').textContent=(this.idx)+' / '+this.seq.length;},
  light(){document.querySelectorAll('.pkey').forEach(k=>k.classList.remove('lit'));const k=document.querySelector('.pkey[data-k="'+this.seq[this.idx]+'"]');if(k){setTimeout(()=>{if(this.active)k.classList.add('lit');},150);}},
  press(k){if(!this.active)return;document.querySelectorAll('.pkey').forEach(x=>x.classList.remove('lit'));
    const ev=Rhythm.evaluate();let ok=(k===this.seq[this.idx]);
    if(this.mode==='shade')ok=ok&&ev.r!=='MISS';
    beep(ok?1100:200,0.1,0.2);
    if(!ok){if(this.mode==='lock'){this.idx=0;this.prog();this.light();}else{this.fail();}return;}
    this.idx++;this.prog();
    if(this.idx>=this.seq.length)this.win();else this.light();},
  win(){beep(1320,0.3,0.2);this.active=false;$('piano').classList.add('hidden');
    if(this.mode==='shade'){S.echoes+=echoGain(this.ref.echoes);S.shade=null;}
    else{S.echoes+=echoGain(this.ref.reward);S.locks[this.ref.id]=true;locks=locks.filter(l=>l.id!==this.ref.id);}
    save();},
  fail(){this.active=false;$('piano').classList.add('hidden');if(this.mode==='shade'){S.shade=null;save();}}
};
// Devuelve true si consumió la tecla (abrió piano) -> el llamador NO debe atacar
function tryInteract(){
  if(Piano.active||skillOpen||tutHowOpen||state!=='play')return false;
  if(S.shade&&Math.abs(S.shade.x-player.x)<60){Piano.start('shade',S.shade,6);return true;}
  const L=locks.find(l=>Math.abs(l.x-player.x)<60);
  if(L){Piano.start('lock',L,L.notes);return true;}
  return false;
}

// ---------- SKILL / PAUSA / RUEDA / DIFICULTAD ----------
function renderSkills(){
  $('skillEchoes').textContent=S.echoes+' ◈';const g=$('skillGrid');g.innerHTML='';
  SKILLS.forEach(sk=>{const has=!!S.skills[sk.id];const reqOk=sk.req.every(r=>S.skills[r]);const can=!has&&reqOk&&S.echoes>=sk.cost;
    const d=document.createElement('div');d.className='scard '+(has?'ok':can?'av':'lock');
    d.innerHTML='<b>'+sk.name+'</b><br>'+sk.desc+'<br>Coste: '+sk.cost+(sk.req.length?'<br>Req: '+sk.req.join(','):'');
    if(!has){const b=document.createElement('button');b.textContent=can?'Comprar':'Bloqueado';b.disabled=!can;b.onclick=()=>{S.echoes-=sk.cost;S.skills[sk.id]=true;if(sk.id.startsWith('hp_'))player.hp=maxHP();save();renderSkills();beep(880,0.12,0.2);};d.appendChild(b);}
    g.appendChild(d);});
  ['boss_ricochet','boss_blackhole','boss_teleport','boss_clone'].forEach(id=>{if(S.skills[id]){const d=document.createElement('div');d.className='scard ok';d.innerHTML='<b>'+id+'</b><br>Recompensa de boss';g.appendChild(d);}});
}
function openSkill(){if(Piano.active||tutHowOpen||state!=='play')return;skillOpen=true;renderSkills();$('skill').classList.remove('hidden');if(wheelOpen)closeWheel();}
function closeSkill(){skillOpen=false;$('skill').classList.add('hidden');}
function pauseGame(){if(state!=='play'||tutHowOpen)return;state='pause';if(wheelOpen)closeWheel();$('pause').classList.remove('hidden');}
function resumeGame(){if(state!=='pause')return;state='play';$('pause').classList.add('hidden');}
function openWheel(){if(skillOpen||state!=='play'||tutHowOpen)return;wheelOpen=true;$('wheel').classList.remove('hidden');markWheel();}
function closeWheel(){wheelOpen=false;$('wheel').classList.add('hidden');}
function markWheel(){document.querySelectorAll('.wsect').forEach(el=>el.classList.toggle('sel',Number(el.dataset.w)===wi));$('weapon').textContent=WEAPONS[wi].name+' · '+diff().name;}
function cycleWeapon(d){wi=(wi+d+3)%3;markWheel();beep(500+wi*150,0.06,0.12);}
function flashLane(k){const el=document.querySelector('.lane[data-k="'+k+'"]');if(!el)return;el.classList.add('lit');setTimeout(()=>el.classList.remove('lit'),150);beep(660+k*165,0.06,0.08);}
function markLanes(){
  const ab=activeBoss&&state==='play'?activeBoss():null;
  const box=$('lanes');if(box)box.classList.toggle('on',!!ab);
  if(!ab)return;
  for(let k=0;k<4;k++){
    const el=document.querySelector('.lane[data-k="'+k+'"]');if(!el)continue;
    let near=false;
    for(const n of notes){if(n.key!==k)continue;
      if(Math.hypot(player.x-n.x,(player.y-16)-n.y)<NOTE_HIT_R){near=true;break;}}
    el.classList.toggle('near',near);
  }
}
function setDifficulty(d){if(!DIFFS[d])return;S.difficulty=d;save();if(player)player.hp=Math.min(player.hp,maxHP());markDiff();markWheel();beep(700,0.1,0.15);}
function markDiff(){document.querySelectorAll('.dsect').forEach(el=>el.classList.toggle('sel',el.dataset.d===S.difficulty));const dl=$('difflabel');if(dl)dl.textContent='Dificultad: '+diff().name;}

// ---------- TUTORIAL SIMPLE ----------
let tutHowOpen=false;
function openHow(){tutHowOpen=true;$('how').classList.remove('hidden');if(wheelOpen)closeWheel();}
function closeHow(){tutHowOpen=false;$('how').classList.add('hidden');if(!S.howDone){S.howDone=true;save();}}

// ---------- INPUT (FIX Esc + FIX J) ----------
const keys={};let qDownT=0,qHeld=false,wheelOpen=false,qTimer=null;
function onKeyDown(e){
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
  if(e.code==='KeyQ'){qDownT=performance.now();qHeld=false;
    if(qTimer)clearTimeout(qTimer);
    qTimer=setTimeout(()=>{if(keys['KeyQ']&&state==='play'&&!skillOpen){openWheel();}},350);return;}
  // FIX: J interactúa O ataca, no ambas
  if(e.code==='KeyJ'){const used=tryInteract();if(!used)attack();return;}
  if(e.code==='KeyE'||e.code==='KeyK'){special();return;}
  if(e.code==='ArrowUp'){cycleWeapon(-1);return;}
  if(e.code==='ArrowDown'){cycleWeapon(1);return;}
  if(['Digit1','Digit2','Digit3','Digit4'].includes(e.code)){const k=Number(e.code.slice(5))-1;Piano.press(k);hitNote(k);flashLane(k);return;}
}
function onKeyUp(e){keys[e.code]=false;
  if(e.code==='KeyQ'){if(qTimer){clearTimeout(qTimer);qTimer=null;}
    const held=performance.now()-qDownT;
    if(wheelOpen)closeWheel();
    else if(held<350&&state==='play'&&!skillOpen)cycleWeapon(1);qHeld=false;}
}
addEventListener('keydown',onKeyDown);
addEventListener('keyup',onKeyUp);
