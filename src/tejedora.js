// Astraloom · nivel Tejedora
// Las estrellas están en su posición real, entre estrellas vecinas. La figura se
// ve como guía tenue (carolly, 2026-10-18: de memoria resultaba demasiado difícil).
// Se traza un hilo de una estrella a otra: dibujando de un trazo por varias estrellas,
// arrastrando entre dos, o tocando una y luego otra.
// Si la unión existe en la figura, el hilo se queda; si no, se deshace con suavidad.

import { el, crearCielo, dibujarEstrella, puntoSVG, distancia, animar, esperar, trazarFigura } from './svg.js';
import { crearPistas } from './pistas.js';

const ALCANCE = 42; // distancia máxima para «tocar» una estrella
const PASO = 26;    // al dibujar, pasar así de cerca de una estrella la engancha
const clave = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const aCielo = p => ({ ...p, x: 40 + p.x * 920, y: 40 + p.y * 920 });

export function montarTejedora(contenedor, nivel, { alTejer, alCompletar, alDespertar }) {
  const svg = crearCielo(contenedor);
  svg.setAttribute('aria-label', `Cielo de ${nivel.nombre}, nivel Tejedora`);
  const capaFigura = el('g', { class: 'figura' }, svg);
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

  // La figura, como guía tenue que el jugador repasa con hilos.
  for (const [a, b] of pendientes.values()) {
    const pa = porHip.get(a), pb = porHip.get(b);
    el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'hilo guia' }, capaFigura);
  }

  const tejidas = new Set();
  const temporal = el('line', { class: 'hilo temporal', visibility: 'hidden' }, svg);
  let origen = null, elegida = null, pistaLinea = null, dibujado = false, inicio = null;
  let terminado = false, salir = false, llamada = null;

  // Al terminar, el sitio del objeto brilla y late para invitar a tocarlo.
  function llamar() {
    const c = nivel.tejedora.objeto.colores[0]?.hex || '#7fa8f0';
    const defs = svg.querySelector('defs');
    const gr = el('radialGradient', { id: 'gllamada' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.9 }, gr);
    el('stop', { offset: '35%', 'stop-color': c, 'stop-opacity': 0.55 }, gr);
    el('stop', { offset: '100%', 'stop-color': c, 'stop-opacity': 0 }, gr);
    llamada = el('g', { class: 'llamada', transform: `translate(${objeto.x} ${objeto.y})`, role: 'button', tabindex: 0, 'aria-label': 'Despertar el objeto escondido' }, svg);
    el('circle', { r: 60, fill: 'url(#gllamada)', class: 'llamada-halo' }, llamada);
    el('circle', { r: 26, fill: 'none', stroke: c, 'stroke-width': 2, class: 'llamada-aro' }, llamada);
    el('circle', { r: 75, fill: 'transparent' }, llamada);
    const tocar = () => { if (llamada) alDespertar?.(); };
    llamada.addEventListener('click', tocar);
    llamada.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') tocar(); });
  }

  const masCercana = (pt, alcance = ALCANCE, valida = () => true) => {
    let mejor = null, d = alcance;
    for (const e of estrellas) { const de = distancia(e, pt); if (de < d && valida(e)) { d = de; mejor = e; } }
    return mejor;
  };
  // La estrella cercana que sigue la figura desde `desde` (sin contar `desde`).
  // Así se pueden unir estrellas casi pegadas, como las del escudo de Orión.
  const vecina = (pt, desde, alcance, tambienTejidas = false) => masCercana(pt, alcance, e =>
    e !== desde && (pendientes.has(clave(desde.hip, e.hip)) || (tambienTejidas && tejidas.has(clave(desde.hip, e.hip)))));

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
        terminado = true;
        pistas.parar();
        marcar(origen, false); marcar(elegida, false);
        temporal.setAttribute('visibility', 'hidden');
        await esperar(500);
        await trazarFigura(capaHilos, nivel.lineas.map(([a, b]) => [porHip.get(a), porHip.get(b)]), () => salir);
        if (salir) return;
        svg.classList.add('completa');
        await esperar(700);
        llamar();
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
    if (terminado) return;
    const pt = puntoSVG(svg, ev);
    const e = masCercana(pt);
    if (!e) { marcar(elegida, false); elegida = null; return; }
    ev.preventDefault();
    const segunda = elegida && (vecina(pt, elegida, ALCANCE) || (e !== elegida ? e : null));
    if (segunda) { // modo toque: segunda estrella
      const a = elegida;
      marcar(a, false); elegida = null;
      intentar(a, segunda);
      return;
    }
    inicio = pt;
    svg.setPointerCapture(ev.pointerId);
    origen = e;
    dibujado = false;
    marcar(e, true);
    temporal.setAttribute('x1', e.x); temporal.setAttribute('y1', e.y);
    temporal.setAttribute('x2', e.x); temporal.setAttribute('y2', e.y);
    temporal.setAttribute('visibility', 'visible');
  });

  svg.addEventListener('pointermove', ev => {
    if (!origen) return;
    const pt = puntoSVG(svg, ev);
    // Dibujo de un trazo: al pasar por una estrella que sigue la figura, el hilo
    // se teje y el trazo continúa desde ella. Las demás estrellas no lo cortan.
    const paso = vecina(pt, origen, PASO, true);
    if (paso) {
      if (pendientes.has(clave(origen.hip, paso.hip))) intentar(origen, paso);
      marcar(origen, false);
      origen = paso;
      dibujado = true;
      marcar(origen, true);
      temporal.setAttribute('x1', origen.x); temporal.setAttribute('y1', origen.y);
    }
    const e = masCercana(pt);
    const fin = e && e !== origen ? e : pt; // el hilo se engancha a la estrella cercana
    temporal.setAttribute('x2', fin.x); temporal.setAttribute('y2', fin.y);
  });

  function soltar(ev) {
    if (!origen) return;
    temporal.setAttribute('visibility', 'hidden');
    const pt = puntoSVG(svg, ev);
    const a = origen;
    origen = null;
    if (!dibujado && distancia(pt, inicio) < 10) { elegida = a; return; } // un toque: espera la segunda
    // Tras dibujar un trazo, solo cuenta la estrella justo bajo el dedo al soltar.
    const alcance = dibujado ? PASO : ALCANCE;
    const e = vecina(pt, a, alcance) || masCercana(pt, alcance, x => x !== a);
    marcar(a, false); elegida = null;
    if (e) intentar(a, e);
  }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  pistas.reiniciar();
  return {
    objeto,
    parar: () => { salir = true; pistas.parar(); },
    quitarLlamada() { llamada?.remove(); llamada = null; },
    svg,
  };
}
