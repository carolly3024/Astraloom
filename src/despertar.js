// Astraloom · el despertar del objeto de cielo profundo
// Cada objeto se pinta en un lienzo (canvas) con luz que se suma, ruido para
// las formas de gas y polvo que la tapa. La forma sale de `objeto.forma` y los
// colores de `objeto.colores` con su peso. Sigue siendo provisional: el arte
// final llega en la fase 4.

import { el, animar, azar, suaveDoble } from './svg.js';

const POLVO = '#2a1c22';
const LADO_LIENZO = 512;          // resolución del dibujo
const EXTENSION = 1.3;            // el lienzo cubre 1,3 veces el radio, para que el brillo respire
const cache = new Map();

// ---------- utilidades ----------

function elegirColor(colores, r) {
  let x = r() * colores.reduce((s, c) => s + c.peso, 0);
  for (const c of colores) { x -= c.peso; if (x <= 0) return c; }
  return colores[0];
}

const gauss = r => (r() + r() + r() + r() - 2) / 2; // aproximadamente normal, entre -1 y 1

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Ruido suave con semilla (ruido de valor con varias octavas).
function crearRuido(r) {
  const N = 64, v = Float32Array.from({ length: N * N }, r);
  const at = (x, y) => v[((y % N + N) % N) * N + ((x % N + N) % N)];
  const s = t => t * t * (3 - 2 * t);
  const base = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => {
    let t = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 5; o++) { t += amp * base(x * f, y * f); amp /= 2; f *= 2; }
    return t; // 0..1
  };
}

function mancha(ctx, x, y, rad, hex, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.4, rgba(hex, a * 0.45));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
}

function estrella(ctx, x, y, tam, hex = '#ffffff', destello = false) {
  mancha(ctx, x, y, tam * 4, hex, 0.35);
  ctx.fillStyle = rgba('#ffffff', 0.95);
  ctx.beginPath(); ctx.arc(x, y, tam * 0.6, 0, Math.PI * 2); ctx.fill();
  if (destello) {
    ctx.strokeStyle = rgba(hex, 0.45); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - tam * 7, y); ctx.lineTo(x + tam * 7, y);
    ctx.moveTo(x, y - tam * 7); ctx.lineTo(x, y + tam * 7); ctx.stroke();
  }
}

// ---------- capas ----------

// Gas: miles de manchitas suaves que solo se quedan donde el ruido es denso.
function gas(ctx, R, r, ruido, colores, { n = 1400, umbral = 0.4, escala = 2.2, dispX = 0.75, dispY = 0.65, tam = [5, 20], a = 0.06, fondo = true } = {}) {
  if (fondo) { // resplandor de base, sin textura
    for (let i = 0; i < 90; i++) {
      const c = elegirColor(colores, r);
      mancha(ctx, gauss(r) * R * dispX * 0.8, gauss(r) * R * dispY * 0.8, R * (0.15 + r() * 0.25), c.hex, 0.035);
    }
  }
  for (let i = 0; i < n; i++) {
    const x = gauss(r) * R * dispX, y = gauss(r) * R * dispY;
    const d = ruido(x / R * escala + 10, y / R * escala + 10);
    const peso = Math.min(1, Math.max(0, (d - umbral) / 0.25)); // más denso donde el ruido sube
    if (peso <= 0) continue;
    const c = elegirColor(colores, r);
    mancha(ctx, x, y, tam[0] + r() * (tam[1] - tam[0]), c.hex, a * (0.4 + peso));
  }
}

// Polvo: vetas oscuras que tapan la luz de detrás.
function polvo(ctx, R, r, ruido, peso, { escala = 3, dispX = 0.7, dispY = 0.55 } = {}) {
  if (!peso) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const n = Math.round(6000 * peso);
  for (let i = 0; i < n; i++) {
    const x = gauss(r) * R * dispX, y = gauss(r) * R * dispY;
    const d = ruido(x / R * escala + 40, y / R * escala + 40);
    if (Math.abs(d - 0.5) > 0.02) continue; // solo en las «crestas» del ruido: vetas finas
    mancha(ctx, x, y, 4 + r() * 6, '#000000', 0.18);
  }
  ctx.restore();
}

function espiral(ctx, R, r, colores, { brazos = 2, vueltas = 1.6, nucleo = '#ffd9a0' } = {}) {
  const luz = colores.filter(c => c.hex !== POLVO && c.hex !== nucleo);
  mancha(ctx, 0, 0, R * 0.55, nucleo, 0.35);
  mancha(ctx, 0, 0, R * 0.22, nucleo, 0.7);
  mancha(ctx, 0, 0, R * 0.08, '#fff6e6', 0.9);
  for (let b = 0; b < brazos; b++) {
    for (let i = 0; i < 900; i++) {
      const t = Math.pow(r(), 0.8);
      const ang = b * (Math.PI * 2 / brazos) + t * Math.PI * 2 * vueltas;
      const d = R * (0.12 + t * 0.88) + gauss(r) * R * 0.07 * (0.5 + t);
      const x = Math.cos(ang) * d, y = Math.sin(ang) * d;
      const c = r() < 0.12 ? colores.find(c => c.hex === '#e0476a') || luz[0] : elegirColor(luz.length ? luz : colores, r);
      mancha(ctx, x, y, 3 + r() * 8 * (1 - t * 0.5), c.hex, 0.13);
    }
  }
  // brillo difuso del disco
  for (let i = 0; i < 120; i++) mancha(ctx, gauss(r) * R * 0.6, gauss(r) * R * 0.6, R * 0.2, (luz[0] || colores[0]).hex, 0.025);
}

function galaxiaDeCanto(ctx, R, r, colores) {
  mancha(ctx, 0, 0, R * 0.35, '#ffd9a0', 0.5);
  for (let i = 0; i < 700; i++) {
    const x = gauss(r) * R, y = gauss(r) * R * 0.09;
    mancha(ctx, x, y, 2 + r() * 5, elegirColor(colores.filter(c => c.hex !== POLVO), r).hex, 0.1);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 160; i++) mancha(ctx, gauss(r) * R * 0.9, R * 0.01 + gauss(r) * R * 0.015, 4 + r() * 4, '#000000', 0.6);
  ctx.restore();
}

// ---------- formas ----------

function pintar(ctx, objeto, R) {
  const r = azar(objeto.id);
  const ruido = crearRuido(r);
  const colores = objeto.colores;
  const luz = colores.filter(c => c.hex !== POLVO);
  const pesoPolvo = colores.find(c => c.hex === POLVO)?.peso || 0;
  const porHex = hex => luz.find(c => c.hex === hex);

  switch (objeto.forma) {
    case 'anillo': {
      // Oxígeno verde azulado dentro, hidrógeno y nitrógeno rojos en el borde.
      const dentro = porHex('#3fd0c0') || luz[0], borde = luz.filter(c => c !== dentro);
      for (let i = 0; i < 2600; i++) {
        const ang = r() * Math.PI * 2, u = Math.sqrt(r());
        const rad = u * R * 0.62 + gauss(r) * R * 0.04;
        const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad * 0.8;
        const ext = rad / (R * 0.62);
        const c = ext > 0.72 ? elegirColor(borde, r) : dentro;
        const a = ext > 0.72 ? 0.09 : 0.035 + ext * 0.04;
        mancha(ctx, x, y, 5 + r() * 9, c.hex, a * 0.8 * (0.7 + ruido(x / R * 4 + 5, y / R * 4) * 0.8));
      }
      estrella(ctx, 0, 0, 1.6, '#ffffff');
      break;
    }
    case 'burbuja': {
      gas(ctx, R, r, ruido, luz.filter(c => c.hex !== '#3fd0c0'), { n: 2200, dispX: 0.9, dispY: 0.7 });
      const borde = porHex('#3fd0c0') || luz[0];
      for (let i = 0; i < 900; i++) { // la cáscara de la burbuja
        const ang = r() * Math.PI * 2, rad = R * 0.3 * (1 + gauss(r) * 0.06);
        mancha(ctx, R * 0.15 + Math.cos(ang) * rad, -R * 0.1 + Math.sin(ang) * rad, 3 + r() * 5, (r() < 0.6 ? borde : luz[0]).hex, 0.045);
      }
      estrella(ctx, R * 0.08, -R * 0.12, 2.2, '#a9c4ff', true);
      break;
    }
    case 'filamentos': {
      // Cangrejo: brillo azul pálido por dentro y filamentos rojos por fuera.
      const sinc = porHex('#7aa8ff') || luz[0];
      for (let i = 0; i < 260; i++) mancha(ctx, gauss(r) * R * 0.55, gauss(r) * R * 0.38, 8 + r() * 18, sinc.hex, 0.05);
      const fil = luz.filter(c => c !== sinc);
      for (let f = 0; f < 70; f++) {
        let ang = r() * Math.PI * 2, x = Math.cos(ang) * R * 0.15, y = Math.sin(ang) * R * 0.1;
        const c = elegirColor(fil, r);
        for (let p = 0; p < 30; p++) {
          ang += gauss(r) * 0.5;
          x += Math.cos(ang) * R * 0.025; y += Math.sin(ang) * R * 0.02;
          if (Math.hypot(x / 0.75, y / 0.52) > R) break;
          mancha(ctx, x, y, 2 + r() * 3, c.hex, 0.14);
        }
      }
      estrella(ctx, 0, 0, 1.2, '#ffffff');
      break;
    }
    case 'espiral_de_frente':
      espiral(ctx, R, r, colores, { brazos: 2, vueltas: 1.7 });
      polvo(ctx, R, r, ruido, pesoPolvo, { dispX: 0.6, dispY: 0.6 });
      break;
    case 'espiral_inclinada':
      ctx.save(); ctx.rotate(-0.6); ctx.scale(1, 0.32);
      espiral(ctx, R * 1.05, r, colores, { brazos: 2, vueltas: 1.3 });
      ctx.restore();
      ctx.save(); ctx.rotate(-0.6); // franja de polvo delante del núcleo
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < Math.round(500 * pesoPolvo / 0.15); i++) mancha(ctx, gauss(r) * R * 0.8, R * 0.07 + gauss(r) * R * 0.02, 3 + r() * 5, '#000000', 0.4);
      ctx.restore();
      break;
    case 'trio_de_galaxias': {
      const tres = [[-0.45, -0.35, 0.4, 0.33, false], [0.45, -0.25, -0.3, 0.33, false], [-0.05, 0.45, 1.35, 0.4, true]];
      for (const [x, y, rot, tam, canto] of tres) {
        ctx.save(); ctx.translate(x * R, y * R); ctx.rotate(rot);
        if (canto) galaxiaDeCanto(ctx, R * tam, r, colores);
        else { ctx.scale(1, 0.4); espiral(ctx, R * tam, r, colores, { brazos: 2, vueltas: 1.1 }); }
        ctx.restore();
      }
      break;
    }
    case 'globular': {
      const nucleo = luz[0];
      mancha(ctx, 0, 0, R * 0.7, nucleo.hex, 0.18);
      mancha(ctx, 0, 0, R * 0.25, nucleo.hex, 0.45);
      const a = R * 0.13;
      for (let i = 0; i < 2600; i++) { // distribución de Plummer: muy densa en el centro
        const u = Math.max(1e-4, r());
        const rad = Math.min(R * 1.1, a / Math.sqrt(Math.pow(u, -2 / 3) - 1));
        const ang = r() * Math.PI * 2;
        const c = elegirColor(luz, r);
        ctx.fillStyle = rgba(c.hex, 0.55 + r() * 0.45);
        ctx.beginPath(); ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, 0.5 + r() * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'cumulo_abierto': {
      for (let i = 0; i < 60; i++) mancha(ctx, gauss(r) * R * 0.6, gauss(r) * R * 0.6, R * 0.25, '#6f8fe8', 0.012);
      for (let i = 0; i < 55; i++) {
        const c = elegirColor(luz, r), brillo = Math.pow(r(), 3);
        estrella(ctx, gauss(r) * R * 0.7, gauss(r) * R * 0.7, 0.8 + brillo * 2.6, c.hex, brillo > 0.5);
      }
      break;
    }
    default: { // nebulosa_difusa
      gas(ctx, R, r, ruido, luz, { n: 3200, dispX: 1, dispY: 0.85, a: 0.045 });
      gas(ctx, R, r, ruido, luz, { n: 1000, umbral: 0.55, dispX: 1, dispY: 0.85, tam: [2, 6], a: 0.08, fondo: false }); // detalle fino
      polvo(ctx, R, r, ruido, pesoPolvo, { dispX: 0.9, dispY: 0.75 });
      for (let i = 0; i < 5; i++) estrella(ctx, gauss(r) * R * 0.25, gauss(r) * R * 0.25, 1.2 + r() * 1.2, '#a9c4ff', i === 0);
    }
  }
}

// Devuelve la imagen del objeto (una vez por objeto; luego sale de la caché).
function imagenObjeto(objeto) {
  if (cache.has(objeto.id)) return cache.get(objeto.id);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = LADO_LIENZO;
  const ctx = lienzo.getContext('2d');
  ctx.translate(LADO_LIENZO / 2, LADO_LIENZO / 2);
  ctx.globalCompositeOperation = 'lighter';
  pintar(ctx, objeto, LADO_LIENZO / 2 / EXTENSION);
  const url = lienzo.toDataURL('image/png');
  cache.set(objeto.id, url);
  return url;
}

// Dibuja el objeto dentro de `padre`, centrado en (cx, cy) y con radio R.
export function dibujarObjeto(svg, padre, objeto, cx, cy, R) {
  const g = el('g', { class: 'objeto', transform: `translate(${cx} ${cy})` }, padre);
  const L = R * EXTENSION;
  el('image', { href: imagenObjeto(objeto), x: -L, y: -L, width: 2 * L, height: 2 * L, style: 'mix-blend-mode: screen' }, g);
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
