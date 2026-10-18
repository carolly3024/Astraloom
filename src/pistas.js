// Astraloom · pistas sin castigo
// Tras 20 s sin avanzar aparece la primera pista; si sigue sin avanzar,
// otros 20 s después llega la segunda. Cualquier avance las reinicia.

export const ESPERA_PISTA_MS = 20000;

export function crearPistas({ primera, segunda, limpiar }, espera = ESPERA_PISTA_MS) {
  let t1 = null, t2 = null;
  function parar() { clearTimeout(t1); clearTimeout(t2); t1 = t2 = null; }
  return {
    reiniciar() {
      parar();
      limpiar();
      t1 = setTimeout(() => { primera(); t2 = setTimeout(segunda, espera); }, espera);
    },
    parar() { parar(); limpiar(); },
  };
}
