// Sanity check del mapa: node tools/check-map.js
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const sandbox={document:{getElementById:()=>({getContext:()=>({})})}};
vm.createContext(sandbox);
const src=fs.readFileSync(path.join(root,'js/config.js'),'utf8')+
  '\n;globalThis.D={WORLD_W,PLATS,ARENAS,BOSS_DEFS,CHECKPOINTS,SHARD_DEFS,LOCK_DEFS,SLIME_DEFS,AREAS,GROUND_TOP};';
vm.runInContext(src,sandbox);
const D=sandbox.D;
const fails=[];
const ok=(cond,msg)=>{if(!cond)fails.push(msg);};
const top=p=>p[1]-p[3]/2;

let edge=0;
for(const a of D.AREAS){ok(a.from===edge,'hueco de zona antes de '+a.name);edge=a.to;}
ok(edge===D.WORLD_W,'las zonas terminan en '+edge+', WORLD_W='+D.WORLD_W);

D.BOSS_DEFS.forEach((b,i)=>{
  const a=D.ARENAS[i];
  ok(!!a,'boss '+b.type+' sin arena');
  if(a)ok(b.x>a[0]&&b.x<a[1],'boss '+b.type+' fuera de su arena');
  ok(!!b.spr,'boss '+b.type+' sin sprite');
});

let lastX=-1;
D.CHECKPOINTS.forEach(c=>{
  ok(c.x>lastX,'checkpoint fuera de orden: '+c.id);lastX=c.x;
  D.PLATS.forEach(p=>{if(p[1]>=780)ok(Math.abs(p[0]-c.x)>=p[2]/2+16,'checkpoint '+c.id+' dentro de plataforma x='+p[0]);});
});

D.SHARD_DEFS.forEach(([x,y],i)=>{
  const near=D.PLATS.some(p=>Math.abs(x-p[0])<=p[2]/2+30&&Math.abs(y-top(p))<=55);
  ok(near,'shard '+i+' en ('+x+','+y+') lejos de una plataforma');
});

D.LOCK_DEFS.forEach(l=>{
  ok(l.x>0&&l.x<D.WORLD_W,'lock '+l.id+' fuera del mundo');
  ok(!D.ARENAS.some(a=>l.x>a[0]&&l.x<a[1]),'lock '+l.id+' dentro de una arena');
});
D.SLIME_DEFS.forEach(([x],i)=>ok(!D.ARENAS.some(a=>x>a[0]&&x<a[1]),'slime '+i+' dentro de una arena'));

const orphans=[];
D.PLATS.forEach((p,i)=>{
  const linked=D.PLATS.some((q,j)=>{
    if(i===j)return false;
    const dy=Math.abs(p[1]-q[1]);
    const gap=Math.max(0,Math.abs(p[0]-q[0])-(p[2]+q[2])/2);
    return dy<=90&&gap<=180;
  })||Math.abs(p[1]-D.GROUND_TOP)<=90;
  if(!linked)orphans.push('plataforma '+i+' @'+p[0]+','+p[1]);
});
ok(orphans.length===0,'plataformas sin conexión: '+orphans.join(', '));

console.log('Mapa: '+D.PLATS.length+' plataformas · '+D.AREAS.length+' zonas · '+D.BOSS_DEFS.length+' bosses · '+
  D.SHARD_DEFS.length+' shards · '+D.LOCK_DEFS.length+' locks · '+D.SLIME_DEFS.length+' slimes');
if(fails.length){console.error('FALLOS:\n- '+fails.join('\n- '));process.exit(1);}
console.log('OK');
