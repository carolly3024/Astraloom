// Astraloom · ficha de la constelación en la caja de información, mientras se juega.
// Tres partes: la silueta borrosa de lo que duerme (se aclara al avanzar), un
// mapa de todo el cielo con su sitio, y la lista de sus estrellas, que se
// encienden al colocarlas (Aprendiz) o al tejer sus hilos (Tejedora).

import { el, escapar } from './svg.js';
import { dibujarObjeto } from './despertar.js';

// Coordenadas como en un catálogo: AR 05h 35m · DEC −05° 23′
export function coordenadas({ ar, dec }) {
  const h = ((ar / 15) % 24 + 24) % 24, hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const d = Math.abs(dec), dd = Math.floor(d), dm = Math.round((d - dd) * 60);
  const dos = n => String(n).padStart(2, '0');
  return `AR ${dos(hh)}h ${dos(mm)}m · DEC ${dec < 0 ? '−' : '+'}${dos(dd)}° ${dos(dm)}′`;
}

const GRIEGAS = { Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ', Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ', Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω' };
const VOLADAS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

// Designación de catálogo: θ¹ Tau, 23 UMa o HIP 46733.
function designacion(e, id) {
  if (e.bayer) {
    const [letra, n] = e.bayer.split('-');
    return `${GRIEGAS[letra] || letra}${n ? [...n].map(c => VOLADAS[c]).join('') : ''} ${id}`;
  }
  return e.flamsteed ? `${e.flamsteed} ${id}` : `HIP ${e.hip}`;
}

const miles = n => Math.round(n).toLocaleString('es-ES');
const primeraMayuscula = t => t.charAt(0).toUpperCase() + t.slice(1);

// Mapa de todo el cielo (AR de 24h a 0h, de izquierda a derecha, como en las cartas
// celestes; DEC de +90° arriba a −90° abajo). Las otras constelaciones del juego
// salen como puntos tenues.
function mapaCielo(nivel, todos) {
  const W = 360, H = 180;
  const pos = c => ({ x: (360 - c.ar) % 360, y: 90 - c.dec });
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mapa', 'aria-hidden': 'true' });
  const rej = el('g', { class: 'mapa-rejilla' }, svg);
  for (let x = 45; x < W; x += 45) el('line', { x1: x, y1: 0, x2: x, y2: H }, rej);
  for (const y of [30, 60, 120, 150]) el('line', { x1: 0, y1: y, x2: W, y2: y }, rej);
  // La Vía Láctea: una banda suave a lo largo del ecuador galáctico (b = 0°).
  const d2r = Math.PI / 180, aPolo = 192.85948, dPolo = 27.12825 * d2r, lPolo = 122.93192;
  let tramo = [], ant = null;
  const tramos = [];
  for (let l = 0; l <= 360; l += 3) {
    const t = (lPolo - l) * d2r;
    const dec = Math.asin(Math.cos(dPolo) * Math.cos(t)) / d2r;
    const ar = ((aPolo + Math.atan2(Math.sin(t), -Math.sin(dPolo) * Math.cos(t)) / d2r) % 360 + 360) % 360;
    const q = pos({ ar, dec });
    if (ant && Math.abs(q.x - ant.x) > W / 2) { tramos.push(tramo); tramo = []; }
    tramo.push(q); ant = q;
  }
  tramos.push(tramo);
  for (const t of tramos) {
    if (t.length > 1) el('polyline', { points: t.map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '), class: 'mapa-via' }, svg);
  }
  el('line', { x1: 0, y1: 90, x2: W, y2: 90, class: 'mapa-ecuador' }, svg);
  for (const otro of todos) {
    if (otro.id === nivel.id || !otro.centro) continue;
    const p = pos(otro.centro);
    el('circle', { cx: p.x, cy: p.y, r: 2.2, class: 'mapa-otra' }, svg);
  }
  const p = pos(nivel.centro);
  el('circle', { cx: p.x, cy: p.y, r: 12, class: 'mapa-aro' }, svg);
  el('circle', { cx: p.x, cy: p.y, r: 3.2, class: 'mapa-esta' }, svg);
  return svg;
}

// modo: 'aprendiz' o 'tejedora'. todos: los niveles del juego, para el mapa.
export function montarPanel(padre, nivel, todos, modo) {
  const estrellas = [...nivel.aprendiz.estrellas].sort((a, b) => a.mag - b.mag);
  const caja = document.createElement('section');
  caja.className = 'panel-const';
  caja.innerHTML = `
    <div class="panel-cabeza">
      <figure class="silueta-marco"><div class="silueta" title="Algo duerme en este trozo de cielo"></div><figcaption>algo duerme</figcaption></figure>
      <div>
        <p class="eyebrow">Ficha de la constelación</p>
        <h3 class="latin">${escapar(nivel.latin)}</h3>
        <p class="coords">${coordenadas(nivel.centro)}</p>
        <p class="sub temporada">${escapar(primeraMayuscula(nivel.temporada))}</p>
      </div>
    </div>
    <figure class="mapa-cielo"><figcaption><span>Su lugar en el cielo</span><span>${nivel.centro.dec >= 0 ? 'cielo norte' : 'cielo sur'}</span></figcaption></figure>
    <details class="lista-estrellas"${matchMedia('(max-width: 720px)').matches ? '' : ' open'}>
      <summary><span>Estrellas de la figura</span><span class="cuenta"></span></summary>
      <ol>${estrellas.map(e => `<li data-hip="${e.hip}">
        <span class="punto" style="--color:${escapar(e.color || '#dce3f0')}"></span>
        <span class="quien"><strong>${escapar(e.nombre || designacion(e, nivel.id))}</strong>${e.nombre ? `<small>${escapar(designacion(e, nivel.id))}</small>` : ''}</span>
        <span class="medidas"><span title="Magnitud: cuanto más baja, más brillante">mag ${e.mag.toFixed(1).replace('.', ',')}</span>${e.temperatura ? `<span title="Temperatura de su superficie">${miles(e.temperatura)} K</span>` : ''}${e.distancia ? `<span title="Distancia en años luz">${miles(e.distancia)} al</span>` : ''}</span>
      </li>`).join('')}</ol>
    </details>`;
  caja.querySelector('.mapa-cielo').prepend(mapaCielo(nivel, todos));
  padre.appendChild(caja);

  // Silueta: el objeto dibujado muy borroso y tenue; se aclara con el avance.
  const lado = 200;
  const svg = el('svg', { viewBox: `${-lado / 2} ${-lado / 2} ${lado} ${lado}`, 'aria-hidden': 'true' });
  caja.querySelector('.silueta').prepend(svg);
  dibujarObjeto(svg, svg, nivel.tejedora.objeto, 0, 0, lado * 0.42);

  const encendidas = new Set();
  const cuenta = caja.querySelector('.cuenta');
  const total = estrellas.length;
  function contar() { cuenta.textContent = `${encendidas.size} de ${total}`; }
  // Aprendiz descubre hasta un 35 % de la silueta; Tejedora sigue desde ahí hasta el 85 %.
  function revelar(f) {
    const v = modo === 'aprendiz' ? 0.35 * f : 0.35 + 0.5 * f;
    caja.style.setProperty('--velo', `${(14 - 11 * v).toFixed(1)}px`);
    caja.style.setProperty('--luz', (0.2 + 0.68 * v).toFixed(2));
  }
  contar();
  revelar(0);

  return {
    encender(hip) {
      if (encendidas.has(hip)) return;
      encendidas.add(hip);
      const li = caja.querySelector(`li[data-hip="${hip}"]`);
      li?.classList.add('encendida');
      contar();
    },
    revelar,
    quitar() { caja.remove(); },
  };
}
