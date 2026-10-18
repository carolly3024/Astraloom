// Astraloom · utilidades de dibujo en SVG compartidas por las pantallas

export const NS = 'http://www.w3.org/2000/svg';
export const LADO = 1000; // el cielo se dibuja en un cuadrado de 1000 × 1000

export function el(tag, attrs = {}, padre) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (padre) padre.appendChild(e);
  return e;
}

export function crearCielo(contenedor) {
  const svg = el('svg', { viewBox: `0 0 ${LADO} ${LADO}`, class: 'cielo-svg', role: 'img' });
  const defs = el('defs', {}, svg);
  const brillo = el('filter', { id: 'brillo', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
  el('feGaussianBlur', { stdDeviation: 4, result: 'b' }, brillo);
  const m = el('feMerge', {}, brillo);
  el('feMergeNode', { in: 'b' }, m);
  el('feMergeNode', { in: 'SourceGraphic' }, m);
  contenedor.appendChild(svg);
  return svg;
}

// Radio de una estrella según su magnitud aparente (menor = más brillante).
export function radioEstrella(mag) {
  return Math.max(3, 14 - mag * 2.3);
}

export function dibujarEstrella(padre, { x, y, mag, color }, extra = {}) {
  const g = el('g', { class: 'estrella', transform: `translate(${x} ${y})`, ...extra }, padre);
  const r = radioEstrella(mag);
  el('circle', { r: r * 2.4, fill: color || '#dce3f0', opacity: 0.12 }, g);
  el('circle', { r, fill: color || '#dce3f0', filter: 'url(#brillo)' }, g);
  return g;
}

export function puntoSVG(svg, ev) {
  const p = svg.createSVGPoint();
  p.x = ev.clientX; p.y = ev.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}

export const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const suave = t => 1 - Math.pow(1 - t, 3);
export const suaveDoble = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Anima de 0 a 1 durante `ms` milisegundos. Devuelve una promesa.
export function animar(ms, paso, curva = suave) {
  return new Promise(resolve => {
    const t0 = performance.now();
    function cuadro(ahora) {
      const t = Math.min(1, (ahora - t0) / ms);
      paso(curva(t), t);
      if (t < 1) requestAnimationFrame(cuadro); else resolve();
    }
    requestAnimationFrame(cuadro);
  });
}

export const esperar = ms => new Promise(r => setTimeout(r, ms));
const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// La figura se recorre hilo a hilo con un brillo, despacio y con suavidad.
// La usan la presentación de Aprendiz y el final de los dos niveles.
export async function trazarFigura(padre, segmentos, cancelado = () => false) {
  const g = el('g', { class: 'celebra' }, padre);
  const ms = sinMovimiento() ? 0 : Math.max(280, 3600 / segmentos.length);
  for (const [a, b] of segmentos) {
    if (cancelado()) break;
    const l = el('line', { x1: a.x, y1: a.y, x2: a.x, y2: a.y, class: 'hilo brillo' }, g);
    if (!ms) { l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); continue; }
    await animar(ms, t => { l.setAttribute('x2', a.x + (b.x - a.x) * t); l.setAttribute('y2', a.y + (b.y - a.y) * t); }, suaveDoble);
  }
  return g;
}

// Generador aleatorio con semilla, para que cada objeto se dibuje siempre igual.
export function azar(semilla) {
  let h = 2166136261;
  for (const c of String(semilla)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return function () {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
