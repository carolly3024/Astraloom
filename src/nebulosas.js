// Astraloom · pintura de los objetos de cielo profundo, píxel a píxel.
// Cada píxel calcula cuánta luz emite el gas (ruido de Perlin con varias
// octavas, deformado para que salgan volutas), de qué color es según los
// colores reales del objeto, y cuánta luz tapa el polvo. Al final se añaden
// las estrellas, nítidas, a resolución completa. La forma sale de
// `objeto.forma`; los colores, de `objeto.colores` con su peso.

const POLVO = '#2a1c22';

// ---------- utilidades ----------

export function semilla(texto) {
  let h = 2166136261;
  for (const ch of String(texto)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const rgb = hex => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = r => (r() + r() + r() + r() - 2) / 2;

// Ruido de Perlin 2D con semilla, y fbm (varias octavas giradas para que no se note la rejilla).
function crearRuido(r) {
  const p = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; const a = r() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const f = t => t * t * t * (t * (t * 6 - 15) + 10);
  function perlin(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const g = (h, dx, dy) => gx[h] * dx + gy[h] * dy;
    const a = g(p[X + p[Y]], xf, yf), b = g(p[X + 1 + p[Y]], xf - 1, yf);
    const c = g(p[X + p[Y + 1]], xf, yf - 1), d = g(p[X + 1 + p[Y + 1]], xf - 1, yf - 1);
    const u = f(xf), v = f(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; // -0,7..0,7
  }
  const C = Math.cos(0.5), S = Math.sin(0.5);
  return (x, y, oct = 5) => {
    let t = 0, amp = 0.5;
    for (let o = 0; o < oct; o++) {
      t += amp * perlin(x, y);
      const nx = (x * C - y * S) * 2.02 + 17.3, ny = (x * S + y * C) * 2.02 - 9.1;
      x = nx; y = ny; amp *= 0.5;
    }
    return 0.5 + t * 0.9; // ≈ 0..1
  };
}
const cresta = n => 1 - Math.abs(2 * n - 1); // 1 en las crestas del ruido: filamentos

// ---------- campos de luz (x, y en radios del objeto) ----------

function campoNebulosa(x, y, c, k) {
  const { ruido, colores: [c1, c2, c3], polvo, nucleo } = k;
  const qx = ruido(x * 1.0 + 1.7, y * 1.0 + 9.2, 4), qy = ruido(x * 1.0 + 8.3, y * 1.0 + 2.8, 4);
  const wx = x * 1.4 + 1.3 * qx, wy = y * 1.4 + 1.3 * qy;
  const n = ruido(wx, wy, 6);
  const env = Math.exp(-(x * x / 0.42 + y * y / 0.3));
  const nubes = suave(0.3, 0.88, n) * env;
  const volutas = Math.pow(cresta(ruido(wx * 1.6 + 4, wy * 1.6, 5)), 3) * env * 0.35;
  const centro = Math.exp(-((x - nucleo[0]) ** 2 + (y - nucleo[1]) ** 2) / 0.05);
  let d = nubes * 1.2 + volutas + centro * 0.9 * suave(0.3, 0.7, n + 0.25);
  // Una bahía de polvo que entra hasta cerca del centro (en Orión, la «boca del pez»).
  const bx = x - nucleo[0] - 0.22, by = (y - nucleo[1] + 0.12) * 1.6;
  d *= 1 - 0.8 * suave(0.2, 0.05, Math.hypot(bx, by) + 0.08 * (ruido(x * 4, y * 4, 3) - 0.5));
  // Color: el principal, con zonas del segundo y el tercero cerca del centro.
  let col = mezcla(c1, c2, suave(0.45, 0.75, ruido(x * 1.1 + 5, y * 1.1 + 5, 3)) * 0.85);
  if (c3) col = mezcla(col, c3, centro * 0.8);
  col = mezcla(col, [1, 1, 1], centro * 0.35);
  // Polvo: vetas finas y nubes oscuras que tapan la luz.
  if (polvo) {
    const vetas = Math.pow(cresta(ruido(x * 1.5 + 31 + 0.6 * qx, y * 1.5 + 7 + 0.6 * qy, 4)), 4);
    const sombras = suave(0.5, 0.8, ruido(x * 1.1 + 50, y * 1.1 + 3, 4));
    d *= 1 - Math.min(0.85, vetas * (0.25 + polvo * 2.5) + sombras * polvo * 3.5);
  }
  c[0] = col[0] * d; c[1] = col[1] * d; c[2] = col[2] * d;
}

function campoAnillo(x, y, c, k) {
  const { ruido, dentro, borde, borde2 } = k;
  const rr = Math.hypot(x, y / 0.8) / 0.6;
  const n = ruido(x * 5 + 3, y * 5, 5), m = ruido(x * 9, y * 9 + 7, 4);
  const relleno = suave(1.08, 0.35, rr) * (0.45 + 0.55 * suave(0, 0.75, rr)) * (0.55 + 0.7 * n) * 0.55;
  const aro = Math.exp(-(((rr - 0.97) / 0.17) ** 2)) * (0.5 + 1.0 * m) * 1.3;
  const halo = Math.exp(-(((rr - 1.35) / 0.35) ** 2)) * 0.1 * (0.4 + n);
  const colAro = mezcla(borde, borde2, suave(0.4, 0.7, ruido(x * 3 + 20, y * 3, 3)));
  for (let i = 0; i < 3; i++) c[i] = dentro[i] * relleno + colAro[i] * (aro + halo);
}

function campoBurbuja(x, y, c, k) {
  const { ruido, colores: [c1], cascara, polvo } = k;
  const qx = ruido(x * 1.3 + 2, y * 1.3 + 4, 4), qy = ruido(x * 1.3 + 6, y * 1.3 + 1, 4);
  const n = ruido(x * 1.4 + 2 * qx, y * 1.4 + 2 * qy, 6);
  const env = Math.exp(-(x * x / 0.5 + y * y / 0.35));
  // La nube roja que rodea la burbuja, con una zona más densa y brillante a un lado.
  const grumo = Math.exp(-((x + 0.5) ** 2 + (y - 0.3) ** 2) / 0.09) * suave(0.4, 0.8, n) * 0.9;
  let fondo = suave(0.35, 0.9, n) * env * 0.75 + Math.pow(cresta(ruido(x * 2 + qx, y * 2 + qy, 5)), 4) * env * 0.3 + grumo;
  // La cáscara es fina y casi transparente: brilla más por el lado donde choca con la nube.
  const dx = x - 0.15, dy = y + 0.1, dist = Math.hypot(dx, dy);
  const m = ruido(x * 7, y * 7 + 3, 4);
  const lado = 0.15 + 0.85 * Math.pow(0.5 + 0.5 * Math.cos(Math.atan2(dy, dx) - 2.5), 3);
  const piel = Math.exp(-(((dist - 0.3 - 0.02 * (m - 0.5)) / 0.022) ** 2)) * (0.4 + m) * lado * 0.9;
  const interior = suave(0.31, 0.1, dist) * 0.12 * (0.6 + 0.6 * m);
  if (polvo) fondo *= 1 - Math.min(0.8, Math.pow(cresta(ruido(x * 1.5 + 40, y * 1.5, 4)), 4) * (0.3 + polvo * 3));
  for (let i = 0; i < 3; i++) c[i] = c1[i] * fondo + cascara[i] * (piel + interior);
}

function campoCangrejo(x, y, c, k) {
  const { ruido, sincrotron, filas } = k;
  const ex = x / 0.75, ey = y / 0.52;
  const borde = ruido(x * 3 + 9, y * 3, 3) * 0.25;
  const e = Math.hypot(ex, ey) + borde - 0.12;
  const dentro = suave(1.2, 0.5, e);
  // Resplandor del interior: azul blanquecino y liso (luz de sincrotrón).
  const azul = Math.exp(-e * e * 2.6) * 0.75 * (0.8 + 0.4 * ruido(x * 4, y * 4, 3));
  const qx = ruido(x * 2 + 5, y * 2, 4), qy = ruido(x * 2, y * 2 + 5, 4);
  // Red de filamentos finos, más densa y brillante hacia el borde.
  const red = Math.max(Math.pow(cresta(ruido(x * 5 + 2 * qx, y * 5 + 2 * qy, 5)), 9), 0.7 * Math.pow(cresta(ruido(x * 9 + qx, y * 9 + qy, 4)), 12));
  const fil = red * dentro * (0.35 + 1.1 * suave(0.25, 0.95, e)) * 1.7;
  const t = ruido(x * 2.2 + 30, y * 2.2 + 30, 3);
  const col = t < 0.45 ? mezcla(filas[0], filas[1], t / 0.45) : mezcla(filas[1], filas[2], (t - 0.45) / 0.55);
  for (let i = 0; i < 3; i++) c[i] = (sincrotron[i] * 0.75 + 0.25) * azul * dentro + col[i] * fil;
}

// Nebulosa Norteamérica: gas rojo con forma de continente. Una gran nube de polvo
// hace de «golfo de México» y, en su orilla, el gas se enciende en una pared brillante.
function campoContinente(x, y, c, k) {
  const { ruido, colores: [rojo, oscuro, verde] } = k;
  const qx = ruido(x * 1.2 + 1.7, y * 1.2 + 9.2, 4), qy = ruido(x * 1.2 + 8.3, y * 1.2 + 2.8, 4);
  const n = ruido(x * 1.5 + 1.2 * qx, y * 1.5 + 1.2 * qy, 6);
  const env = Math.exp(-((x + 0.1) ** 2 / 0.6 + (y + 0.05) ** 2 / 0.5));
  let d = suave(0.25, 0.85, n) * env * 1.1 + Math.pow(cresta(ruido(x * 2.5 + qx, y * 2.5 + qy, 5)), 5) * env * 0.4;
  const dg = Math.hypot(x - 0.5, (y - 0.42) * 1.15) + 0.18 * (ruido(x * 2.5 + 40, y * 2.5, 4) - 0.5);
  const golfo = Math.max(suave(0.62, 0.42, dg), suave(0.55, 0.95, x) * suave(-0.2, 0.3, y)); // y el polvo que lo separa del Pelícano
  // La pared solo recorre la orilla oeste del golfo («México»), irregular y con grumos.
  const oeste = suave(0.1, -0.6, Math.cos(Math.atan2(y - 0.42, x - 0.5)));
  const pared = Math.exp(-(((dg - 0.68 - 0.04 * (ruido(x * 5, y * 5 + 9, 3) - 0.5)) / 0.06) ** 2)) * oeste
    * (0.3 + 1.1 * Math.pow(ruido(x * 7 + 3, y * 7, 4), 2)) * suave(0.25, 0.6, n + 0.2);
  d = d * (1 - 0.88 * golfo) + pared * 0.9;
  let col = mezcla(oscuro, rojo, suave(0.15, 0.6, d));
  col = mezcla(col, verde, pared * 0.12);
  c[0] = col[0] * d; c[1] = col[1] * d; c[2] = col[2] * d;
}

// Nebulosa de la Laguna: alargada, cruzada por una franja de polvo (la «laguna»),
// con un núcleo muy brillante a un lado y un cúmulo de estrellas jóvenes al otro.
function campoLaguna(x, y, c, k) {
  const { ruido, colores: [rojo, verde], polvo } = k;
  const cs = Math.cos(-0.15), sn = Math.sin(-0.15), u = x * cs + y * sn, v = -x * sn + y * cs;
  const qx = ruido(u * 1.3 + 3, v * 1.3 + 7, 4), qy = ruido(u * 1.3 + 9, v * 1.3 + 1, 4);
  const n = ruido(u * 1.6 + 1.3 * qx, v * 1.6 + 1.3 * qy, 6);
  const env = Math.exp(-(u * u / 0.8 + v * v / 0.24));
  let d = suave(0.28, 0.85, n) * env * 1.2 + Math.pow(cresta(ruido(u * 2.4 + qx, v * 2.4 + qy, 5)), 4) * env * 0.35;
  const reloj = Math.exp(-((u - 0.3) ** 2 + (v + 0.02) ** 2) / 0.006); // el «reloj de arena», junto a la estrella más caliente
  const brillo = Math.exp(-((u - 0.3) ** 2 / 0.05 + (v + 0.02) ** 2 / 0.025)) * suave(0.3, 0.7, n) * 0.6;
  const franja = Math.abs(u + 0.12 - 0.35 * v + 0.07 * (ruido(u * 3, v * 3 + 20, 3) - 0.5));
  d = (d + brillo) * (1 - 0.85 * suave(0.09, 0.02, franja) * suave(0.5, 0.1, Math.abs(v)));
  if (polvo) d *= 1 - Math.min(0.7, Math.pow(cresta(ruido(u * 1.8 + 31, v * 1.8 + 7, 4)), 5) * polvo * 3);
  let col = mezcla(rojo, verde, suave(0.2, 0.8, brillo + reloj) * 0.35);
  col = mezcla(col, [1, 0.92, 0.95], reloj * 0.7);
  for (let i = 0; i < 3; i++) c[i] = col[i] * (d + reloj * 1.1);
}

// Una galaxia espiral en su sitio: bulbo, disco, brazos con regiones rosas y polvo.
function galaxia(x, y, g, k, c) {
  const { ruido, amarillo, azul, rosa } = k;
  const cs = Math.cos(g.giro), sn = Math.sin(g.giro);
  const u = ((x - g.x) * cs + (y - g.y) * sn) / g.tam;
  const v = (-(x - g.x) * sn + (y - g.y) * cs) / g.tam / g.q;
  const r = Math.hypot(u, v), th = Math.atan2(v, u);
  if (r > 2.2) return;
  if (g.tipo === 'eliptica') { // galaxia elíptica pequeña: un óvalo dorado y liso, sin brazos
    const luz = Math.exp(-Math.pow(r, 0.6) * 3) * g.brillo;
    for (let i = 0; i < 3; i++) c[i] += amarillo[i] * luz;
    return;
  }
  const nb = g.nucleo || 1;
  const bulbo = Math.exp(-r / (0.07 * nb)) * 1.6 + Math.exp(-r / (0.18 * nb)) * 0.5 * nb;
  const disco = Math.exp(-r / 0.32) * 1.3;
  const caos = (g.caos ?? 1.2) * ruido(u * 3 + g.x * 9, v * 3, 3);
  const ramas = g.ramas || [{ n: g.brazos, paso: g.paso, desfase: 0, peso: 1 }];
  const fases = ramas.map(b => b.n * (th - Math.log(r + 0.03) / Math.tan(b.paso)) + b.desfase + caos);
  const fase = fases[0];
  const nitidez = g.nitidez || 4;
  let brazo = 0;
  ramas.forEach((b, i) => { brazo = Math.max(brazo, b.peso * Math.pow(0.5 + 0.5 * Math.cos(fases[i]), nitidez)); });
  brazo *= suave(0.06, 0.25, r) * (0.6 + 0.8 * ruido(u * 6 + 1, v * 6, 3));
  // Regiones de hidrógeno encendido: nudos rosas pequeños a lo largo de los brazos.
  const grumos = brazo * suave(0.66, 0.82, ruido(u * 13 + 3, v * 13, 3)) * disco * 1.3 * (g.grumos || 1);
  const col = mezcla(amarillo, azul, suave(0.08, 0.6, r));
  let luz = [0, 0, 0];
  for (let i = 0; i < 3; i++) luz[i] = amarillo[i] * bulbo + col[i] * disco * (0.3 + 1.1 * brazo) + rosa[i] * grumos;
  let tapa = Math.pow(0.5 + 0.5 * Math.cos(fase - 0.9), 10) * suave(0.1, 0.35, r) * disco * 2.5 * g.polvo;
  if (g.franja) tapa += Math.exp(-((v * g.q / 0.03) ** 2)) * suave(1.2, 0.2, Math.abs(u)) * 0.9;
  const a = 1 - Math.min(0.92, tapa);
  for (let i = 0; i < 3; i++) c[i] = c[i] * a + luz[i] * a; // el polvo tapa también lo que hay detrás
}

function campoGalaxias(x, y, c, k) {
  c[0] = c[1] = c[2] = 0;
  for (const g of k.galaxias) galaxia(x, y, g, k, c);
}

function campoGlobular(x, y, c, k) {
  const r2 = (x * x + y * y) / (k.a * k.a);
  const luz = Math.pow(1 + r2, -2.5) * 0.9 + Math.exp(-Math.sqrt(x * x + y * y) / 0.5) * 0.08;
  for (let i = 0; i < 3; i++) c[i] = k.tono[i] * luz;
}

function campoCumulo(x, y, c, k) {
  const luz = Math.exp(-(x * x + y * y) / 0.5) * 0.15 * (0.6 + 0.8 * k.ruido(x * 2, y * 2, 3)); // halo azul de las estrellas jóvenes
  for (let i = 0; i < 3; i++) c[i] = k.tono[i] * luz;
}

// ---------- preparación de cada forma ----------

function preparar(objeto, r) {
  const colores = objeto.colores;
  const luz = colores.filter(c => c.hex !== POLVO).sort((a, b) => b.peso - a.peso);
  const polvo = colores.find(c => c.hex === POLVO)?.peso || 0;
  const hex = h => luz.find(c => c.hex === h);
  const ruido = crearRuido(r);
  const base = { ruido, polvo, exposicion: 1.6, estrellas: [] };
  switch (objeto.forma) {
    case 'anillo': {
      const dentro = hex('#3fd0c0') || luz[0], resto = luz.filter(c => c !== dentro && c.hex !== '#a9c4ff');
      return { ...base, campo: campoAnillo, dentro: rgb(dentro.hex), borde: rgb(resto[0]?.hex || '#e0476a'), borde2: rgb(resto[1]?.hex || resto[0]?.hex || '#c43a44'),
        estrellas: [{ x: 0, y: 0, tam: 1.3, hex: '#ffffff' }] };
    }
    case 'burbuja': {
      const piel = hex('#3fd0c0') || luz[1] || luz[0];
      for (let i = 0; i < 200; i++) base.estrellas.push({ x: gauss(r) * 1.3, y: gauss(r) * 1.3, tam: 0.35 + Math.pow(r(), 3) * 0.9, hex: '#ffffff', punto: true });
      return { ...base, campo: campoBurbuja, exposicion: 2, colores: [rgb(luz[0].hex)], cascara: rgb(piel.hex),
        estrellas: [...base.estrellas, { x: 0.25, y: -0.03, tam: 2.4, hex: '#a9c4ff', destello: true }] }; // la estrella no está en el centro
    }
    case 'filamentos': {
      const s = hex('#7aa8ff') || luz[0], f = luz.filter(c => c !== s);
      return { ...base, campo: campoCangrejo, sincrotron: rgb(s.hex), filas: [0, 1, 2].map(i => rgb((f[i] || f[0]).hex)),
        estrellas: [{ x: 0, y: 0, tam: 1.2, hex: '#ffffff' }] };
    }
    case 'espiral_de_frente':
    case 'espiral_inclinada':
    case 'trio_de_galaxias': {
      const g = {
        // Molinete: muchos brazos irregulares, núcleo pequeño y muchas regiones rosas.
        espiral_de_frente: [{ x: 0, y: 0, tam: 1, q: 1, giro: 0.3, paso: 0.3, polvo: 0.2 + polvo * 1.5, nucleo: 0.6, caos: 2, grumos: 1.6, nitidez: 3,
          ramas: [{ n: 2, paso: 0.3, desfase: 0, peso: 1 }, { n: 3, paso: 0.42, desfase: 1.3, peso: 0.55 }] }],
        // Andrómeda: muy inclinada, con un bulbo grande y brazos suaves cruzados por polvo,
        // y sus dos compañeras: M32, pequeña y pegada, y M110, más grande y difusa.
        espiral_inclinada: [
          { x: 0, y: 0, tam: 1.05, q: 0.3, giro: -0.6, brazos: 2, paso: 0.25, polvo: 0.35 + polvo * 2, nucleo: 1.7, nitidez: 2.5, caos: 0.8, grumos: 0.3 },
          { tipo: 'eliptica', x: 0.13, y: 0.17, tam: 0.05, q: 0.8, giro: -0.6, brillo: 1.4 },
          { tipo: 'eliptica', x: -0.22, y: -0.4, tam: 0.16, q: 0.55, giro: 0.6, brillo: 0.5 },
        ],
        trio_de_galaxias: [
          { x: -0.45, y: 0.35, tam: 0.5, q: 0.3, giro: 1.25, brazos: 2, paso: 0.35, polvo: 1 },
          { x: 0.45, y: 0.4, tam: 0.45, q: 0.4, giro: 1.45, brazos: 2, paso: 0.4, polvo: 1 },
          { x: -0.05, y: -0.5, tam: 0.68, q: 0.14, giro: -0.2, brazos: 2, paso: 0.4, polvo: 0.4, franja: true },
        ],
      }[objeto.forma];
      return { ...base, campo: campoGalaxias, galaxias: g, exposicion: 1.3,
        amarillo: rgb(hex('#ffd9a0')?.hex || '#ffd9a0'), azul: rgb(hex('#a9c4ff')?.hex || '#a9c4ff'), rosa: rgb(hex('#e0476a')?.hex || '#e0476a') };
    }
    case 'globular':
    case 'globular_disperso': {
      // Distribución de Plummer: muy densa en el centro. «disperso» (como M4) es más suelto
      // y tiene menos estrellas; M4 además lleva su «barra» de estrellas en el centro.
      const disperso = objeto.forma === 'globular_disperso';
      const a = disperso ? 0.24 : 0.12, total = disperso ? 3500 : 9000;
      const est = [];
      while (est.length < total) {
        const u = Math.max(1e-4, r());
        const rad = a / Math.sqrt(Math.pow(u, -2 / 3) - 1);
        if (rad > 1.2) continue; // se descarta en vez de recortar: así no se forma un anillo en el borde
        const ang = r() * Math.PI * 2, b = Math.pow(r(), 3);
        est.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, tam: (disperso ? 0.45 : 0.35) + b * 1.3, hex: elegir(luz, r).hex, punto: true });
      }
      if (disperso) for (let i = 0; i < 9; i++) est.push({ x: -0.16 + i * 0.04, y: 0.02 * gauss(r) - 0.01 + i * 0.012, tam: 1.3 + r() * 0.5, hex: elegir(luz, r).hex, punto: true });
      for (let i = 0; i < 6; i++) { // algunas gigantes más brillantes
        const ang = r() * Math.PI * 2, rad = 0.1 + r() * 0.5;
        est.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, tam: 1.6 + r(), hex: luz[1]?.hex || luz[0].hex, destello: i < 2 });
      }
      return { ...base, campo: campoGlobular, a: disperso ? 0.3 : 0.15, tono: rgb(luz[0].hex), estrellas: est };
    }
    case 'continente': {
      const est = [];
      for (let i = 0; i < 700; i++) est.push({ x: gauss(r) * 0.9, y: gauss(r) * 0.9, // estrellas de la Vía Láctea, sin bordes rectos
         tam: 0.3 + Math.pow(r(), 4) * 1.1, hex: r() < 0.75 ? '#ffffff' : '#ffd9a0', punto: true });
      return { ...base, campo: campoContinente, exposicion: 2, estrellas: est,
        colores: [luz[0], hex('#a3263a') || luz[1] || luz[0], hex('#3fd0c0') || luz[0]].map(c => rgb(c.hex)) };
    }
    case 'laguna': {
      const est = [];
      for (let i = 0; i < 45; i++) { // NGC 6530, el cúmulo joven que hay dentro
        const b = Math.pow(r(), 3);
        est.push({ x: -0.45 + gauss(r) * 0.17, y: 0.06 + gauss(r) * 0.1, tam: 0.7 + b * 1.8, hex: r() < 0.8 ? '#cfe0ff' : '#ffffff', destello: b > 0.55 });
      }
      est.push({ x: 0.33, y: -0.03, tam: 1.8, hex: '#cfe0ff', destello: true }); // la estrella que ilumina el reloj de arena
      for (let i = 0; i < 450; i++) est.push({ x: gauss(r) * 0.9, y: gauss(r) * 0.9, tam: 0.3 + Math.pow(r(), 4) * 1.1, hex: r() < 0.6 ? '#ffffff' : '#ffd9a0', punto: true });
      return { ...base, campo: campoLaguna, exposicion: 2.1, estrellas: est,
        colores: [luz[0], hex('#3fd0c0') || luz[1] || luz[0]].map(c => rgb(c.hex)) };
    }
    case 'cumulo_abierto': {
      const est = [];
      // Estrellas grandes y abiertas, para que se lea bien también en el móvil.
      for (let i = 0; i < 70; i++) {
        const b = Math.pow(r(), 2.5);
        est.push({ x: gauss(r) * 0.9, y: gauss(r) * 0.9, tam: 1.2 + b * 3.6, hex: elegir(luz, r).hex, destello: b > 0.35 });
      }
      const roja = luz.find(c => c.hex === '#ff9a5c'); // DU Crucis, la supergigante roja que destaca entre las azules
      if (roja) est.push({ x: 0.06, y: -0.12, tam: 4.2, hex: roja.hex, destello: true });
      for (let i = 0; i < 260; i++) est.push({ x: gauss(r) * 1.1, y: gauss(r) * 1.1, tam: 0.3 + r() * 0.5, hex: elegir(luz, r).hex, punto: true });
      return { ...base, campo: campoCumulo, tono: rgb('#6f8fe8'), estrellas: est };
    }
    default: { // nebulosa_difusa
      const est = [];
      const nucleo = [gauss(r) * 0.15, gauss(r) * 0.15];
      // El Trapecio: cuatro estrellas muy juntas en el corazón de la nube.
      for (const [dx, dy, t] of [[0, 0, 1.9], [0.035, 0.012, 1.5], [0.012, 0.04, 1.4], [0.045, 0.045, 1.2]]) est.push({ x: nucleo[0] + dx, y: nucleo[1] + dy, tam: t, hex: '#cfe0ff', destello: t > 1.8 });
      for (let i = 0; i < 4; i++) est.push({ x: gauss(r) * 0.3, y: gauss(r) * 0.3, tam: 0.8 + r() * 1.1, hex: '#cfe0ff' });
      for (let i = 0; i < 260; i++) est.push({ x: gauss(r) * 1.3, y: gauss(r) * 1.3, tam: 0.35 + Math.pow(r(), 3) * 0.9, hex: r() < 0.7 ? '#ffffff' : '#ffd9a0', punto: true });
      return { ...base, campo: campoNebulosa, exposicion: 2.3, colores: [luz[0], luz[1] || luz[0], luz[2]].map(c => c && rgb(c.hex)),
        nucleo, estrellas: est };
    }
  }
}

function elegir(colores, r) {
  let x = r() * colores.reduce((s, c) => s + c.peso, 0);
  for (const c of colores) { x -= c.peso; if (x <= 0) return c; }
  return colores[0];
}

// ---------- pintura ----------

// Devuelve un lienzo de `lado` píxeles con el objeto centrado; `extension` es
// cuántos radios del objeto caben desde el centro hasta el borde.
export function pintarObjeto(objeto, lado = 1024, extension = 1.3) {
  const r = semilla(objeto.id);
  const k = preparar(objeto, r);
  // El gas se calcula a un 75 % de la resolución y se amplía (es suave); las estrellas van a resolución completa.
  const S = Math.round(lado * 0.75), mitad = S / 2, esc = extension / mitad;
  const img = new ImageData(S, S), d = img.data, c = [0, 0, 0], exp = k.exposicion;
  for (let py = 0; py < S; py++) {
    const y = (py + 0.5 - mitad) * esc;
    for (let px = 0; px < S; px++) {
      const x = (px + 0.5 - mitad) * esc;
      c[0] = c[1] = c[2] = 0;
      k.campo(x, y, c, k);
      const borde = suave(extension, extension * 0.78, Math.hypot(x, y)); // nada se corta en el borde del lienzo
      c[0] *= borde; c[1] *= borde; c[2] *= borde;
      // Exposición suave: lo muy brillante se acerca al blanco sin quemarse.
      const R = 1 - Math.exp(-c[0] * exp), G = 1 - Math.exp(-c[1] * exp), B = 1 - Math.exp(-c[2] * exp);
      const a = Math.max(R, G, B), i = (py * S + px) * 4;
      if (a < 0.002) continue;
      d[i] = (R / a) * 255; d[i + 1] = (G / a) * 255; d[i + 2] = (B / a) * 255; d[i + 3] = a * 255;
    }
  }
  const gasLienzo = document.createElement('canvas');
  gasLienzo.width = gasLienzo.height = S;
  gasLienzo.getContext('2d').putImageData(img, 0, 0);

  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(gasLienzo, 0, 0, lado, lado);
  ctx.globalCompositeOperation = 'lighter';
  const R = lado / 2 / extension, e = lado / 1024; // las medidas de las estrellas están pensadas para 1024 px
  ctx.translate(lado / 2, lado / 2);
  for (const s of k.estrellas) dibujarEstrella(ctx, s.x * R, s.y * R, s.tam * 2 * e, s.hex, s.destello, s.punto);
  return lienzo;
}

function dibujarEstrella(ctx, x, y, tam, hex, destello, punto) {
  const [r, g, b] = rgb(hex).map(v => Math.round(v * 255));
  if (!punto) {
    const h = ctx.createRadialGradient(x, y, 0, x, y, tam * 5);
    h.addColorStop(0, `rgba(${r},${g},${b},.45)`); h.addColorStop(0.3, `rgba(${r},${g},${b},.12)`); h.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, tam * 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = punto ? `rgba(${r},${g},${b},.85)` : 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, tam * (punto ? 0.6 : 0.55)), 0, Math.PI * 2); ctx.fill();
  if (destello) { // picos de difracción, como en las fotos de los telescopios
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const l = ctx.createLinearGradient(x - dx * tam * 9, y - dy * tam * 9, x + dx * tam * 9, y + dy * tam * 9);
      l.addColorStop(0, `rgba(${r},${g},${b},0)`); l.addColorStop(0.5, `rgba(${r},${g},${b},.55)`); l.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.strokeStyle = l; ctx.lineWidth = Math.max(0.6, tam * 0.18);
      ctx.beginPath(); ctx.moveTo(x - dx * tam * 9, y - dy * tam * 9); ctx.lineTo(x + dx * tam * 9, y + dy * tam * 9); ctx.stroke();
    }
  }
}
