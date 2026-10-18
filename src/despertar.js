// Astraloom · el despertar del objeto de cielo profundo
// Gráficos provisionales: la forma sale de `objeto.forma` y los colores de
// `objeto.colores` (con su peso). El arte final llega en la fase 4.

import { el, animar, azar } from './svg.js';

const POLVO = '#2a1c22';

function gradiente(defs, hex, id) {
  if (defs.querySelector(`#${id}`)) return `url(#${id})`;
  const g = el('radialGradient', { id }, defs);
  el('stop', { offset: '0%', 'stop-color': hex, 'stop-opacity': 0.85 }, g);
  el('stop', { offset: '55%', 'stop-color': hex, 'stop-opacity': 0.3 }, g);
  el('stop', { offset: '100%', 'stop-color': hex, 'stop-opacity': 0 }, g);
  return `url(#${id})`;
}

// Elige un color según su peso.
function elegirColor(colores, r) {
  let x = r() * colores.reduce((s, c) => s + c.peso, 0);
  for (const c of colores) { x -= c.peso; if (x <= 0) return c; }
  return colores[0];
}

function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }

function nube(g, defs, colores, R, r, { estirar = 1, cantidad = 16 } = {}) {
  const luz = colores.filter(c => c.hex !== POLVO);
  for (let i = 0; i < cantidad; i++) {
    const c = elegirColor(luz, r);
    const rad = R * (0.25 + r() * 0.4);
    el('ellipse', {
      cx: gauss(r) * R * 0.55, cy: gauss(r) * R * 0.45,
      rx: rad * estirar, ry: rad / estirar,
      transform: `rotate(${r() * 180})`,
      fill: gradiente(defs, c.hex, `g${c.hex.slice(1)}`),
    }, g);
  }
}

function polvo(g, defs, colores, R, r) {
  const c = colores.find(c => c.hex === POLVO);
  if (!c) return;
  const n = Math.round(c.peso * 20);
  for (let i = 0; i < n; i++) {
    el('ellipse', {
      cx: gauss(r) * R * 0.5, cy: gauss(r) * R * 0.4, rx: R * (0.12 + r() * 0.2), ry: R * 0.05,
      transform: `rotate(${r() * 180})`, fill: gradiente(defs, POLVO, 'gpolvo'), opacity: 0.9,
    }, g);
  }
}

function puntos(g, colores, R, r, n, { dispersion = 0.5, tam = [0.6, 1.6] } = {}) {
  const luz = colores.filter(c => c.hex !== POLVO);
  for (let i = 0; i < n; i++) {
    const c = elegirColor(luz, r);
    el('circle', {
      cx: gauss(r) * R * dispersion, cy: gauss(r) * R * dispersion,
      r: tam[0] + r() * (tam[1] - tam[0]), fill: c.hex, opacity: 0.6 + r() * 0.4,
    }, g);
  }
}

function espiral(g, defs, colores, R, r) {
  const [nucleo, ...resto] = [...colores].filter(c => c.hex !== POLVO).sort((a, b) => b.peso - a.peso);
  const brazos = resto.length ? resto : [nucleo];
  for (let brazo = 0; brazo < 2; brazo++) {
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const ang = brazo * Math.PI + t * Math.PI * 2.4;
      const d = R * (0.12 + t * 0.85);
      const c = brazos[i % brazos.length];
      el('circle', {
        cx: Math.cos(ang) * d + gauss(r) * R * 0.06, cy: Math.sin(ang) * d + gauss(r) * R * 0.06,
        r: R * (0.05 + r() * 0.07) * (1 - t * 0.5), fill: gradiente(defs, c.hex, `g${c.hex.slice(1)}`),
      }, g);
    }
  }
  el('circle', { r: R * 0.32, fill: gradiente(defs, nucleo.hex, `g${nucleo.hex.slice(1)}`) }, g);
}

function galaxiaPequena(g, defs, colores, R, r, cx, cy, rot, ry) {
  const s = el('g', { transform: `translate(${cx} ${cy}) rotate(${rot}) scale(1 ${ry})` }, g);
  const luz = colores.filter(c => c.hex !== POLVO);
  el('circle', { r: R, fill: gradiente(defs, luz[1]?.hex || luz[0].hex, `g${(luz[1]?.hex || luz[0].hex).slice(1)}`) }, s);
  el('circle', { r: R * 0.45, fill: gradiente(defs, luz[0].hex, `g${luz[0].hex.slice(1)}`) }, s);
}

// Dibuja el objeto dentro de `padre`, centrado en (cx, cy) y con radio R.
export function dibujarObjeto(svg, padre, objeto, cx, cy, R) {
  const defs = svg.querySelector('defs');
  const r = azar(objeto.id);
  const g = el('g', { class: 'objeto', transform: `translate(${cx} ${cy})` }, padre);
  const colores = objeto.colores;
  const luz = colores.filter(c => c.hex !== POLVO).sort((a, b) => b.peso - a.peso);

  switch (objeto.forma) {
    case 'anillo': {
      el('ellipse', { rx: R * 0.55, ry: R * 0.45, fill: gradiente(defs, luz[0].hex, `g${luz[0].hex.slice(1)}`) }, g);
      luz.slice(1).forEach((c, i) => el('ellipse', {
        rx: R * (0.5 + i * 0.08), ry: R * (0.4 + i * 0.07), fill: 'none',
        stroke: c.hex, 'stroke-width': R * 0.14, opacity: 0.55, filter: 'url(#brillo)',
      }, g));
      el('circle', { r: 2, fill: '#ffffff' }, g); // la enana blanca central
      break;
    }
    case 'burbuja':
      nube(g, defs, colores, R, r, { cantidad: 10 });
      el('circle', { cx: R * 0.1, cy: -R * 0.05, r: R * 0.38, fill: 'none', stroke: luz[1]?.hex || luz[0].hex, 'stroke-width': R * 0.05, opacity: 0.7, filter: 'url(#brillo)' }, g);
      break;
    case 'filamentos':
      nube(g, defs, colores, R, r, { estirar: 2.2, cantidad: 22 });
      break;
    case 'espiral_de_frente':
      espiral(g, defs, colores, R, r);
      break;
    case 'espiral_inclinada': {
      const s = el('g', { transform: 'rotate(-35) scale(1 0.38)' }, g);
      espiral(s, defs, colores, R * 1.1, r);
      break;
    }
    case 'trio_de_galaxias':
      galaxiaPequena(g, defs, colores, R * 0.32, r, -R * 0.45, -R * 0.35, 20, 0.4);
      galaxiaPequena(g, defs, colores, R * 0.32, r, R * 0.5, -R * 0.2, -15, 0.45);
      galaxiaPequena(g, defs, colores, R * 0.42, r, -R * 0.05, R * 0.5, 80, 0.15);
      break;
    case 'globular':
      el('circle', { r: R * 0.5, fill: gradiente(defs, luz[0].hex, `g${luz[0].hex.slice(1)}`) }, g);
      puntos(g, colores, R, r, 260, { dispersion: 0.45, tam: [0.6, 1.8] });
      break;
    case 'cumulo_abierto':
      puntos(g, colores, R, r, 45, { dispersion: 0.7, tam: [1.5, 4.5] });
      break;
    default: // nebulosa_difusa
      nube(g, defs, colores, R, r, { cantidad: 20 });
  }
  polvo(g, defs, colores, R, r);
  return g;
}

// Estallido de estrellitas desde (cx, cy).
export function estallido(svg, cx, cy, colores) {
  const g = el('g', { class: 'estallido' }, svg);
  const r = Math.random;
  const ps = Array.from({ length: 110 }, (_, i) => {
    const ang = r() * Math.PI * 2, v = 60 + r() * 260;
    const c = i % 3 === 0 ? '#ffffff' : elegirColor(colores.filter(c => c.hex !== POLVO), r).hex;
    return { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, e: el('circle', { cx, cy, r: 1 + r() * 2.4, fill: c }, g) };
  });
  return animar(1300, (t, lineal) => {
    for (const p of ps) {
      p.e.setAttribute('cx', cx + p.vx * t);
      p.e.setAttribute('cy', cy + p.vy * t);
      p.e.setAttribute('opacity', 1 - lineal);
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
  await new Promise(res => setTimeout(res, 250));
  await animar(1800, t => {
    capa.setAttribute('opacity', t);
    obj.setAttribute('transform', `translate(${cx} ${cy}) scale(${0.2 + 0.8 * t})`);
  });
  await fin;
}
