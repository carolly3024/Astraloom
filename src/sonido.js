// Astraloom · música y sonido (fase 5)
// Todo se genera en el navegador con Tone.js (assets/vendor/tone.js), sin grabaciones.
// La música no es una pista que se repite: son capas que se combinan solas
// (un fondo grave que cambia de acorde muy despacio, campanillas lejanas que eligen
// sus notas al azar y un soplo de aire). Los efectos se afinan con la música del momento.
//
// Tonalidad: cada pantalla suena en la tonalidad de su color. El tono (hue) del color
// se reparte por el círculo de quintas, así que colores vecinos suenan a tonalidades
// vecinas. El inicio y el atlas suenan en el azul del logo; cada constelación, en el
// color real de su objeto. Todo usa la escala pentatónica mayor, que no tiene notas
// que choquen entre sí.
//
// Los navegadores no dejan sonar nada hasta el primer toque: el sonido arranca entonces.

const T = () => globalThis.Tone;
const PENTATONICA = [0, 2, 4, 7, 9];
const AZUL_LOGO = '#7fa8f0';
// Acordes del fondo, en semitonos sobre la raíz (todas las notas son de la pentatónica).
const ACORDES = [[0, 7, 14, 16], [-3, 4, 9, 16], [-5, 2, 9, 14], [2, 9, 16, 19]];
const AJUSTES_INICIALES = { silencio: false, musica: 0.3, efectos: 0.3 }; // empieza bajo, para no asustar
const NIVEL = 4; // ganancia general (unos +12 dB), con el limitador detrás para que nada sature

let ajustes = { ...AJUSTES_INICIALES };
let guardar = () => {};
let listo = false;        // Tone cargado y el contexto de audio en marcha
let n = null;             // nodos de audio
let raiz = 37;            // nota MIDI de la raíz del fondo (octava 2)
let acorde = 0;
let campana = 12;         // grado de la escala donde va la melodía de campanillas
let temporizadores = [];
let modo = 'menu';        // 'menu' | 'juego': en el juego las campanillas dejan más aire

const al = (a, b) => a + Math.random() * (b - a);
const midi = m => T().Frequency(m, 'midi').toFrequency();

// Grado de la escala (0, 1, 2… recorriendo la pentatónica hacia arriba) a nota MIDI.
function nota(grado, base = raiz) {
  const oct = Math.floor(grado / 5);
  return base + 12 * oct + PENTATONICA[((grado % 5) + 5) % 5];
}

// Color → raíz. Hue 0–360 en 12 casillas del círculo de quintas.
export function raizDeColor(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const casilla = Math.round(((h * 60 + 360) % 360) / 30) % 12;
  return 36 + (casilla * 7) % 12; // de Do2 a Si2
}

function crearNodos() {
  const Tone = T();
  const limitador = new Tone.Limiter(-3).toDestination();
  const general = new Tone.Gain(0).connect(limitador);
  const eco = new Tone.Reverb({ decay: 9, preDelay: 0.08, wet: 0.55 }).connect(general);
  const musica = new Tone.Gain(0).connect(eco);
  const efectos = new Tone.Gain(0).connect(eco);
  const agachar = new Tone.Gain(1).connect(musica); // baja la música durante el despertar

  // Fondo: acordes lentos, con un filtro que se abre y se cierra en un minuto y medio.
  const filtroFondo = new Tone.Filter({ frequency: 700, type: 'lowpass', rolloff: -24 }).connect(agachar);
  new Tone.LFO({ frequency: 1 / 90, min: 380, max: 1100 }).connect(filtroFondo.frequency).start();
  const fondo = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fattriangle', count: 3, spread: 14 },
    envelope: { attack: 6, decay: 2, sustain: 0.8, release: 10 },
    volume: -22,
  }).connect(filtroFondo);

  // Campanillas lejanas: FM suave, con un eco que se repite y se apaga.
  const retardo = new Tone.FeedbackDelay({ delayTime: 0.75, feedback: 0.35, wet: 0.3 }).connect(agachar);
  const panCampana = new Tone.Panner(0).connect(retardo);
  const campanillas = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2, modulationIndex: 1.6,
    oscillator: { type: 'sine' }, modulation: { type: 'sine' },
    envelope: { attack: 0.01, decay: 3, sustain: 0, release: 3 },
    modulationEnvelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.5 },
    volume: -26,
  }).connect(panCampana);

  // Aire: ruido rosa muy filtrado, como el soplo de un observatorio de noche.
  const filtroAire = new Tone.AutoFilter({ frequency: 1 / 40, baseFrequency: 250, octaves: 2.5, depth: 1 }).connect(agachar).start();
  filtroAire.filter.Q.value = 0.6;
  const aire = new Tone.Noise({ type: 'pink', volume: -42 }).connect(filtroAire);

  // Efectos: estrellas (cristal), hilos (cuerda de luz) y un grave para el destello.
  const panEfecto = new Tone.Panner(0).connect(efectos);
  const cristal = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 1.6, sustain: 0, release: 1.6 },
    volume: -14,
  }).connect(panEfecto);
  const brillo = new Tone.PolySynth(Tone.Synth, { // armónico alto que acompaña al cristal
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.8 },
    volume: -28,
  }).connect(panEfecto);
  const hilo = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1, modulationIndex: 0.8,
    envelope: { attack: 0.03, decay: 2.2, sustain: 0, release: 2 },
    modulationEnvelope: { attack: 0.2, decay: 1, sustain: 0, release: 1 },
    volume: -15,
  }).connect(panEfecto);
  const coro = new Tone.PolySynth(Tone.Synth, { // acordes que se abren (figura completa, nebulosa)
    oscillator: { type: 'fatsine', count: 3, spread: 18 },
    envelope: { attack: 1.2, decay: 2, sustain: 0.6, release: 5 },
    volume: -20,
  }).connect(efectos);
  const grave = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.04, decay: 3.5, sustain: 0, release: 3 },
    volume: -12,
  }).connect(efectos);
  const filtroSoplo = new Tone.Filter({ frequency: 300, type: 'bandpass', Q: 1.2 }).connect(efectos);
  const soplo = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 1.2, decay: 0.3, sustain: 0, release: 0.4 }, volume: -20 }).connect(filtroSoplo);

  return { general, musica, efectos, agachar, fondo, campanillas, panCampana, aire, panEfecto, cristal, brillo, hilo, coro, grave, filtroSoplo, soplo };
}

function aplicarVolumen(rampa = 0.6) {
  if (!n) return;
  n.general.gain.rampTo(ajustes.silencio ? 0 : NIVEL, rampa);
  // Curva suave (potencia 1,5): a 30 se oye bajito pero claro, y a 100 hay margen para subir.
  n.musica.gain.rampTo(ajustes.musica ** 1.5, rampa);
  n.efectos.gain.rampTo(ajustes.efectos ** 1.5, rampa);
}

const callado = () => !listo || ajustes.silencio || document.hidden;

// ---------- Música generativa ----------
function cada(fn, min, max) {
  const t = { id: 0 };
  const paso = () => { fn(); t.id = setTimeout(paso, al(min, max) * 1000); };
  t.id = setTimeout(paso, al(min, max) * 500);
  temporizadores.push(t);
}

function tocarAcorde() {
  if (callado() || ajustes.musica === 0) return;
  // Casi siempre se mueve a un acorde vecino; nunca repite el mismo.
  acorde = (acorde + (Math.random() < 0.7 ? 1 : 2)) % ACORDES.length;
  const dur = al(16, 24);
  n.fondo.triggerAttackRelease(ACORDES[acorde].map(s => midi(raiz + 12 + s)), dur);
}

function tocarCampanillas() {
  if (callado() || ajustes.musica === 0) return;
  if (Math.random() < (modo === 'juego' ? 0.45 : 0.25)) return; // silencios: también son música
  const frase = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
  let t = T().now() + 0.05;
  for (let i = 0; i < frase; i++) {
    // Paseo por la escala: pasos cortos, con un salto de vez en cuando.
    campana += Math.random() < 0.8 ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -3 : 3);
    campana = Math.max(9, Math.min(19, campana));
    n.panCampana.pan.setValueAtTime(al(-0.6, 0.6), t);
    n.campanillas.triggerAttackRelease(midi(nota(campana, raiz + 12)), 2.5, t, al(0.4, 0.8));
    t += al(0.35, 0.9);
  }
}

function arrancarMusica() {
  n.aire.start();
  cada(tocarAcorde, 18, 26);
  cada(tocarCampanillas, 2.5, 7);
  setTimeout(tocarAcorde, 300);
}

// ---------- Arranque ----------
// Hay que llamar a Tone.start() dentro del propio toque (iOS no deja hacerlo después).
function despertarAudio() {
  if (listo || !T()) return;
  T().start().then(() => {
    if (listo) return;
    listo = true;
    n = crearNodos();
    aplicarVolumen(0);
    n.musica.gain.value = 0;
    arrancarMusica();
    aplicarVolumen(6); // la música entra despacio
  }).catch(() => { /* el navegador no deja sonar: el juego sigue en silencio */ });
}

function alCambiarVisibilidad() {
  if (!listo) return;
  const ctx = T().getContext().rawContext;
  if (document.hidden) ctx.suspend?.(); else ctx.resume?.();
}

// leer/guardar: dónde viven los ajustes (el guardado del juego).
export function configurarSonido({ leer, guardar: g }) {
  ajustes = { ...AJUSTES_INICIALES, ...(leer() || {}) };
  guardar = g;
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, despertarAudio, { capture: true, passive: true });
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
}

export const leerAjustes = () => ({ ...ajustes });

export function cambiarAjustes(cambio) {
  ajustes = { ...ajustes, ...cambio };
  guardar(ajustes);
  aplicarVolumen(0.25);
}

// ---------- Ambiente de cada pantalla ----------
// color: el tono que da la tonalidad. juego: true dentro de Aprendiz y Tejedora.
export function ambiente(color = AZUL_LOGO, juego = false) {
  modo = juego ? 'juego' : 'menu';
  const nueva = raizDeColor(color);
  if (nueva === raiz) return;
  raiz = nueva;
  if (!listo) return;
  n.fondo.releaseAll(T().now() + 0.1); // el acorde viejo se apaga despacio (release de 10 s)
  setTimeout(tocarAcorde, 1200);
}

// ---------- Efectos ----------
const pan = x => (x === undefined ? 0 : Math.max(-0.7, Math.min(0.7, (x / 1000) * 1.4 - 0.7)));
// Paso k de total → grado que sube por dos octavas a medida que se avanza.
const gradoDe = (k, total) => 10 + Math.round(((k - 1) / Math.max(1, total - 1)) * 9);

// Una estrella vuelve a su hueco. x: su posición en el cielo (0–1000).
export function sonarEstrella(k, total, x) {
  if (callado()) return;
  const t = T().now() + 0.02, m = nota(gradoDe(k, total), raiz + 12);
  n.panEfecto.pan.setValueAtTime(pan(x), t);
  n.cristal.triggerAttackRelease(midi(m), 1.4, t, 0.7);
  n.brillo.triggerAttackRelease(midi(m + 24), 0.5, t + 0.01, 0.4);
}

// Se teje un hilo entre dos estrellas.
export function sonarHilo(k, total, x) {
  if (callado()) return;
  const t = T().now() + 0.02, m = nota(gradoDe(k, total), raiz + 12);
  n.panEfecto.pan.setValueAtTime(pan(x), t);
  n.hilo.triggerAttackRelease(midi(m), 1.8, t, 0.7);
  n.brillo.triggerAttackRelease(midi(m + 12), 0.6, t + 0.06, 0.3);
}

// La figura está completa: un arpegio que sube y un acorde que se queda.
export function sonarFigura() {
  if (callado()) return;
  const t = T().now() + 0.05;
  n.panEfecto.pan.setValueAtTime(0, t);
  [10, 11, 12, 13, 15].forEach((g, i) => n.cristal.triggerAttackRelease(midi(nota(g, raiz + 12)), 2, t + i * 0.16, 0.55));
  n.coro.triggerAttackRelease([0, 7, 16].map(s => midi(raiz + 24 + s)), 2.5, t + 0.5, 0.5);
}

// El despertar, por fases: se acompasa con despertar.js.
export function sonarDespertar(fase) {
  if (!listo) return;
  const Tone = T(), t = Tone.now() + 0.02;
  if (fase === 'velo') { n.agachar.gain.rampTo(0.35, 1.2); return; }
  if (fase === 'fin') { n.agachar.gain.rampTo(1, 6); return; }
  if (callado()) return;
  if (fase === 'reunir') { // las chispas se acercan: un soplo que sube
    n.filtroSoplo.frequency.setValueAtTime(250, t);
    n.filtroSoplo.frequency.exponentialRampToValueAtTime(2600, t + 1.3);
    n.soplo.triggerAttackRelease(1.2, t, 0.8);
  } else if (fase === 'destello') { // un grave hondo y un brillo arriba
    n.grave.triggerAttackRelease(midi(raiz - 12), 3, t, 0.9);
    n.brillo.triggerAttackRelease([24, 31].map(s => midi(raiz + 24 + s)), 1, t, 0.5);
  } else if (fase === 'nebulosa') { // el acorde se abre mientras la nebulosa crece
    n.coro.triggerAttackRelease([0, 7, 14, 16, 21].map(s => midi(raiz + 12 + s)), 4, t, 0.7);
    [12, 14, 16, 17].forEach((g, i) => n.campanillas.triggerAttackRelease(midi(nota(g, raiz + 12)), 3, t + 0.6 + i * 0.45, 0.6));
  }
}

// Pantalla de entrada: una nota por cada vuelta de hilos del logo y un acorde al
// encenderse la nebulosa. Solo suena si el audio ya estaba despierto (al volver a la entrada).
export function sonarLogo(vueltas, entre, nebulosa) {
  if (callado()) return;
  const t = T().now() + 0.05;
  for (let i = 0; i < vueltas; i++) n.cristal.triggerAttackRelease(midi(nota(10 + i, raiz + 12)), 1.2, t + i * entre, 0.35);
  n.coro.triggerAttackRelease([0, 7, 14].map(s => midi(raiz + 24 + s)), 3, t + nebulosa, 0.4);
}

// Una pista aparece: un destello muy suave, para no asustar.
export function sonarPista() {
  if (callado()) return;
  n.brillo.triggerAttackRelease(midi(nota(17, raiz + 12)), 0.8, T().now() + 0.02, 0.35);
}
