// js/main.js — loop, boot (con error visible, no catch silencioso)
'use strict';
let lastT=performance.now();
function loop(t){
  const rdt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  try{update(rdt);draw();if(typeof updateMusic==='function')updateMusic();}
  catch(err){console.error('[web-echoes]',err);const h=$('hint');if(h&&!window.__echoErr){window.__echoErr=true;h.textContent='Error: '+err.message+' (F12 consola)';}}
  requestAnimationFrame(loop);
}
function startGame(skillOnly){
  try{ac();}catch(e){}
  try{if(typeof Music!=='undefined')Music.unlock();}catch(e){}
  $('title').classList.add('hidden');titleDone=true;
  $('menu').classList.add('hidden');$('pause').classList.add('hidden');state='play';resetWorld();Rhythm.rebase();
  if(skillOnly){openSkill();return;}
  if(!S.howDone)openHow();
}
function bindUI(){
  $('btnPlay').onclick=()=>startGame(false);
  $('btnResume').onclick=resumeGame;
  $('btnSkillMenu').onclick=()=>{startGame(true);};
  $('btnSkillPause').onclick=()=>{openSkill();};
  $('btnMenu').onclick=()=>{save();state='menu';$('pause').classList.add('hidden');$('skill').classList.add('hidden');$('how').classList.add('hidden');skillOpen=false;tutHowOpen=false;$('menu').classList.remove('hidden');};
  $('btnCloseSkill').onclick=closeSkill;
  $('btnHow').onclick=openHow;
  $('btnCloseHow').onclick=closeHow;
  $('btnWipe').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};
  document.querySelectorAll('.wsect').forEach(el=>{el.onclick=()=>{wi=Number(el.dataset.w);markWheel();closeWheel();};});
  document.querySelectorAll('.dsect').forEach(el=>{el.onclick=()=>setDifficulty(el.dataset.d);});
  document.querySelectorAll('.pkey').forEach(el=>{el.onclick=()=>Piano.press(Number(el.dataset.k));});
  document.querySelectorAll('.lane').forEach(el=>{el.onclick=()=>{const k=Number(el.dataset.k);hitNote(k);flashLane(k);};});
}
bindUI();markDiff();markWheel();resetWorld();Rhythm.rebase();
// ---------- PANTALLA DE TITULO previa al menu ----------
// Sale con cualquier clic o tecla, muestra el menu principal y desbloquea la musica.
// Usa captura para tragarse ese primer gesto (no arranca el juego con Enter ni atraviesa clics).
let titleDone=false;
function dismissTitle(){
  if(titleDone)return;titleDone=true;
  $('title').classList.add('hidden');
  $('menu').classList.remove('hidden');
  try{if(typeof Music!=='undefined')Music.unlock();}catch(e){}
}
addEventListener('pointerdown',e=>{if(!titleDone){e.stopPropagation();dismissTitle();}},true);
addEventListener('keydown',e=>{if(!titleDone){e.stopPropagation();e.preventDefault();dismissTitle();}},true);
// Autoplay: la musica solo puede sonar tras un gesto. El primer clic/tecla
// desbloquea y arranca la pista de menu (pantalla de carga).
function unlockOnce(){try{if(typeof Music!=='undefined')Music.unlock();}catch(e){}removeEventListener('pointerdown',unlockOnce);removeEventListener('keydown',unlockOnce);}
addEventListener('pointerdown',unlockOnce);addEventListener('keydown',unlockOnce);
try{if(typeof Music!=='undefined')Music.init();}catch(e){}
requestAnimationFrame(loop);
