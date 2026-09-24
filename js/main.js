// js/main.js — loop, boot (con error visible, no catch silencioso)
'use strict';
let lastT=performance.now();
function loop(t){
  const rdt=Math.min(0.05,(t-lastT)/1000);lastT=t;
  try{update(rdt);draw();}
  catch(err){console.error('[web-echoes]',err);const h=$('hint');if(h&&!window.__echoErr){window.__echoErr=true;h.textContent='Error: '+err.message+' (F12 consola)';}}
  requestAnimationFrame(loop);
}
function startGame(skillOnly){
  try{ac();}catch(e){}
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
requestAnimationFrame(loop);
