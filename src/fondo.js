// Astraloom · fondo vivo: una nebulosa suave que se mueve despacio y una malla
// de puntitos de luz que se apartan al pasar el puntero y vuelven a su sitio.

const SEPARACION = 28;    // distancia entre puntitos (px)
const ALCANCE = 130;      // radio de influencia del puntero (px)
const EMPUJE = 26;        // cuánto se apartan como mucho (px)

export function montarFondo() {
  const capa = document.createElement('div');
  capa.className = 'fondo';
  capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = '<div class="fondo-nebulosa"><span></span><span></span><span></span></div><canvas></canvas>';
  document.body.prepend(capa);

  const lienzo = capa.querySelector('canvas');
  const ctx = lienzo.getContext('2d');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let puntos = [], ancho = 0, alto = 0, dpr = 1;
  const puntero = { x: -9999, y: -9999 };

  function crear() {
    dpr = Math.min(2, devicePixelRatio || 1);
    ancho = innerWidth; alto = innerHeight;
    lienzo.width = ancho * dpr; lienzo.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    puntos = [];
    for (let y = SEPARACION / 2; y < alto; y += SEPARACION) {
      for (let x = SEPARACION / 2; x < ancho; x += SEPARACION) {
        const bx = x + (Math.random() - 0.5) * 10, by = y + (Math.random() - 0.5) * 10;
        puntos.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, fase: Math.random() * Math.PI * 2, base: 0.16 + Math.random() * 0.2 });
      }
    }
    if (quieto) pintar(0);
  }

  function pintar(t) {
    ctx.clearRect(0, 0, ancho, alto);
    for (const p of puntos) {
      const dx = p.bx - puntero.x, dy = p.by - puntero.y, d = Math.hypot(dx, dy);
      let cerca = 0;
      if (!quieto) {
        let tx = p.bx, ty = p.by;
        if (d < ALCANCE && d > 0.01) {
          cerca = 1 - d / ALCANCE;
          const f = EMPUJE * cerca * cerca;
          tx += (dx / d) * f; ty += (dy / d) * f;
        }
        // Muelle suave hacia su sitio: se aparta rápido y vuelve con calma.
        p.vx = (p.vx + (tx - p.x) * 0.06) * 0.82;
        p.vy = (p.vy + (ty - p.y) * 0.06) * 0.82;
        p.x += p.vx; p.y += p.vy;
      }
      const titila = 0.75 + 0.25 * Math.sin(t * 0.0012 + p.fase);
      const a = Math.min(1, p.base * titila + cerca * 0.75);
      const r = 0.9 + cerca * 1.2;
      ctx.fillStyle = cerca > 0.05 ? `rgba(${170 + 60 * cerca | 0}, ${200 + 40 * cerca | 0}, 255, ${a})` : `rgba(220, 227, 240, ${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function bucle(t) {
    if (!document.hidden) pintar(t);
    requestAnimationFrame(bucle);
  }

  addEventListener('pointermove', ev => { puntero.x = ev.clientX; puntero.y = ev.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { puntero.x = puntero.y = -9999; });
  let espera;
  addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(crear, 150); });
  crear();
  if (!quieto) requestAnimationFrame(bucle);
}
