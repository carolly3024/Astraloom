// Astraloom · nivel Tejedora
// Las estrellas están en su posición real, entre estrellas vecinas y sin guías.
// Se traza un hilo de una estrella a otra (arrastrando, o tocando una y luego otra).
// Si la unión existe en la figura, el hilo se queda; si no, se deshace con suavidad.

import { el, crearCielo, dibujarEstrella, puntoSVG, distancia, animar } from './svg.js';
import { crearPistas } from './pistas.js';

const ALCANCE = 42; // distancia máxima para «tocar» una estrella
const clave = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const aCielo = p => ({ ...p, x: 40 + p.x * 920, y: 40 + p.y * 920 });

export function montarTejedora(contenedor, nivel, { alTejer, alCompletar }) {
  const svg = crearCielo(contenedor);
  svg.setAttribute('aria-label', `Cielo de ${nivel.nombre}, nivel Tejedora`);
  const capaFigura = el('g', { class: 'figura-oculta' }, svg);
  const capaHilos = el('g', {}, svg);
  const capaEstrellas = el('g', {}, svg);

  const vistas = new Set();
  const estrellas = [...nivel.tejedora.estrellas, ...nivel.tejedora.fondo]
    .filter(e => !vistas.has(e.hip) && vistas.add(e.hip))
    .map(aCielo);
  const porHip = new Map(estrellas.map(e => [e.hip, e]));
  for (const e of estrellas) e.g = dibujarEstrella(capaEstrellas, e, { 'data-hip': e.hip });

  const pendientes = new Map(nivel.lineas.map(([a, b]) => [clave(a, b), [a, b]]));
  const total = pendientes.size;
  const objeto = aCielo(nivel.tejedora.objeto);

  // La figura completa, escondida: se ve un momento con «Ver la figura».
  for (const [a, b] of pendientes.values()) {
    const pa = porHip.get(a), pb = porHip.get(b);
    el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'hilo guia' }, capaFigura);
  }

  const tejidas = new Set();
  const temporal = el('line', { class: 'hilo temporal', visibility: 'hidden' }, svg);
  let origen = null, elegida = null, pistaLinea = null;

  const masCercana = pt => {
    let mejor = null, d = ALCANCE;
    for (const e of estrellas) { const de = distancia(e, pt); if (de < d) { d = de; mejor = e; } }
    return mejor;
  };

  function marcar(e, si) { e?.g.classList.toggle('elegida', si); }

  function hilo(a, b, cls) {
    return el('line', { x1: a.x, y1: a.y, x2: a.x, y2: a.y, class: `hilo ${cls}` }, capaHilos);
  }

  async function intentar(a, b) {
    if (!a || !b || a === b) return;
    const k = clave(a.hip, b.hip);
    if (tejidas.has(k)) return;
    if (pendientes.has(k)) {
      pendientes.delete(k);
      tejidas.add(k);
      const l = hilo(a, b, 'tejido');
      animar(350, t => { l.setAttribute('x2', a.x + (b.x - a.x) * t); l.setAttribute('y2', a.y + (b.y - a.y) * t); });
      alTejer?.(tejidas.size, total);
      if (!pendientes.size) {
        pistas.parar();
        await new Promise(r => setTimeout(r, 450));
        svg.classList.add('completa');
        alCompletar();
      } else {
        pistas.reiniciar();
      }
    } else { // hilo equivocado: se deshace sin ruido ni contador
      const l = hilo(a, b, 'deshecho');
      l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      await animar(800, t => l.setAttribute('opacity', 0.6 * (1 - t)));
      l.remove();
    }
  }

  const pistas = crearPistas({
    primera() {
      // Prefiere un hilo que salga de lo ya tejido, para seguir por donde se iba.
      const lista = [...pendientes.values()];
      const tocadas = new Set([...tejidas].flatMap(k => k.split('-').map(Number)));
      const [a, b] = lista.find(([a, b]) => tocadas.has(a) || tocadas.has(b)) || lista[0];
      const desde = tocadas.has(b) ? b : a;
      pistaLinea = { a: porHip.get(desde), b: porHip.get(desde === a ? b : a) };
      pistaLinea.a.g.classList.add('late');
    },
    segunda() {
      if (!pistaLinea) return;
      const { a, b } = pistaLinea;
      pistaLinea.e = el('line', { x1: a.x, y1: a.y, x2: a.x + (b.x - a.x) * 0.3, y2: a.y + (b.y - a.y) * 0.3, class: 'hilo insinuado' }, capaHilos);
    },
    limpiar() {
      if (!pistaLinea) return;
      pistaLinea.a.g.classList.remove('late');
      pistaLinea.e?.remove();
      pistaLinea = null;
    },
  });

  svg.addEventListener('pointerdown', ev => {
    const pt = puntoSVG(svg, ev);
    const e = masCercana(pt);
    if (!e) { marcar(elegida, false); elegida = null; return; }
    ev.preventDefault();
    if (elegida && elegida !== e) { // modo toque: segunda estrella
      const a = elegida;
      marcar(a, false); elegida = null;
      intentar(a, e);
      return;
    }
    svg.setPointerCapture(ev.pointerId);
    origen = e;
    marcar(e, true);
    temporal.setAttribute('x1', e.x); temporal.setAttribute('y1', e.y);
    temporal.setAttribute('x2', e.x); temporal.setAttribute('y2', e.y);
    temporal.setAttribute('visibility', 'visible');
  });

  svg.addEventListener('pointermove', ev => {
    if (!origen) return;
    const pt = puntoSVG(svg, ev);
    const e = masCercana(pt);
    const fin = e && e !== origen ? e : pt; // el hilo se engancha a la estrella cercana
    temporal.setAttribute('x2', fin.x); temporal.setAttribute('y2', fin.y);
  });

  function soltar(ev) {
    if (!origen) return;
    temporal.setAttribute('visibility', 'hidden');
    const e = masCercana(puntoSVG(svg, ev));
    const a = origen;
    origen = null;
    if (e && e !== a) { marcar(a, false); elegida = null; intentar(a, e); }
    else if (e === a) { elegida = a; } // se ha tocado sin arrastrar: espera la segunda
    else { marcar(a, false); elegida = null; }
  }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  pistas.reiniciar();
  return {
    objeto,
    verFigura() {
      capaFigura.classList.add('visible');
      setTimeout(() => capaFigura.classList.remove('visible'), 2500);
    },
    parar: () => pistas.parar(),
    svg,
  };
}
