// Astraloom · nivel Aprendiz
// Las estrellas están sueltas y el jugador las arrastra a sus huecos.
// Al acercarla, su hueco la atrae; soltada lejos, vuelve con suavidad a su sitio.

import { el, crearCielo, dibujarEstrella, radioEstrella, puntoSVG, distancia, animar, LADO } from './svg.js';
import { crearPistas } from './pistas.js';

const ATRAE = 110;  // a esta distancia el hueco empieza a atraer
const ENCAJA = 55;  // a esta distancia, al soltar, la estrella encaja

// Coloca las estrellas sueltas en sitios libres del cielo, lejos de los huecos.
function repartir(huecos, rand = Math.random) {
  const usados = [...huecos];
  return huecos.map(() => {
    let mejor = null, mejorD = -1;
    for (let i = 0; i < 300; i++) {
      const p = { x: 50 + rand() * (LADO - 100), y: 50 + rand() * (LADO - 100) };
      const d = Math.min(...usados.map(u => distancia(u, p)));
      if (d > 90) { mejor = p; break; }
      if (d > mejorD) { mejorD = d; mejor = p; }
    }
    usados.push(mejor);
    return mejor;
  });
}

export function montarAprendiz(contenedor, nivel, { alColocar, alCompletar }) {
  const svg = crearCielo(contenedor);
  svg.setAttribute('aria-label', `Constelación de ${nivel.nombre}, nivel Aprendiz`);
  const capaLineas = el('g', { class: 'guias' }, svg);
  const capaHuecos = el('g', {}, svg);
  const capaSueltas = el('g', {}, svg);

  // La figura ocupa el centro y deja sitio alrededor para las estrellas sueltas.
  const huecos = nivel.aprendiz.estrellas.map(e => ({ ...e, x: 150 + e.x * 700, y: 150 + e.y * 700 }));
  const porHip = new Map(huecos.map(h => [h.hip, h]));
  const sueltas = repartir(huecos);
  const colocadas = new Set();

  const lineas = nivel.lineas.map(([a, b]) => {
    const pa = porHip.get(a), pb = porHip.get(b);
    return { a, b, e: el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'hilo guia' }, capaLineas) };
  });

  huecos.forEach(h => {
    h.anillo = el('circle', { cx: h.x, cy: h.y, r: radioEstrella(h.mag) + 7, class: 'hueco', 'data-hip': h.hip }, capaHuecos);
  });

  const piezas = huecos.map((h, i) => {
    const inicio = sueltas[i];
    const g = dibujarEstrella(capaSueltas, { ...h, x: inicio.x, y: inicio.y }, { class: 'estrella suelta', 'data-hip': h.hip });
    el('circle', { r: 32, fill: 'transparent' }, g); // zona cómoda para el dedo
    return { hueco: h, g, pos: { ...inicio }, inicio, colocada: false };
  });

  const mover = (p, x, y) => { p.pos = { x, y }; p.g.setAttribute('transform', `translate(${x} ${y})`); };

  function actualizarLineas() {
    for (const l of lineas) {
      if (colocadas.has(l.a) && colocadas.has(l.b)) l.e.setAttribute('class', 'hilo tejido');
    }
  }

  const pistas = crearPistas({
    primera() {
      const p = piezas.find(p => !p.colocada);
      if (p) { p.g.classList.add('late'); p.pista = true; }
    },
    segunda() {
      const p = piezas.find(p => p.pista);
      if (p) p.hueco.anillo.classList.add('late');
    },
    limpiar() {
      for (const p of piezas) { p.g.classList.remove('late'); p.hueco.anillo.classList.remove('late'); p.pista = false; }
    },
  });

  let arrastre = null;

  svg.addEventListener('pointerdown', ev => {
    const pt = puntoSVG(svg, ev);
    const p = piezas.filter(p => !p.colocada).sort((a, b) => distancia(a.pos, pt) - distancia(b.pos, pt))[0];
    if (!p || distancia(p.pos, pt) > 40) return;
    ev.preventDefault();
    svg.setPointerCapture(ev.pointerId);
    arrastre = { p, dx: p.pos.x - pt.x, dy: p.pos.y - pt.y };
    capaSueltas.appendChild(p.g);
    p.g.classList.add('cogida');
  });

  svg.addEventListener('pointermove', ev => {
    if (!arrastre) return;
    const pt = puntoSVG(svg, ev);
    const { p } = arrastre;
    let x = pt.x + arrastre.dx, y = pt.y + arrastre.dy;
    const d = distancia({ x, y }, p.hueco);
    const cerca = d < ATRAE;
    if (cerca) { // atracción: la estrella se inclina hacia su hueco
      const f = (1 - d / ATRAE) * 0.45;
      x += (p.hueco.x - x) * f; y += (p.hueco.y - y) * f;
    }
    p.hueco.anillo.classList.toggle('atrae', cerca);
    mover(p, x, y);
  });

  async function soltar() {
    if (!arrastre) return;
    const { p } = arrastre;
    arrastre = null;
    p.g.classList.remove('cogida');
    p.hueco.anillo.classList.remove('atrae');
    const desde = { ...p.pos };
    if (distancia(p.pos, p.hueco) < ENCAJA) {
      p.colocada = true;
      colocadas.add(p.hueco.hip);
      await animar(220, t => mover(p, desde.x + (p.hueco.x - desde.x) * t, desde.y + (p.hueco.y - desde.y) * t));
      p.g.classList.add('encaja');
      p.hueco.anillo.classList.add('lleno');
      actualizarLineas();
      alColocar?.(p.hueco);
      if (colocadas.size === piezas.length) {
        pistas.parar();
        svg.classList.add('completa');
        setTimeout(() => alCompletar(), 700);
      } else {
        pistas.reiniciar();
      }
    } else {
      await animar(450, t => mover(p, desde.x + (p.inicio.x - desde.x) * t, desde.y + (p.inicio.y - desde.y) * t));
    }
  }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  pistas.reiniciar();
  return { parar: () => pistas.parar() };
}
