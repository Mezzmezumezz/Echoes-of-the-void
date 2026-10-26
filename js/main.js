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
  // Tras los créditos, Jugar inicia un ciclo nuevo (conserva skills/ecos).
  const newCycle=!!S.endingSeen;
  if(newCycle){
    S.bosses={};S.locks={};S.shards={};S.checkpoint='start';S.shade=null;S.endingSeen=false;save();
  }
  showOverlay('menu',false);showOverlay('pause',false);state='play';resetWorld();Rhythm.rebase();
  if(newCycle&&!skillOnly)showBanner('NUEVO CICLO','El Vacío vuelve a latir','#ffd933',2.2);
  if(skillOnly){openSkill();return;}
  if(!S.howDone)openHow();
}
function bindUI(){
  $('btnPlay').onclick=()=>startGame(false);
  $('btnResume').onclick=resumeGame;
  $('btnSkillMenu').onclick=()=>{startGame(true);};
  $('btnSkillPause').onclick=()=>{openSkill();};
  $('btnMenu').onclick=()=>{save();state='menu';showOverlay('pause',false);showOverlay('skill',false);showOverlay('how',false);skillOpen=false;tutHowOpen=false;showOverlay('menu',true);};
  $('btnCloseSkill').onclick=closeSkill;
  $('btnHow').onclick=openHow;
  $('btnCloseHow').onclick=closeHow;
  $('btnWipe').onclick=()=>{localStorage.removeItem(SAVE_KEY);location.reload();};
  document.querySelectorAll('.dsect').forEach(el=>{el.onclick=()=>setDifficulty(el.dataset.d);el.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();setDifficulty(el.dataset.d);}};});
  document.querySelectorAll('.pkey').forEach(el=>{el.onclick=()=>Piano.press(Number(el.dataset.k));});
  document.querySelectorAll('.lane').forEach(el=>{el.onclick=()=>{const k=Number(el.dataset.k);flashLane(k,hitNote(k,false));};});
  $('game').onpointerdown=()=>{
    if(state==='ending'){endingAdvance();return;}
    if(state==='play'&&!Piano.active&&!skillOpen&&!tutHowOpen){attack();hitNote(null,true);} // clic = atacar + romper ficha (los overlays tapan el canvas)
  };
}
bindUI();markDiff();syncWeapon();initSlide();resetWorld();Rhythm.rebase();
// ---------- PANTALLA DE TITULO: solo se sale con el slider (initSlide en ui.js) ----------
// Sin auto-dismiss: así el primer gesto no puede filtrarse al juego ni saltear el slider.
// El primer clic/tecla igual desbloquea la música vía unlockOnce.
let titleDone=false;
function dismissTitle(){
  if(titleDone)return;titleDone=true;
  $('title').classList.add('hidden');
  showOverlay('menu',true);
  try{if(typeof Music!=='undefined')Music.unlock();}catch(e){}
}
 // Autoplay: la musica solo puede sonar tras un gesto. El primer clic/tecla
// desbloquea y arranca la pista de menu (pantalla de carga).
function unlockOnce(){try{if(typeof Music!=='undefined')Music.unlock();}catch(e){}removeEventListener('pointerdown',unlockOnce);removeEventListener('keydown',unlockOnce);}
addEventListener('pointerdown',unlockOnce);addEventListener('keydown',unlockOnce);
try{if(typeof Music!=='undefined')Music.init();}catch(e){}
requestAnimationFrame(loop);
