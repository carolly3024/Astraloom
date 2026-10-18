// Astraloom · contador de progreso («12 de 24 hilos»)
// Una forma de píldora que ocupa todo el ancho de la tarjeta y se rellena con el
// avance. Una línea fina de luz recorre su borde despacio. Dentro puede llevar
// un detalle, como el nombre de la estrella que acaba de volver a su sitio.

const VUELTA_MS = 7000;   // una vuelta completa de la línea de luz
// La línea son varios tramos superpuestos con la misma punta: donde se juntan
// brilla más, y hacia atrás se va apagando con suavidad.
const TRAMOS = Array.from({ length: 10 }, (_, k) => 0.28 * Math.pow(0.72, k)); // parte del borde que cubre cada tramo

export function crearContador(padre, total, etiqueta = '') {
  const caja = document.createElement('div');
  caja.className = 'contador';
  caja.innerHTML = `<div class="contador-relleno"></div>
    <div class="contador-textos"><span class="contador-detalle"></span><span class="contador-texto"></span></div>
    <svg class="contador-borde" aria-hidden="true">
      <path class="contador-base"/>${TRAMOS.map(() => '<path class="contador-luz"/>').join('')}
    </svg>`;
  padre.prepend(caja); // siempre arriba de la tarjeta
  const svg = caja.querySelector('svg');
  const caminos = [...caja.querySelectorAll('path')];
  const luces = caminos.slice(1);
  const texto = caja.querySelector('.contador-texto'), detalle = caja.querySelector('.contador-detalle');
  const relleno = caja.querySelector('.contador-relleno');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let largo = 0, vivo = true;

  // El camino es el borde de la píldora, recalculado si cambia su tamaño.
  function trazar() {
    const w = caja.clientWidth, h = caja.clientHeight;
    if (!w || !h) return;
    const r = h / 2, i = 0.75; // un poco hacia dentro para que la línea no se corte
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = `M ${r} ${i} H ${w - r} A ${r - i} ${r - i} 0 0 1 ${w - r} ${h - i} H ${r} A ${r - i} ${r - i} 0 0 1 ${r} ${i} Z`;
    caminos.forEach(c => c.setAttribute('d', d));
    largo = caminos[0].getTotalLength();
    luces.forEach((c, k) => { const t = largo * TRAMOS[k]; c.setAttribute('stroke-dasharray', `${t} ${largo - t}`); });
    if (quieto) luces.forEach((c, k) => c.setAttribute('stroke-dashoffset', -largo * (TRAMOS[0] - TRAMOS[k])));
  }
  const observador = new ResizeObserver(trazar);
  observador.observe(caja);

  const t0 = performance.now();
  function girar(ahora) {
    if (!vivo) return;
    if (!caja.isConnected) { vivo = false; observador.disconnect(); return; } // se ha cambiado de pantalla
    const off = -largo * (((ahora - t0) % VUELTA_MS) / VUELTA_MS);
    luces.forEach((c, k) => c.setAttribute('stroke-dashoffset', off - largo * (TRAMOS[0] - TRAMOS[k])));
    requestAnimationFrame(girar);
  }
  if (!quieto) requestAnimationFrame(girar);

  function poner(n, textoDetalle = '') {
    texto.textContent = `${n} de ${total}${etiqueta}`;
    detalle.textContent = textoDetalle;
    caja.classList.toggle('con-detalle', !!textoDetalle);
    relleno.style.width = `${(n / total) * 100}%`;
    caja.classList.toggle('lleno', n >= total);
  }
  poner(0);

  return {
    poner,
    quitar() { vivo = false; observador.disconnect(); caja.remove(); },
  };
}
