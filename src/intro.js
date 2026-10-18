// Astraloom · pantalla de entrada: el logo se teje hilo a hilo, su nebulosa se
// apaga y se enciende, y debajo salen «Tutorial» y «Entrar al cielo».

// Mismo dibujo que assets/simbolo.svg: cuatro cuartos de 8 hilos que van del eje
// vertical al horizontal, con la nebulosa azul y el núcleo plateado en el centro.
function hilosDelSimbolo() {
  const hilos = [];
  for (let k = 0; k < 8; k++) {
    const v = 4.6667 * (8 - k), hz = 4.6667 * (k + 1); // de fuera hacia dentro en el eje, de dentro hacia fuera en el otro
    // Los cuatro cuartos a la vez, girando: la estrella crece simétrica.
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      hilos.push([50, 50 + sy * v, 50 + sx * hz, 50]);
    }
  }
  return hilos;
}

const RETRASO = 0.07; // segundos entre un hilo y el siguiente

function logoAnimado() {
  const hilos = hilosDelSimbolo();
  const fin = hilos.length * RETRASO + 0.5; // cuando termina el último hilo
  return `<svg class="logo-intro" viewBox="0 0 100 100" aria-hidden="true" style="--fin:${fin}s">
    <defs><radialGradient id="neb-intro"><stop offset="0" stop-color="#7FA8F0"/><stop offset=".45" stop-color="#7FA8F0" stop-opacity=".35"/><stop offset="1" stop-color="#7FA8F0" stop-opacity="0"/></radialGradient></defs>
    <circle class="logo-nebulosa" cx="50" cy="50" r="26" fill="url(#neb-intro)"/>
    <g class="logo-hilos">${hilos.map(([x1, y1, x2, y2], i) =>
      `<line x1="${x1}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2}" pathLength="1" style="--d:${(i * RETRASO).toFixed(2)}s"/>`).join('')}</g>
    <circle class="logo-nucleo" cx="50" cy="50" r="2.2"/>
  </svg>`;
}

// Pasos del tutorial, con un dibujito animado en cada uno.
const PASOS = [
  {
    titulo: 'Aprendiz',
    texto: 'Las estrellas de una constelación se han soltado. Arrastra cada una hasta su hueco y aprende su forma.',
    demo: `<svg viewBox="0 0 200 90" class="demo demo-aprendiz"><circle cx="150" cy="45" r="13" class="demo-hueco"/><circle cx="40" cy="45" r="6" class="demo-estrella"/></svg>`,
  },
  {
    titulo: 'Tejedora',
    texto: 'Después, busca la figura en el cielo real y únela con hilos de luz, pasando el dedo por sus estrellas sin levantarlo.',
    demo: `<svg viewBox="0 0 200 90" class="demo demo-tejedora"><polyline points="30,60 90,25 170,55" class="demo-hilo"/>
      <circle cx="30" cy="60" r="5" class="demo-punto"/><circle cx="90" cy="25" r="5" class="demo-punto"/><circle cx="170" cy="55" r="5" class="demo-punto"/></svg>`,
  },
  {
    titulo: 'Despertar',
    texto: 'Al tejerla entera despierta lo que dormía en ella: una nebulosa, una galaxia o un cúmulo de estrellas. Se guarda en tu atlas con su ficha.',
    demo: `<svg viewBox="0 0 200 90" class="demo demo-despertar"><defs><radialGradient id="demo-neb"><stop offset="0" stop-color="#9fd4ff"/><stop offset=".4" stop-color="#7f6ff0" stop-opacity=".5"/><stop offset="1" stop-color="#d06fc0" stop-opacity="0"/></radialGradient></defs>
      <circle cx="100" cy="45" r="38" fill="url(#demo-neb)" class="demo-nebulosa"/>
      <circle cx="62" cy="22" r="1.6" class="demo-chispa"/><circle cx="140" cy="30" r="1.3" class="demo-chispa"/><circle cx="128" cy="72" r="1.7" class="demo-chispa"/><circle cx="72" cy="66" r="1.2" class="demo-chispa"/></svg>`,
  },
  {
    titulo: 'Sin prisa',
    texto: 'No hay tiempo, ni errores, ni forma de perder. Si te quedas un rato sin avanzar, el cielo te da una pista suave.',
    demo: `<svg viewBox="0 0 200 90" class="demo demo-pista"><circle cx="100" cy="45" r="6" class="demo-punto"/><circle cx="100" cy="45" r="10" class="demo-onda"/></svg>`,
  },
];

function abrirTutorial(app, alEntrar) {
  let paso = 0;
  app.insertAdjacentHTML('beforeend', `<div class="tutorial" role="dialog" aria-modal="true" aria-label="Tutorial">
    <div class="tutorial-caja"><button class="cerrar" aria-label="Cerrar el tutorial">×</button><div class="tutorial-paso" aria-live="polite"></div>
    <div class="tutorial-pie"><button class="boton" id="atras">Anterior</button><span class="puntos"></span><button class="boton principal" id="adelante"></button></div></div></div>`);
  const capa = app.querySelector('.tutorial');
  const cuerpo = capa.querySelector('.tutorial-paso');
  const atras = capa.querySelector('#atras'), adelante = capa.querySelector('#adelante');
  function pintar() {
    const p = PASOS[paso];
    cuerpo.innerHTML = `<p class="eyebrow">Paso ${paso + 1} de ${PASOS.length}</p><h2>${p.titulo}</h2>${p.demo}<p>${p.texto}</p>`;
    capa.querySelector('.puntos').innerHTML = PASOS.map((_, i) => `<span class="${i === paso ? 'activo' : ''}"></span>`).join('');
    atras.style.visibility = paso ? 'visible' : 'hidden';
    adelante.textContent = paso === PASOS.length - 1 ? 'Entrar al cielo' : 'Siguiente';
  }
  const cerrar = () => { capa.classList.add('se-va'); setTimeout(() => capa.remove(), 350); app.querySelector('#tutorial')?.focus(); };
  atras.addEventListener('click', () => { paso--; pintar(); });
  adelante.addEventListener('click', () => { if (paso < PASOS.length - 1) { paso++; pintar(); } else alEntrar(); });
  capa.querySelector('.cerrar').addEventListener('click', cerrar);
  capa.addEventListener('click', ev => { if (ev.target === capa) cerrar(); });
  capa.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') cerrar();
    if (ev.key === 'ArrowRight' && paso < PASOS.length - 1) { paso++; pintar(); }
    if (ev.key === 'ArrowLeft' && paso > 0) { paso--; pintar(); }
  });
  pintar();
  adelante.focus({ preventScroll: true });
}

// alEntrar: qué hacer al pulsar «Entrar al cielo» (ir al inicio con las constelaciones).
export function pantallaIntro(app, { alEntrar, alVerTutorial = () => {} }) {
  app.innerHTML = `<section class="intro">
    ${logoAnimado()}
    <h1 class="marca intro-marca">Astraloom</h1>
    <p class="sub intro-lema">Devuelve las estrellas a su sitio y teje el cielo.</p>
    <div class="intro-botones">
      <button class="boton" id="tutorial">Tutorial</button>
      <button class="boton principal" id="entrar">Entrar al cielo</button>
    </div>
  </section>`;
  app.querySelector('#entrar').addEventListener('click', alEntrar);
  app.querySelector('#tutorial').addEventListener('click', () => { alVerTutorial(); abrirTutorial(app, alEntrar); });
}
