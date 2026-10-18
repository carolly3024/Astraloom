// Astraloom · contador de progreso («12 de 24 hilos»)
// Una forma de píldora que ocupa todo el ancho de la tarjeta, se rellena con el
// avance y lleva una estrellita dando vueltas despacio por su borde.

const NS = 'http://www.w3.org/2000/svg';
const VUELTA_MS = 9000; // una vuelta completa de la estrellita

export function crearContador(padre, total, etiqueta = '') {
  const caja = document.createElement('div');
  caja.className = 'contador';
  caja.innerHTML = `<div class="contador-relleno"></div><span class="contador-texto"></span>
    <svg class="contador-borde" aria-hidden="true"><path class="contador-camino"/>
    <g class="contador-estrella"><circle r="8" class="contador-halo"/><circle r="2.6" class="contador-punto"/></g></svg>`;
  padre.prepend(caja); // siempre arriba de la tarjeta
  const svg = caja.querySelector('svg'), camino = caja.querySelector('path'), estrella = caja.querySelector('g');
  const texto = caja.querySelector('.contador-texto'), relleno = caja.querySelector('.contador-relleno');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let largo = 0, vivo = true;

  function colocar(fraccion) {
    if (!largo) return;
    const p = camino.getPointAtLength(fraccion * largo);
    estrella.setAttribute('transform', `translate(${p.x} ${p.y})`);
  }

  // El camino es el borde de la píldora, recalculado si cambia el ancho.
  function trazar() {
    const w = caja.clientWidth, h = caja.clientHeight;
    if (!w || !h) return;
    const r = h / 2;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    camino.setAttribute('d', `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`);
    largo = camino.getTotalLength();
    if (quieto) colocar(0);
  }
  const observador = new ResizeObserver(trazar);
  observador.observe(caja);

  const t0 = performance.now();
  function girar(ahora) {
    if (!vivo) return;
    if (!caja.isConnected) { vivo = false; observador.disconnect(); return; } // se ha cambiado de pantalla
    colocar(((ahora - t0) % VUELTA_MS) / VUELTA_MS);
    requestAnimationFrame(girar);
  }
  if (!quieto) requestAnimationFrame(girar);

  function poner(n) {
    texto.textContent = `${n} de ${total}${etiqueta}`;
    relleno.style.width = `${(n / total) * 100}%`;
    caja.classList.toggle('lleno', n >= total);
  }
  poner(0);

  return {
    poner,
    quitar() { vivo = false; observador.disconnect(); caja.remove(); },
  };
}
