// js/assets.js — sprites Kenney Pixel Platformer 18x18 (CC0, locales en assets/).
// Funciona con file:// (doble clic, offline). Si una imagen falta o aún no cargó,
// ok() devuelve false y render.js usa el dibujo procedural de siempre (fallback).
'use strict';
const Assets={
  list:{
    player:'assets/characters/tile_0007.png', // casco con visor
    slime:'assets/characters/tile_0000.png',  // blob verde
    boss:'assets/characters/tile_0012.png',   // cuadrado naranja (se tiñe por boss)
    grass:'assets/tiles/tile_0001.png',       // hierba centro
    dirt:'assets/tiles/tile_0020.png'         // tierra centro
  },
  img:{},
  ok(name){const i=this.img[name];return !!(i&&i.complete&&i.naturalWidth>0);},
  load(){for(const k in this.list){try{const im=new Image();im.src=this.list[k];this.img[k]=im;}catch(e){}}},
  // Dibuja sprite con (x=centro mundo, yFeet=pies mundo, w/h px pantalla).
  // flip=true lo espeja en X (mirar a la izquierda). Respeta globalAlpha actual.
  // Devuelve true si dibujó, false si hay que usar fallback procedural.
  draw(name,x,yFeet,w,h,flip){
    if(!this.ok(name))return false;
    const sx=x-camX,sy=yFeet-camY;
    if(sx<-w||sx>W+w||sy<-h||sy>H+h)return true; // fuera de pantalla: nada que dibujar
    ctx.save();
    ctx.translate(Math.round(sx),Math.round(sy));
    if(flip)ctx.scale(-1,1);
    ctx.drawImage(this.img[name],Math.round(-w/2),Math.round(-h),w,h);
    ctx.restore();
    return true;
  }
};
Assets.load();
