// Astraloom · el despertar del objeto de cielo profundo
// La pintura de cada objeto está en nebulosas.js (píxel a píxel). Aquí se
// guarda en caché, se coloca en el cielo y se anima su despertar.
// Secuencia pausada del despertar (fase 4): velo, reunión de chispas, destello y nebulosa.

import { el, animar, suaveDoble } from './svg.js';
import { pintarObjeto } from './nebulosas.js';

const POLVO = '#2a1c22';
const LADO_LIENZO = 1024;         // resolución del dibujo
const EXTENSION = 1.3;            // el lienzo cubre 1,3 veces el radio, para que el brillo respire
const cache = new Map();          // id → dataURL ya pintada
const pendientes = new Map();     // id → promesa de la pintura en curso
let cola = Promise.resolve();     // se pinta un objeto cada vez, sin bloquear el resto

function elegirColor(colores, r) {
  let x = r() * colores.reduce((s, c) => s + c.peso, 0);
  for (const c of colores) { x -= c.peso; if (x <= 0) return c; }
  return colores[0];
}

// Pinta el objeto (una vez; luego sale de la caché). Devuelve una promesa con la imagen.
export function prepararObjeto(objeto) {
  if (cache.has(objeto.id)) return Promise.resolve(cache.get(objeto.id));
  if (!pendientes.has(objeto.id)) {
    const p = cola = cola.then(() => new Promise(res => setTimeout(() => {
      const url = pintarObjeto(objeto, LADO_LIENZO, EXTENSION).toDataURL('image/png');
      cache.set(objeto.id, url);
      pendientes.delete(objeto.id);
      res(url);
    }, 0)));
    pendientes.set(objeto.id, p);
  }
  return pendientes.get(objeto.id);
}

// Dibuja el objeto dentro de `padre`, centrado en (cx, cy) y con radio R.
// Si aún no está pintado, aparece con un fundido en cuanto esté listo.
export function dibujarObjeto(svg, padre, objeto, cx, cy, R) {
  const g = el('g', { class: 'objeto', transform: `translate(${cx} ${cy})` }, padre);
  const L = R * EXTENSION;
  const img = el('image', { x: -L, y: -L, width: 2 * L, height: 2 * L, style: 'mix-blend-mode: screen' }, g);
  if (cache.has(objeto.id)) img.setAttribute('href', cache.get(objeto.id));
  else {
    img.classList.add('cargando-objeto');
    prepararObjeto(objeto).then(url => { img.setAttribute('href', url); requestAnimationFrame(() => img.classList.add('listo')); });
  }
  return g;
}

// Estallido de estrellitas desde (cx, cy).
export function estallido(svg, cx, cy, colores) {
  const g = el('g', { class: 'estallido' }, svg);
  const r = Math.random;
  const ps = Array.from({ length: 110 }, (_, i) => {
    const ang = r() * Math.PI * 2, v = 55 + r() * 240;
    const c = i % 3 === 0 ? '#ffffff' : elegirColor(colores.filter(c => c.hex !== POLVO), r).hex;
    return { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, e: el('circle', { cx, cy, r: 1 + r() * 2.4, fill: c }, g) };
  });
  return animar(1800, (t, lineal) => {
    for (const p of ps) {
      p.e.setAttribute('cx', cx + p.vx * t);
      p.e.setAttribute('cy', cy + p.vy * t);
      p.e.setAttribute('opacity', 1 - lineal * lineal);
    }
  }).then(() => g.remove());
}

// Las chispas se reúnen en el sitio del objeto antes de que despierte.
function reunir(svg, cx, cy, colores) {
  const g = el('g', { class: 'reunion' }, svg);
  const r = Math.random, luz = colores.filter(c => c.hex !== POLVO);
  const ps = Array.from({ length: 46 }, (_, i) => {
    const ang = r() * Math.PI * 2, d = 140 + r() * 220, retraso = r() * 0.35;
    const c = i % 4 === 0 ? '#ffffff' : elegirColor(luz, r).hex;
    return { x: Math.cos(ang) * d, y: Math.sin(ang) * d, retraso, e: el('circle', { cx: cx, cy: cy, r: 1.3 + r() * 2.2, fill: c, opacity: 0, filter: 'url(#brillo)' }, g) };
  });
  return animar(1300, (t, lineal) => {
    for (const p of ps) {
      const u = Math.max(0, Math.min(1, (lineal - p.retraso) / (1 - p.retraso)));
      const k = 1 - u * u * u; // aceleran al llegar
      p.e.setAttribute('cx', cx + p.x * k);
      p.e.setAttribute('cy', cy + p.y * k);
      p.e.setAttribute('opacity', Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.95);
    }
  }).then(() => g.remove());
}

// Un destello en el punto y una onda suave que se abre con el color del objeto.
function destello(svg, cx, cy, R, color) {
  const g = el('g', { class: 'destello' }, svg);
  const flash = el('circle', { cx, cy, r: 4, fill: '#ffffff', filter: 'url(#brillo)' }, g);
  const onda = el('circle', { cx, cy, r: 10, fill: 'none', stroke: color, 'stroke-width': 2 }, g);
  return animar(1700, (t, lineal) => {
    flash.setAttribute('r', 4 + 26 * Math.min(1, lineal * 3));
    flash.setAttribute('opacity', Math.max(0, 1 - lineal * 2.2));
    onda.setAttribute('r', 10 + R * 1.7 * t);
    onda.setAttribute('opacity', 0.7 * (1 - lineal));
    onda.setAttribute('stroke-width', 2.5 * (1 - lineal) + 0.3);
  }).then(() => g.remove());
}

// Secuencia completa, sin prisa: el cielo se apaga un poco y la figura brilla,
// las chispas se reúnen en el sitio del objeto, un destello, y la nebulosa sale de
// una lluvia de estrellitas con sus colores reales. Después el cielo vuelve a su luz.
export async function despertar(svg, objeto, cx, cy, R) {
  const tranquilo = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  await prepararObjeto(objeto); // normalmente ya está pintado desde que empezó el nivel
  const defs = svg.querySelector('defs');
  const velo = el('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: '#000', opacity: 0, class: 'velo' });
  svg.insertBefore(velo, defs.nextSibling);
  svg.classList.add('despertando');
  const luz = objeto.colores.find(c => c.hex !== POLVO)?.hex || '#7fa8f0';
  if (!tranquilo) {
    animar(900, t => velo.setAttribute('opacity', 0.4 * t));
    await new Promise(res => setTimeout(res, 500));
    await reunir(svg, cx, cy, objeto.colores);
    destello(svg, cx, cy, R, luz);
  }
  // Detrás de hilos y estrellas, para que la constelación siga a la vista.
  const capa = el('g', { opacity: 0 });
  svg.insertBefore(capa, velo.nextSibling);
  const obj = dibujarObjeto(svg, capa, objeto, 0, 0, R);
  obj.setAttribute('transform', `translate(${cx} ${cy}) scale(0.2)`);
  const fin = estallido(svg, cx, cy, objeto.colores);
  await new Promise(res => setTimeout(res, 250));
  await animar(tranquilo ? 600 : 2800, t => {
    capa.setAttribute('opacity', t);
    obj.setAttribute('transform', `translate(${cx} ${cy}) scale(${0.2 + 0.8 * t})`);
  }, suaveDoble);
  await fin;
  // El cielo recupera su luz poco a poco, ya con el objeto despierto.
  svg.classList.remove('despertando');
  const desde = Number(velo.getAttribute('opacity'));
  animar(1500, t => velo.setAttribute('opacity', desde * (1 - t))).then(() => velo.remove());
}
