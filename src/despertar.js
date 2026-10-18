// Astraloom · el despertar del objeto de cielo profundo
// La pintura de cada objeto está en nebulosas.js (píxel a píxel). Aquí se
// guarda en caché, se coloca en el cielo y se anima su despertar.
// Sigue siendo provisional: el arte final llega en la fase 4.

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

// Secuencia completa: estallido y la nebulosa que se enciende en su sitio real.
export async function despertar(svg, objeto, cx, cy, R) {
  await prepararObjeto(objeto); // normalmente ya está pintado desde que empezó el nivel
  // Detrás de hilos y estrellas, para que la constelación siga a la vista.
  const capa = el('g', { opacity: 0 });
  svg.insertBefore(capa, svg.querySelector('defs').nextSibling);
  const obj = dibujarObjeto(svg, capa, objeto, 0, 0, R);
  obj.setAttribute('transform', `translate(${cx} ${cy}) scale(0.2)`);
  const fin = estallido(svg, cx, cy, objeto.colores);
  await new Promise(res => setTimeout(res, 350));
  await animar(2600, t => {
    capa.setAttribute('opacity', t);
    obj.setAttribute('transform', `translate(${cx} ${cy}) scale(${0.2 + 0.8 * t})`);
  }, suaveDoble);
  await fin;
}
