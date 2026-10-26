// js/assets.js — sprites Kenney Pixel Platformer 18x18 + hojas de bosses Alien Boss Set (CC0, assets/).
// Funciona con file:// (doble clic, offline). Si una imagen falta o aún no cargó,
// ok() devuelve false y render.js usa el dibujo procedural de siempre (fallback).
'use strict';
const Assets={
  list:{
    player:'assets/characters/tile_0007.png', // casco con visor
    slime:'assets/characters/tile_0000.png',  // blob verde
    grass:'assets/tiles/tile_0001.png',       // hierba centro
    dirt:'assets/tiles/tile_0020.png'         // tierra centro
  },
  sheets:{
    eye:{src:'assets/bosses/eye-green.png',fw:160,fh:128,cols:2,frames:6},
    eyeVoid:{src:'assets/bosses/eye-void.png',fw:160,fh:128,cols:2,frames:6},
    mouth:{src:'assets/bosses/mouth-red.png',fw:96,fh:96,cols:3,frames:9},
    mouthOpen:{src:'assets/bosses/mouth-open.png',fw:96,fh:96,cols:4,frames:16},
    ufo:{src:'assets/bosses/ufo-green.png',fw:160,fh:30,cols:2,frames:24}
  },
  img:{},
  ok(name){const i=this.img[name];return !!(i&&i.complete&&i.naturalWidth>0);},
  load(){for(const k in this.list){try{const im=new Image();im.src=this.list[k];this.img[k]=im;}catch(e){}}
    for(const k in this.sheets){try{const im=new Image();im.src=this.sheets[k].src;this.img[k]=im;}catch(e){}}},
  // Dibuja sprite con (x=centro mundo, yFeet=pies mundo, w/h px pantalla).
  // flip=true lo espeja en X (mirar a la izquierda). Respeta globalAlpha actual.
  // Devuelve true si dibujó, false si hay que usar fallback procedural.
  draw(name,x,yFeet,w,h,flip,opts){
    if(!this.ok(name))return false;
    const sx=x-camX,sy=yFeet-camY;
    if(sx<-w||sx>W+w||sy<-h||sy>H+h)return true; // fuera de pantalla: nada que dibujar
    ctx.save();
    ctx.translate(Math.round(sx),Math.round(sy));
    if(flip)ctx.scale(-1,1);
    if(opts&&(opts.sx!==undefined||opts.sy!==undefined))ctx.scale(opts.sx!==undefined?opts.sx:1,opts.sy!==undefined?opts.sy:1);
    if(opts&&opts.white)ctx.filter='brightness(0) invert(1)';
    else if(opts&&opts.hue)ctx.filter='hue-rotate('+opts.hue+'deg)';
    if(opts&&opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;
    ctx.drawImage(this.img[name],Math.round(-w/2),Math.round(-h),w,h);
    ctx.filter='none';
    ctx.restore();
    return true;
  },
  // Frame animado de una hoja de bosses. opts={hue,white,alpha}
  drawSheet(name,frame,x,yFeet,w,h,opts){
    if(!this.ok(name))return false;
    const s=this.sheets[name];if(!s)return false;
    const sx=x-camX,sy=yFeet-camY;
    if(sx<-w||sx>W+w||sy<-h||sy>H+h)return true;
    frame=((frame|0)%s.frames+s.frames)%s.frames;
    const fx=(frame%s.cols)*s.fw,fy=Math.floor(frame/s.cols)*s.fh;
    ctx.save();
    ctx.translate(Math.round(sx),Math.round(sy));
    if(opts&&opts.flip)ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=true;
    if(opts&&opts.white)ctx.filter='brightness(0) invert(1)';
    else if(opts&&opts.hue)ctx.filter='hue-rotate('+opts.hue+'deg)';
    if(opts&&opts.alpha!==undefined)ctx.globalAlpha=opts.alpha;
    ctx.drawImage(this.img[name],fx,fy,s.fw,s.fh,Math.round(-w/2),Math.round(-h),w,h);
    ctx.filter='none';
    ctx.restore();
    return true;
  }
};
Assets.load();
