// Astraloom · nivel Aprendiz
// Las estrellas están sueltas y el jugador las arrastra a sus huecos.
// Al acercarla, su hueco la atrae; soltada lejos, vuelve con suavidad a su sitio.
// Al entrar, la figura se dibuja hilo a hilo y después las estrellas se sueltan.

import { el, crearCielo, dibujarEstrella, radioEstrella, puntoSVG, distancia, animar, suaveDoble, esperar, trazarFigura, aumento, LADO } from './svg.js';
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

export function montarAprendiz(contenedor, nivel, { alColocar, alCompletar, alEmpezar, alTocarMisterio }) {
  const svg = crearCielo(contenedor);
  svg.setAttribute('aria-label', `Constelación de ${nivel.nombre}, nivel Aprendiz`);
  const capaLineas = el('g', { class: 'guias' }, svg);
  const capaHuecos = el('g', {}, svg);
  const capaSueltas = el('g', {}, svg);
  const f = aumento(svg); // en el móvil, estrellas, huecos y zonas táctiles más grandes

  // La figura ocupa el centro y deja sitio alrededor para las estrellas sueltas.
  const huecos = nivel.aprendiz.estrellas.map(e => ({ ...e, x: 150 + e.x * 700, y: 150 + e.y * 700 }));
  const porHip = new Map(huecos.map(h => [h.hip, h]));
  const sueltas = repartir(huecos);
  const colocadas = new Set();

  const segmentos = () => nivel.lineas.map(([a, b]) => [porHip.get(a), porHip.get(b)]);
  const lineas = nivel.lineas.map(([a, b]) => {
    const pa = porHip.get(a), pb = porHip.get(b);
    return { a, b, e: el('line', { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, class: 'hilo guia' }, capaLineas) };
  });

  huecos.forEach(h => {
    h.anillo = el('circle', { cx: h.x, cy: h.y, r: (radioEstrella(h.mag) + 7) * f, class: 'hueco', 'data-hip': h.hip }, capaHuecos);
  });

  const piezas = huecos.map((h, i) => {
    const inicio = sueltas[i];
    const g = dibujarEstrella(capaSueltas, { ...h, x: inicio.x, y: inicio.y }, { class: 'estrella suelta', 'data-hip': h.hip });
    el('circle', { r: radioEstrella(h.mag) + 7, class: 'aro' }, g); // brilla junto a su hueco al tocarla
    el('circle', { r: 32, fill: 'transparent' }, g); // zona cómoda para el dedo
    return { hueco: h, g, pos: { ...inicio }, inicio, colocada: false };
  });

  const mover = (p, x, y) => { p.pos = { x, y }; p.g.setAttribute('transform', `translate(${x} ${y}) scale(${f})`); };

  piezas.forEach(p => mover(p, p.pos.x, p.pos.y)); // aplica el aumento desde el principio

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

  let arrastre = null, listo = false, salir = false, encajadas = 0;

  svg.addEventListener('pointerdown', ev => {
    if (!listo || encajadas === piezas.length) return;
    const pt = puntoSVG(svg, ev);
    const p = piezas.filter(p => !p.colocada && !p.vuela).sort((a, b) => distancia(a.pos, pt) - distancia(b.pos, pt))[0];
    if (!p || distancia(p.pos, pt) > 40 * f) { tocarHueco(pt); return; }
    ev.preventDefault();
    svg.setPointerCapture(ev.pointerId);
    arrastre = { p, dx: p.pos.x - pt.x, dy: p.pos.y - pt.y };
    capaSueltas.appendChild(p.g);
    p.g.classList.add('cogida');
    p.hueco.anillo.classList.add('destino'); // su hueco se ilumina con ella
  });

  svg.addEventListener('pointermove', ev => {
    if (!arrastre) return;
    const pt = puntoSVG(svg, ev);
    const { p } = arrastre;
    let x = pt.x + arrastre.dx, y = pt.y + arrastre.dy;
    const d = distancia({ x, y }, p.hueco);
    const cerca = d < ATRAE * f;
    if (cerca) { // atracción: la estrella se inclina hacia su hueco
      const k = (1 - d / (ATRAE * f)) * 0.45;
      x += (p.hueco.x - x) * k; y += (p.hueco.y - y) * k;
    }
    p.hueco.anillo.classList.toggle('atrae', cerca);
    mover(p, x, y);
  });

  // Otra forma de jugar: tocar un hueco vacío hace que su estrella vuele hasta él.
  function tocarHueco(pt) {
    const vacios = piezas.filter(p => !p.colocada && !p.vuela && distancia(p.hueco, pt) < (radioEstrella(p.hueco.mag) + 18) * f);
    const p = vacios.sort((a, b) => distancia(a.hueco, pt) - distancia(b.hueco, pt))[0];
    if (!p) return;
    p.vuela = true;
    capaSueltas.appendChild(p.g);
    p.g.classList.add('cogida');
    p.hueco.anillo.classList.add('destino');
    encajar(p, 1100, suaveDoble);
  }

  async function encajar(p, ms = 220, curva) {
    const desde = { ...p.pos };
    p.colocada = true;
    colocadas.add(p.hueco.hip);
    await animar(ms, t => mover(p, desde.x + (p.hueco.x - desde.x) * t, desde.y + (p.hueco.y - desde.y) * t), curva);
    p.g.classList.remove('cogida');
    p.hueco.anillo.classList.remove('destino');
    p.g.classList.add('encaja');
    p.hueco.anillo.classList.add('lleno');
    encajadas++;
    actualizarLineas();
    alColocar?.(p.hueco);
    if (encajadas < piezas.length) { pistas.reiniciar(); return; }
    pistas.parar();
    await esperar(250);
    await trazarFigura(capaLineas, segmentos(), () => salir); // la figura se arma
    if (salir) return;
    svg.classList.add('completa');
    await esperar(700);
    alCompletar();
  }

  async function soltar() {
    if (!arrastre) return;
    const { p } = arrastre;
    arrastre = null;
    p.g.classList.remove('cogida');
    p.hueco.anillo.classList.remove('atrae', 'destino');
    if (distancia(p.pos, p.hueco) < ENCAJA * f) return encajar(p);
    const desde = { ...p.pos };
    await animar(450, t => mover(p, desde.x + (p.inicio.x - desde.x) * t, desde.y + (p.inicio.y - desde.y) * t));
  }
  svg.addEventListener('pointerup', soltar);
  svg.addEventListener('pointercancel', soltar);

  // Presentación: la figura se dibuja hilo a hilo, se queda un momento y las
  // estrellas se sueltan hacia sus sitios de partida.
  async function presentar() {
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!quieto) {
      piezas.forEach(p => mover(p, p.hueco.x, p.hueco.y));
      await esperar(400);
      const brillo = await trazarFigura(capaLineas, segmentos(), () => salir);
      await esperar(1200);
      if (salir) return;
      await animar(1300, t => {
        brillo.setAttribute('opacity', 1 - t);
        piezas.forEach(p => mover(p, p.hueco.x + (p.inicio.x - p.hueco.x) * t, p.hueco.y + (p.inicio.y - p.hueco.y) * t));
      }, suaveDoble);
      brillo.remove();
    }
    if (salir) return;
    listo = true;
    alEmpezar?.();
    pistas.reiniciar();
  }
  presentar();

  // Al terminar, algo brilla escondido donde está el objeto de cielo profundo,
  // para dar curiosidad por tejer la figura en Tejedora y despertarlo.
  function mostrarMisterio() {
    const o = nivel.aprendiz.objeto;
    const lim = v => Math.min(960, Math.max(40, 150 + v * 700));
    const defs = svg.querySelector('defs');
    const gr = el('radialGradient', { id: 'gmisterio' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.85 }, gr);
    el('stop', { offset: '35%', 'stop-color': '#7fa8f0', 'stop-opacity': 0.45 }, gr);
    el('stop', { offset: '100%', 'stop-color': '#7fa8f0', 'stop-opacity': 0 }, gr);
    // El brillo, por debajo de la figura; encima solo la zona táctil invisible.
    const pos = `translate(${lim(o.x)} ${lim(o.y)})`;
    const luz = el('g', { class: 'llamada-luz', transform: pos, 'aria-hidden': 'true' });
    svg.insertBefore(luz, capaLineas);
    el('circle', { r: 46, fill: 'url(#gmisterio)', class: 'llamada-halo' }, luz);
    el('circle', { r: 20, fill: 'none', stroke: '#7fa8f0', 'stroke-width': 1.5, class: 'llamada-aro' }, luz);
    const g = el('g', { class: 'llamada misterio', transform: pos, role: 'button', tabindex: 0, 'aria-label': 'Algo duerme aquí: ir a Tejedora' }, svg);
    el('circle', { r: 60, fill: 'transparent', class: 'llamada-zona' }, g);
    g.addEventListener('click', () => alTocarMisterio?.());
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') alTocarMisterio?.(); });
  }

  return { parar: () => { salir = true; pistas.parar(); }, mostrarMisterio };
}
