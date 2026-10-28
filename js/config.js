// js/config.js — datos y constantes (+ helpers de layout). Classic script, funciona con file://
'use strict';
const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const W=960,H=540,WORLD_W=16200,GROUND_TOP=868;
const $=id=>document.getElementById(id);

const WEAPONS=[
 {name:'PulseBlade',kind:'melee',base:28,range:78,cd:0.26,cost:25,esp:60,color:'#33e6ff',desc:'corto · combo'},
 {name:'VoidWave',kind:'wave',base:24,range:460,cd:0.48,cost:30,esp:52,color:'#b34dff',desc:'atraviesa · lento'},
 {name:'EchoShot',kind:'shot',base:5,range:410,cd:0.15,cost:35,esp:45,color:'#ffd933',desc:'ráfaga · rápido'}];
const EFFECT={
 PulseBlade:{Resonator:1.6,BassTitan:0.7,ChoirWarden:1.0,VoidHarvester:0.9,EchoPrime:1.2,EchoPrimordial:1.4,Slime:1.2},
 VoidWave:{Resonator:0.8,BassTitan:1.6,ChoirWarden:1.0,VoidHarvester:1.5,EchoPrime:1.1,EchoPrimordial:1.3,Slime:1.0},
 EchoShot:{Resonator:1.0,BassTitan:0.9,ChoirWarden:1.6,VoidHarvester:1.2,EchoPrime:1.4,EchoPrimordial:1.1,Slime:1.3}};
const SKILLS=[
 {id:'hp_1',name:'Corazón I',cost:120,desc:'+20 HP máx',req:[]},
 {id:'hp_2',name:'Corazón II',cost:250,desc:'+30 HP máx',req:['hp_1']},
 {id:'wall_jump',name:'Salto muro',cost:100,desc:'Wall-slide + salto',req:[]},
 {id:'double_jump',name:'Doble salto',cost:300,desc:'Salto aéreo',req:['wall_jump']},
 {id:'dash_heal',name:'Dash vital',cost:180,desc:'Dash PERFECT cura 8→10',req:[]},
 {id:'combo_master',name:'Combo master',cost:220,desc:'GOOD también avanza combo',req:[]},
 {id:'parry_reflect',name:'Parry reflect',cost:200,desc:'Parry +35 radio y refleja',req:[]},
 {id:'energy_efficiency',name:'Eficiencia',cost:160,desc:'Especiales -30% coste',req:[]}];
const _plat=(x,y,w=120,h=12)=>[x,y,w,h];
const _stair=(x,y,n,dx,dy,w=120)=>Array.from({length:n},(_,i)=>_plat(x+i*dx,y+i*dy,w));
const BOSS_DEFS=[
 {type:'Resonator',x:2650,hp:380,bpm:[95,130],color:'#ff4073',contact:14,reward:'boss_ricochet',pair:'BassTitan',spr:'eye',sw:120,sh:96,hue:0,fps:6,
  speed:40,keep:220,tele:0.42,idle:1.3,stunRes:2600,sigName:'CASCADA',sigEvery:4},
 {type:'BassTitan',x:4800,hp:560,bpm:[88,115],color:'#3366ff',contact:15,reward:'boss_ricochet',pair:'Resonator',spr:'mouth',sw:112,sh:112,hue:0,fps:8,
  speed:26,keep:120,tele:0.48,idle:1.4,stunRes:4800,sigName:'TERREMOTO',sigEvery:3},
 {type:'ChoirWarden',x:7000,hp:640,bpm:[102,145],color:'#b333ff',contact:16,reward:'boss_blackhole',pair:'VoidHarvester',spr:'mouthOpen',sw:124,sh:124,hue:190,fps:9,
  speed:60,keep:240,tele:0.32,idle:1.05,stunRes:3200,sigName:'SERMÓN',sigEvery:3},
 {type:'VoidHarvester',x:9200,hp:760,bpm:[90,128],color:'#33cc66',contact:16,reward:'boss_blackhole',pair:'ChoirWarden',spr:'ufo',sw:160,sh:66,hue:0,fps:10,
  speed:46,keep:220,tele:0.36,idle:1.15,stunRes:3600,sigName:'HORIZONTE',sigEvery:3},
 {type:'EchoPrime',x:11600,hp:920,bpm:[110,160],color:'#ffe633',contact:18,reward:'boss_teleport',pair:null,spr:'eyeVoid',sw:136,sh:108,hue:0,fps:8,
  speed:120,keep:180,tele:0.24,idle:0.78,stunRes:2800,sigName:'DESTELLO',sigEvery:3},
 {type:'EchoPrimordial',x:14800,hp:1350,bpm:[118,168],color:'#cc33cc',contact:20,reward:'boss_clone',pair:null,spr:'ufo',sw:190,sh:80,hue:280,fps:13,
  speed:80,keep:200,tele:0.3,idle:0.85,stunRes:4200,sigName:'APOCALIPSIS',sigEvery:3}];
const ARENAS=[[2200,3100],[4300,5300],[6500,7500],[8700,9700],[11100,12100],[14200,15400]];
// Rutas: escaleras de 50-60px por paso (salto base ~84px), con atajos altos y recovecos.
const PLATS=[
 ..._stair(480,820,8,180,-50),_plat(1820,820),_plat(1920,520),_plat(2100,580),
 ..._stair(2380,800,4,220,-40),
 ..._stair(3220,820,5,180,-60),_plat(4120,640),
 ..._stair(4480,800,4,220,-40),
 ..._stair(5450,810,5,180,-60),_plat(6350,580),
 ..._stair(6680,800,4,220,-40),
 ..._stair(7650,810,4,180,-60),_plat(8370,640),_plat(8550,700),_plat(8180,820),
 ..._stair(8880,800,4,220,-40),
 ..._stair(9820,820,6,180,-60),_plat(10900,580),
 ..._stair(11280,800,4,220,-40),
 ..._stair(12250,810,5,180,-60),_plat(13150,620),
 ..._stair(13450,810,4,180,-60),_plat(14170,680),
 ..._stair(14380,800,4,220,-40),
 _plat(15700,820),_plat(15850,760),_plat(15990,700)
];
const SHARD_DEFS=[[1920,478],[1820,778],[3940,544],[6170,534],[8180,778],[10720,484],[12970,534],[15990,664]];
const LOCK_DEFS=[{id:'lock_tutorial',x:1100,notes:4,reward:30},{id:'lock_mid',x:4120,notes:6,reward:50},{id:'lock_void',x:8000,notes:7,reward:80},{id:'lock_final',x:12790,notes:8,reward:120}];
const SLIME_DEFS=[[900,'slime'],[1400,'slime'],[3300,'mite'],[3700,'husk'],[5700,'slime'],[6100,'mite'],[7700,'husk'],[8300,'slime'],[10000,'mite'],[10600,'husk'],[12400,'slime'],[13000,'mite']];
const SLIME_TYPES={
 slime:{hp:70,w:26,h:24,spd:42,chase:70,contact:12,jump:180,color:'#3c6',hue:0},
 mite:{hp:45,w:20,h:18,spd:68,chase:108,contact:9,jump:220,color:'#5cf',hue:170},
 husk:{hp:130,w:34,h:30,spd:26,chase:46,contact:16,jump:140,color:'#a8a',hue:60}
};
const AREAS=[
 {name:'Puerta de Umbra',from:0,to:2200,bg:'#0b0b18'},
 {name:'Sala del Resonador',from:2200,to:3100,bg:'#14101c'},
 {name:'La Cisterna Hueca',from:3100,to:4300,bg:'#08161a'},
 {name:'Fosa del Titán',from:4300,to:5300,bg:'#141821'},
 {name:'Puente Ámbar',from:5300,to:6500,bg:'#1a1408'},
 {name:'Coro de Ceniza',from:6500,to:7500,bg:'#160a1c'},
 {name:'Puente Roto',from:7500,to:8700,bg:'#101018'},
 {name:'Cámara del Vacío',from:8700,to:9700,bg:'#08140e'},
 {name:'Escalera de Ceniza',from:9700,to:11100,bg:'#1a1208'},
 {name:'Trono de Eco',from:11100,to:12100,bg:'#1a1a08'},
 {name:'Nido del Silencio',from:12100,to:13300,bg:'#120a18'},
 {name:'Descenso Final',from:13300,to:14200,bg:'#180a0a'},
 {name:'Arena Primordial',from:14200,to:15400,bg:'#1c081c'},
 {name:'Fin del Vacío',from:15400,to:16200,bg:'#08080f'}
];

// Dificultad: ventanas de ritmo + daño recibido + HP + echoes
// Balance v2: ventanas algo más generosas (50ms PERFECT era muy exigente con lag web + 60fps).
const DIFFS={
 easy:{name:'Fácil',dmgTaken:0.6,perfect:85,good:155,hpMult:1.25,echoMult:0.9},
 normal:{name:'Normal',dmgTaken:0.9,perfect:62,good:125,hpMult:1.0,echoMult:1.0},
 hard:{name:'Difícil',dmgTaken:1.25,perfect:42,good:105,hpMult:0.9,echoMult:1.25}
};
// Checkpoints: inicio + entrada de cada arena
const CHECKPOINTS=[
 {id:'start',x:180},{id:'cp1',x:2010},{id:'cp2',x:4030},
 {id:'cp3',x:6260},{id:'cp4',x:8460},{id:'cp5',x:10810},{id:'cp6',x:14080}
];
