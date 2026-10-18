// Astraloom · carga de niveles desde los datos de contenido/ (fase 3)
// Añadir una constelación no toca este archivo: basta con su ficha en
// datos/textos/ y su ID en datos/indice.json.

const RAD = Math.PI / 180;

async function leerJSON(ruta, fetchFn) {
  const res = await fetchFn(ruta);
  if (!res.ok) throw new Error(`No se pudo leer ${ruta} (${res.status})`);
  return res.json();
}

// Proyección gnomónica alrededor del centro de la figura. Devuelve x hacia
// la izquierda para el este, como se ve el cielo mirando hacia arriba.
export function proyectar(ar, dec, centro) {
  const a = ar * RAD, d = dec * RAD;
  const a0 = centro.ar * RAD, d0 = centro.dec * RAD;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
  const x = (Math.cos(d) * Math.sin(a - a0)) / cosc;
  const y = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
  return { x: -x, y: -y }; // y hacia abajo, como en pantalla
}

// Lleva un conjunto de puntos proyectados a coordenadas 0..1 conservando la
// proporción, con un margen alrededor.
function normalizar(puntos, margen = 0.08) {
  const xs = puntos.map(p => p.x), ys = puntos.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const lado = Math.max(maxX - minX, maxY - minY) || 1;
  const escala = (1 - 2 * margen) / lado;
  const offX = (1 - (maxX - minX) * escala) / 2;
  const offY = (1 - (maxY - minY) * escala) / 2;
  return p => ({ x: offX + (p.x - minX) * escala, y: offY + (p.y - minY) * escala });
}

// Construye un nivel jugable a partir del cielo y los textos de una constelación.
export function construirNivel(cielo, textos) {
  const nombresEs = textos.nombres_es || {};
  const usadas = new Set(cielo.lineas.flat());
  const estrellas = cielo.estrellas
    .filter(e => usadas.has(e.hip))
    .map(e => ({
      hip: e.hip,
      nombre: nombresEs[e.hip] || e.nombre || null,
      mag: e.mag,
      color: e.color,
      ...proyectar(e.ar, e.dec, cielo.centro),
    }));
  const fondo = cielo.fondo.map(e => ({ hip: e.hip, mag: e.mag, color: e.color, ...proyectar(e.ar, e.dec, cielo.centro) }));
  const obj = textos.objeto;
  const posObjeto = proyectar(obj.ar, obj.dec, cielo.centro);

  // Aprendiz encuadra solo la figura. Tejedora encuadra la figura y su objeto,
  // y muestra las estrellas vecinas que caen dentro de ese trozo de cielo.
  const aFigura = normalizar(estrellas);
  const aCielo = normalizar([...estrellas, posObjeto], 0.1);
  const dentro = p => p.x > -0.02 && p.x < 1.02 && p.y > -0.02 && p.y < 1.02;

  return {
    id: cielo.id,
    nombre: textos.nombre,
    orden: textos.orden,
    temporada: textos.temporada,
    lineas: cielo.lineas.map(([a, b]) => [a, b]),
    aprendiz: {
      dato: textos.aprendiz.dato,
      estrellas: estrellas.map(e => ({ ...e, ...aFigura(e) })),
    },
    tejedora: {
      estrellas: estrellas.map(e => ({ ...e, ...aCielo(e) })),
      fondo: fondo.map(e => ({ ...e, ...aCielo(e) })).filter(dentro),
      objeto: { ...obj, ...aCielo(posObjeto) },
    },
  };
}

// Carga el índice y todas las constelaciones de una lista (por defecto, el juego base).
export async function cargarJuego(base = 'datos', { lista = 'juego_base', fetchFn = globalThis.fetch } = {}) {
  const indice = await leerJSON(`${base}/indice.json`, fetchFn);
  const ids = indice[lista];
  if (!Array.isArray(ids)) throw new Error(`El índice no tiene la lista «${lista}»`);
  const niveles = await Promise.all(ids.map(async id => {
    const [cielo, textos] = await Promise.all([
      leerJSON(`${base}/cielo/${id}.json`, fetchFn),
      leerJSON(`${base}/textos/${id}.json`, fetchFn),
    ]);
    return construirNivel(cielo, textos);
  }));
  niveles.sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
  return { version: indice.version, colores: indice.colores_de_referencia, niveles };
}
