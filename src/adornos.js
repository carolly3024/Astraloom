// Astraloom · adornos compartidos: el borde de luz que gira y las miniaturas de
// las constelaciones para el inicio y el atlas.

import { el } from './svg.js';
import { dibujarObjeto } from './despertar.js';

// Borde de luz: un degradado frío que gira alrededor de la caja, con un halo
// suave detrás. Va encima de la caja y no recibe clics.
export function bordeLuz(caja) {
  caja.classList.add('con-luz');
  caja.insertAdjacentHTML('beforeend',
    '<span class="borde-luz" aria-hidden="true"><span class="halo-luz"><span class="aro-luz"></span></span><span class="aro-luz"></span></span>');
}

// Color principal de un objeto, para teñir su tarjeta (el primero que no sea polvo oscuro).
export function tonoObjeto(objeto) {
  const claro = objeto.colores.find(c => luminancia(c.hex) > 0.25);
  return (claro || objeto.colores[0])?.hex || '#7fa8f0';
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// Miniatura de la figura. estado: 'pendiente' (solo estrellas tenues),
// 'aprendiz' (hilos plateados) o 'despierta' (hilos brillantes y su objeto detrás).
export function miniFigura(contenedor, nivel, estado) {
  const L = 100, m = 12;
  const svg = el('svg', { viewBox: `0 0 ${L} ${L}`, class: `mini-figura ${estado}`, 'aria-hidden': 'true' });
  const defs = el('defs', {}, svg);
  const f = el('filter', { id: 'brillo', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
  el('feGaussianBlur', { stdDeviation: 0.8 }, f);
  const p = e => ({ x: m + e.x * (L - 2 * m), y: m + e.y * (L - 2 * m) });
  const porHip = new Map(nivel.aprendiz.estrellas.map(e => [e.hip, p(e)]));
  if (estado === 'despierta' && nivel.aprendiz.objeto) {
    const o = p(nivel.aprendiz.objeto);
    const cx = Math.min(L - 10, Math.max(10, o.x)), cy = Math.min(L - 10, Math.max(10, o.y));
    dibujarObjeto(svg, el('g', { class: 'mini-objeto' }, svg), nivel.tejedora.objeto, cx, cy, 22);
  }
  if (estado !== 'pendiente') {
    const g = el('g', { class: 'mini-hilos' }, svg);
    for (const [a, b] of nivel.lineas) {
      const A = porHip.get(a), B = porHip.get(b);
      if (A && B) el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y }, g);
    }
  }
  const g = el('g', { class: 'mini-estrellas' }, svg);
  for (const e of nivel.aprendiz.estrellas) {
    const q = porHip.get(e.hip);
    el('circle', { cx: q.x, cy: q.y, r: Math.max(0.9, 2.6 - e.mag * 0.45), fill: e.color || '#dce3f0' }, g);
  }
  contenedor.appendChild(svg);
  return svg;
}
