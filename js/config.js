// js/config.js — datos y constantes (sin lógica). Classic script, funciona con file://
'use strict';
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const W=960,H=540,WORLD_W=9500,GROUND_TOP=868;
const $=id=>document.getElementById(id);

const WEAPONS=[
 {name:'PulseBlade',base:26,range:70,cd:0.22,box:[60,36],cost:25,esp:55,color:'#33e6ff'},
 {name:'VoidWave',base:20,range:420,cd:0.38,box:[90,24],cost:30,esp:48,color:'#b34dff'},
 {name:'EchoShot',base:14,range:700,cd:0.14,box:[22,12],cost:35,esp:48,color:'#ffd933'}];
const EFFECT={
 PulseBlade:{Resonator:1.6,BassTitan:0.7,ChoirWarden:1.0,VoidHarvester:0.9,EchoPrime:1.2,EchoPrimordial:1.4,Slime:1.2},
 VoidWave:{Resonator:0.8,BassTitan:1.6,ChoirWarden:1.0,VoidHarvester:1.5,EchoPrime:1.1,EchoPrimordial:1.3,Slime:1.0},
 EchoShot:{Resonator:1.0,BassTitan:0.9,ChoirWarden:1.6,VoidHarvester:1.2,EchoPrime:1.4,EchoPrimordial:1.1,Slime:1.3}};
const SKILLS=[
 {id:'hp_1',name:'Corazón I',cost:120,desc:'+20 HP máx',req:[]},
 {id:'hp_2',name:'Corazón II',cost:250,desc:'+30 HP máx',req:['hp_1']},
 {id:'wall_jump',name:'Salto muro',cost:100,desc:'Wall-slide + salto',req:[]},
 {id:'double_jump',name:'Doble salto',cost:300,desc:'Salto aéreo',req:['wall_jump']},
 {id:'dash_heal',name:'Dash vital',cost:180,desc:'Dash PERFECT cura +4',req:[]},
 {id:'combo_master',name:'Combo master',cost:220,desc:'GOOD también avanza combo',req:[]},
 {id:'parry_reflect',name:'Parry reflect',cost:200,desc:'Refleja proyectiles (J a tiempo)',req:[]},
 {id:'energy_efficiency',name:'Eficiencia',cost:160,desc:'Especiales -30% coste',req:[]}];
const BOSS_DEFS=[
 {type:'Resonator',x:2650,hp:380,bpm:[95,130],color:'#ff4073',contact:14,reward:'boss_ricochet',pair:'BassTitan'},
 {type:'BassTitan',x:4050,hp:560,bpm:[88,115],color:'#3366ff',contact:15,reward:'boss_ricochet',pair:'Resonator'},
 {type:'ChoirWarden',x:5450,hp:540,bpm:[102,145],color:'#b333ff',contact:16,reward:'boss_blackhole',pair:'VoidHarvester'},
 {type:'VoidHarvester',x:6650,hp:680,bpm:[90,128],color:'#33cc66',contact:16,reward:'boss_blackhole',pair:'ChoirWarden'},
 {type:'EchoPrime',x:7650,hp:850,bpm:[110,160],color:'#ffe633',contact:18,reward:'boss_teleport',pair:null},
 {type:'EchoPrimordial',x:8850,hp:1100,bpm:[118,168],color:'#cc33cc',contact:20,reward:'boss_clone',pair:null}];
const ARENAS=[[2200,3000],[3650,4450],[5050,5850],[6250,7050],[7250,8050],[8450,9250]];
const PLATS=[[520,820,144,12],[880,760,168,12],[1380,720,216,12],[1750,640,144,12],[1600,700,14,192],[2400,780,120,12],[2550,780,120,12],[2850,620,120,12],[3000,550,12,320],[3300,700,192,12],[4100,760,168,12],[4500,680,144,12],[4900,620,216,12],[5600,780,144,12],[6000,700,192,12],[6500,760,168,12]];
const SHARD_DEFS=[[680,700],[1520,580],[1700,480],[4200,550],[7800,520]];
const LOCK_DEFS=[{id:'lock_tutorial',x:1100,notes:4,reward:30},{id:'lock_mid',x:3500,notes:6,reward:50},{id:'lock_final',x:7300,notes:6,reward:80}];
const SLIME_DEFS=[[900,'slime'],[1400,'slime'],[3200,'mite'],[4300,'husk']];
const TUTS=[[120,400,'A/D moverse · Espacio saltar (coyote 0.15s)'],[500,800,'Shift = dash (solo invulnerable AL BOMBO) · J al BOMBO = PARRY destruye balas'],[800,1050,'ATACA con J en el BOMBO (rojo): PERFECT x1.5 / GOOD x1.2 / resto x0.6 · -N = tu daño'],[1050,1350,'J = combo 3 hits (0.95s) · J cerca cofre/sombra = interactuar · H = oculta números'],[1350,1650,'Slimes saltan solo en bombos · Tus disparos también rompen balas'],[1650,1850,'Q tap=ciclo arma · Q hold=rueda · E=especial (al bombo)'],[1850,2250,'Pulse→Resonator · Void→Bass · Echo→Choir · Cada boss sube su BPM y balas'],[2250,9999,'BOSS: se SELLA (sin salida). Dormido=zZ. Notas ♪ 1-4 en racha xN = +daño']];

// Dificultad: ventanas de ritmo + daño recibido + HP + echoes
// Balance v2: ventanas algo más generosas (50ms PERFECT era muy exigente con lag web + 60fps).
const DIFFS={
 easy:{name:'Fácil',dmgTaken:0.6,perfect:85,good:155,hpMult:1.25,echoMult:0.9},
 normal:{name:'Normal',dmgTaken:0.9,perfect:62,good:125,hpMult:1.0,echoMult:1.0},
 hard:{name:'Difícil',dmgTaken:1.25,perfect:42,good:105,hpMult:0.9,echoMult:1.25}
};
// Checkpoints: inicio + entrada de cada arena
const CHECKPOINTS=[
 {id:'start',x:180},{id:'cp1',x:2100},{id:'cp2',x:3550},
 {id:'cp3',x:4950},{id:'cp4',x:6150},{id:'cp5',x:7150},{id:'cp6',x:8350}
];
