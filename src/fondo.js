// Astraloom · fondo vivo: un trozo de espacio profundo pintado con colores de
// foto astronómica (gas azul, magenta y turquesa, polvo oscuro y estrellas de
// distintas temperaturas) y, encima, una malla de puntitos de luz que se
// apartan al pasar el puntero y vuelven a su sitio.

const SEPARACION = 28;    // distancia entre puntitos (px)
const ALCANCE = 130;      // radio de influencia del puntero (px)
const EMPUJE = 26;        // cuánto se apartan como mucho (px)

export function montarFondo() {
  const capa = document.createElement('div');
  capa.className = 'fondo';
  capa.setAttribute('aria-hidden', 'true');
  capa.innerHTML = '<canvas class="fondo-espacio"></canvas><canvas class="fondo-puntos"></canvas>';
  document.body.prepend(capa);

  const espacio = capa.querySelector('.fondo-espacio');
  const lienzo = capa.querySelector('.fondo-puntos');
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
        puntos.push({ bx, by, x: bx, y: by, vx: 0, vy: 0, fase: Math.random() * Math.PI * 2, base: 0.1 + Math.random() * 0.16 });
      }
    }
    if (quieto) pintar(0);
    pintarEspacio(espacio, ancho, alto, dpr);
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
      const a = Math.min(1, p.base * titila + cerca * 0.6);
      const r = 0.9 + cerca * 1.2;
      ctx.fillStyle = cerca > 0.05 ? `rgba(${200 + 55 * cerca | 0}, ${220 + 35 * cerca | 0}, 255, ${a})` : `rgba(220, 227, 240, ${a})`;
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

// ---------- Espacio profundo ----------
// Ruido suave con semilla fija, para que el cielo de fondo sea siempre el mismo.
function ruido(semilla) {
  const T = 256, perm = new Uint8Array(T * 2), val = new Float32Array(T);
  let a = semilla >>> 0;
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < T; i++) { perm[i] = i; val[i] = r(); }
  for (let i = T - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < T; i++) perm[i + T] = perm[i];
  const s = t => t * t * (3 - 2 * t);
  const v = (x, y) => val[perm[(x & 255) + perm[y & 255]]];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const a0 = v(xi, yi), b0 = v(xi + 1, yi), a1 = v(xi, yi + 1), b1 = v(xi + 1, yi + 1);
    return a0 + (b0 - a0) * fx + (a1 - a0) * fy + (a0 - b0 - a1 + b1) * fx * fy;
  };
  return (x, y, oct = 5) => {
    let t = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { t += amp * n(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return t / (1 - Math.pow(0.5, oct));
  };
}

const suavizar = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function pintarEspacio(lienzo, ancho, alto, dpr) {
  const ctx = lienzo.getContext('2d');
  lienzo.width = ancho * dpr; lienzo.height = alto * dpr;
  // El gas se calcula a un cuarto de resolución y se amplía: así es suave y rápido.
  const w = Math.ceil(ancho / 4), h = Math.ceil(alto / 4);
  const gas = new ImageData(w, h);
  const forma = ruido(7), tinte = ruido(21), polvo = ruido(42), turquesa = ruido(77);
  const esc = 3.2 / Math.max(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x * esc, v = y * esc;
      // Una banda diagonal, como un brazo de la galaxia, con nubes deformadas.
      const banda = Math.exp(-Math.pow((v - u * 0.45 - 0.35) / 0.55, 2));
      const nube = forma(u + 0.6 * forma(u + 3, v), v + 0.6 * forma(u, v + 5));
      const fino = 0.65 + 0.7 * forma(u * 6 + 11, v * 6, 3); // textura fina del gas
      const d = suavizar(0.38, 0.85, nube) * (0.35 + 0.65 * banda) * fino;
      const k = tinte(u * 0.7 + 9, v * 0.7);           // azul ↔ magenta
      const tq = 0.8 * suavizar(0.58, 0.82, turquesa(u * 0.9, v * 0.9 + 4)); // zonas turquesa
      const sombra = 1 - 0.85 * suavizar(0.5, 0.75, polvo(u * 1.6 + 2, v * 1.6)); // polvo oscuro
      let r = 22 + (150 - 22) * k, g = 45 + (35 - 45) * k, b = 150 + (105 - 150) * k;
      r += (15 - r) * tq; g += (115 - g) * tq; b += (125 - b) * tq;
      const brillo = d * sombra * 0.62;
      const halo = 0.05 * banda * sombra; // un poco de luz difusa a lo largo de la banda
      const i = (y * w + x) * 4;
      gas.data[i] = 2 + r * brillo + 40 * halo;
      gas.data[i + 1] = 3 + g * brillo + 45 * halo;
      gas.data[i + 2] = 8 + b * brillo + 70 * halo;
      gas.data[i + 3] = 255;
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').putImageData(gas, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'blur(1px)';
  ctx.drawImage(tmp, 0, 0, ancho, alto);
  ctx.filter = 'none';

  // Estrellas: muchas débiles y pocas brillantes, con colores según su temperatura.
  let a = 12345;
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  const colores = ['#9bb5ff', '#c8d6ff', '#ffffff', '#fff4e8', '#ffd9a8', '#ffb98a'];
  const n = Math.round(ancho * alto / 700);
  for (let i = 0; i < n; i++) {
    const x = r() * ancho, y = r() * alto, m = Math.pow(r(), 6);
    const rad = 0.3 + m * 1.4, al = 0.25 + 0.75 * Math.min(1, m * 3 + r() * 0.3);
    ctx.globalAlpha = al;
    ctx.fillStyle = colores[(r() * colores.length) | 0];
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    if (m > 0.6) { // las brillantes llevan un halo
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rad * 5);
      gr.addColorStop(0, ctx.fillStyle + '55'); gr.addColorStop(1, ctx.fillStyle + '00');
      ctx.globalAlpha = 0.8; ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, rad * 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Viñeta: los bordes más oscuros para que el contenido respire.
  const vi = ctx.createRadialGradient(ancho / 2, alto * 0.45, Math.min(ancho, alto) * 0.3, ancho / 2, alto / 2, Math.max(ancho, alto) * 0.8);
  vi.addColorStop(0, '#00000000'); vi.addColorStop(1, '#000000a0');
  ctx.fillStyle = vi; ctx.fillRect(0, 0, ancho, alto);
}
