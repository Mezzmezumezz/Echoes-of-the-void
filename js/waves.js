// js/waves.js — fondo animado "silk dots" para menú y pausa.
// Homenaje liviano a PatternWaves (preset silk): retícula de puntos sobre
// olas, cursor con estela y click con splash, centro calmo para el texto.
// Canvas2D sin dependencias (el proyecto es vanilla + offline, sin React/build).
// ponytail: canvas2d en vez de WebGL/ogl+React. Subir a ogl si esto se queda corto.
'use strict';
const Waves = (() => {
  const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [];

  function init(canvas, color) {
    const ov = canvas.parentElement;
    const o = { cv: canvas, ctx: canvas.getContext('2d'), x: -9999, y: -9999, splash: [], color: color || '#8fd8ff', w: 0, h: 0 };
    items.push(o);
    size(o);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => size(o)).observe(ov);
    ov.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); o.x = e.clientX - r.left; o.y = e.clientY - r.top; });
    ov.addEventListener('pointerleave', () => { o.x = -9999; o.y = -9999; });
    ov.addEventListener('pointerdown', e => { const r = canvas.getBoundingClientRect(); o.splash.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now() }); });
  }

  function size(o) {
    const r = o.cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 1.5);
    o.w = r.width; o.h = r.height;
    o.cv.width = Math.max(1, Math.round(r.width * dpr)); o.cv.height = Math.max(1, Math.round(r.height * dpr));
    o.dpr = dpr;
    paint(o, performance.now());
  }

  // Altura de la superficie en (x,y): pliegues silk + lift del cursor + anillos de splash.
  function field(x, y, t, o, now) {
    let v = Math.sin(x * 0.020 + t) * Math.cos(y * 0.017 - t * 0.7) + 0.5 * Math.sin((x + y) * 0.008 + t * 0.5);
    const dx = x - o.x, dy = y - o.y;
    v += 0.9 * Math.exp(-(dx * dx + dy * dy) / (2 * 70 * 70));
    for (const s of o.splash) {
      const age = (now - s.t0) / 1000;
      if (age >= 1.2) continue;
      const d = Math.abs(Math.hypot(x - s.x, y - s.y) - age * 220);
      v += 0.8 * Math.exp(-(d * d) / (2 * 18 * 18)) * (1 - age / 1.2);
    }
    return v;
  }

  function paint(o, now) {
    const { ctx, w, h } = o, t = now / 1000;
    if (!w || !h) return 0;
    ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = o.color;
    const sp = 15, cx = w / 2, cy = h / 2, calmR = Math.min(w, h) * 0.42;
    let n = 0;
    for (let gy = sp / 2; gy < h; gy += sp) {
      for (let gx = sp / 2; gx < w; gx += sp) {
        const v = field(gx, gy, t, o, now);
        const dc = Math.hypot(gx - cx, gy - cy) / calmR;
        const calm = Math.min(1, 0.25 + 0.75 * Math.max(0, dc - 0.35) / 0.65); // centro calmo (fade:center)
        const edge = Math.min(1, Math.min(gx, w - gx) / (w * 0.1), Math.min(gy, h - gy) / (h * 0.1)); // fade:edges
        const k = Math.max(0, Math.min(1, v / 2.4 * 0.5 + 0.5));
        ctx.globalAlpha = (0.05 + 0.35 * k) * calm * Math.max(0, edge);
        if (ctx.globalAlpha < 0.01) continue;
        ctx.beginPath();
        ctx.arc(gx, gy, (0.8 + 1.8 * k) * (0.5 + 0.5 * calm), 0, 6.2832);
        ctx.fill();
        n++;
      }
    }
    ctx.globalAlpha = 1;
    return n;
  }

  // Una iteración: solo pinta overlays visibles (sin .hidden).
  function frame(now) {
    for (const o of items) {
      if (o.cv.parentElement.classList.contains('hidden')) continue;
      o.splash = o.splash.filter(s => now - s.t0 < 1200);
      if (!RM) paint(o, now);
    }
  }

  function loop(now) { frame(now); requestAnimationFrame(loop); }

  const api = { items, init, paint, frame, field };
  if (typeof window !== 'undefined') window.Waves = api;
  if (typeof document !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
    document.querySelectorAll('#menu .waves,#pause .waves').forEach(c => init(c));
    requestAnimationFrame(loop);
  }
  return api;
})();
if (typeof module !== 'undefined') module.exports = Waves;
