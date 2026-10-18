// Astraloom · guardado del progreso (fase 3)
// Se guarda en localStorage del navegador. Si no está disponible (modo
// privado, almacenamiento bloqueado), el juego sigue funcionando en memoria.

const CLAVE = 'astraloom.progreso';
const VERSION = 1;

function vacio() {
  return { version: VERSION, constelaciones: {}, atlas: [], ajustes: {} };
}

// Adapta partidas guardadas con versiones anteriores del formato.
function migrar(datos) {
  if (!datos || typeof datos !== 'object') return vacio();
  const p = { ...vacio(), ...datos };
  p.constelaciones = { ...(datos.constelaciones || {}) };
  p.atlas = Array.isArray(datos.atlas) ? [...datos.atlas] : [];
  p.version = VERSION;
  return p;
}

export function crearGuardado(almacen = globalThis.localStorage) {
  let memoria = null;

  function leer() {
    if (memoria) return memoria;
    try {
      const texto = almacen?.getItem(CLAVE);
      memoria = migrar(texto ? JSON.parse(texto) : null);
    } catch {
      memoria = vacio();
    }
    return memoria;
  }

  function escribir() {
    try { almacen?.setItem(CLAVE, JSON.stringify(memoria)); } catch { /* seguimos en memoria */ }
  }

  function estado(id) {
    return leer().constelaciones[id] || { aprendiz: false, tejedora: false };
  }

  return {
    estado,
    completar(id, nivel, ahora = new Date().toISOString()) {
      if (nivel !== 'aprendiz' && nivel !== 'tejedora') throw new Error(`Nivel desconocido: ${nivel}`);
      const p = leer();
      const c = { ...estado(id) };
      if (!c[nivel]) c[`${nivel}_fecha`] = ahora;
      c[nivel] = true;
      p.constelaciones[id] = c;
      if (nivel === 'tejedora' && !p.atlas.includes(id)) p.atlas.push(id); // despierta su objeto
      escribir();
      return c;
    },
    atlas: () => [...leer().atlas],
    ajuste: (k, v) => { const p = leer(); if (v === undefined) return p.ajustes[k]; p.ajustes[k] = v; escribir(); },
    exportar: () => JSON.stringify(leer()),
    borrar() { memoria = vacio(); try { almacen?.removeItem(CLAVE); } catch { /* nada */ } },
  };
}
