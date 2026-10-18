// Astraloom · prototipo v0.2
// Pantallas: entrada (logo y tutorial), inicio (constelaciones), Aprendiz, Tejedora,
// atlas y ficha de objeto. Navegación por la dirección (#/intro, #/aprendiz/Ori, #/atlas…).

import { cargarJuego } from './datos.js';
import { crearGuardado } from './guardado.js';
import { montarAprendiz } from './aprendiz.js';
import { montarTejedora } from './tejedora.js';
import { despertar, dibujarObjeto, prepararObjeto } from './despertar.js';
import { semilla } from './nebulosas.js';
import { crearContador } from './contador.js';
import { el, escapar } from './svg.js';
import { bordeLuz, miniFigura, tonoObjeto } from './adornos.js';
import { montarFondo } from './fondo.js';
import { pantallaIntro, simboloVivo } from './intro.js';
import { montarPanel, coordenadas } from './panel.js';

const RUTA_DATOS = 'contenido/datos';
const app = document.getElementById('app');
const guardado = crearGuardado();
let juego = null;
let pantallaActual = null; // para parar pistas al salir

const h = (strings, ...vals) => strings.reduce((s, str, i) => s + str + (i < vals.length ? vals[i] : ''), '');

function nivelPorId(id) { return juego.niveles.find(n => n.id === id); }

// Cabecera con migas de pan: «Cielo» siempre vuelve al inicio, donde están todas
// las constelaciones; dentro del atlas, «Atlas» vuelve a la colección.
function cabecera(titulo, sub = '', migas = []) {
  const enlaces = [['#/', 'Cielo'], ...migas].map(([href, texto]) => `<a href="${href}">${escapar(texto)}</a>`).join('<span aria-hidden="true">/</span>');
  return h`<header class="barra">
    <nav class="migas" aria-label="Volver">${enlaces}</nav>
    <div><h1>${escapar(titulo)}</h1>${sub ? `<p class="sub">${escapar(sub)}</p>` : ''}</div>
  </header>`;
}

function ficha(nivel) {
  const o = nivel.tejedora.objeto;
  return h`<article class="ficha">
    <p class="eyebrow">${escapar(o.tipo)} · en ${escapar(nivel.nombre)}</p>
    <h2>${escapar(o.nombre)} <span class="cat">${escapar(o.id)}</span></h2>
    <p class="coords">${coordenadas(o)}</p>
    <dl class="datos"><div><dt>Distancia</dt><dd>${escapar(o.distancia)}</dd></div><div><dt>Tamaño</dt><dd>${escapar(o.tamano)}</dd></div></dl>
    <p>${escapar(o.texto)}</p>
    <h3>Por qué tiene ese color</h3>
    <p>${escapar(o.por_que_color)}</p>
    <ul class="colores">${o.colores.map(c => `<li><span class="muestra" style="background:${escapar(c.hex)}"></span><span><strong>${escapar(c.nombre)}</strong> · ${escapar(c.origen)}</span></li>`).join('')}</ul>
  </article>`;
}

// ---------- Inicio ----------
// Temporada en corto para la tarjeta: «invierno del hemisferio norte» → «Invierno · Norte».
function temporadaCorta(t) {
  const estacion = /todo el año/.test(t) ? 'Todo el año' : (t.match(/primavera|verano|otoño|invierno/) || [''])[0];
  const hemisferio = /hemisferio sur/.test(t) ? 'Sur' : 'Norte';
  return `${estacion.charAt(0).toUpperCase()}${estacion.slice(1)} · ${hemisferio}`;
}
const dos = n => String(n).padStart(2, '0');

function pantallaInicio() {
  const atlas = guardado.atlas();
  const estados = juego.niveles.map(n => { const e = guardado.estado(n.id); return e.tejedora ? 'despierta' : e.aprendiz ? 'aprendiz' : 'pendiente'; });
  const cuenta = f => estados.filter(e => e === f).length;
  app.innerHTML = h`
    <header class="portada">
      <div class="portada-marca">
        <a href="#/intro" class="volver-intro" title="Volver a la entrada">${simboloVivo(64)}</a>
        <div><h1 class="marca">Astraloom</h1><p class="sub">Devuelve las estrellas a su sitio y teje el cielo.</p></div>
      </div>
      <div class="resumen">
        <dl class="cifras">
          <div class="viva"><dt>Despiertos</dt><dd>${dos(cuenta('despierta'))}</dd></div>
          <div><dt>En camino</dt><dd>${dos(cuenta('aprendiz'))}</dd></div>
          <div><dt>Por descubrir</dt><dd>${dos(cuenta('pendiente'))}</dd></div>
        </dl>
        <a class="boton" href="#/atlas">Atlas · ${atlas.length} de ${juego.niveles.length}</a>
      </div>
    </header>
    <div class="barra-cielo" aria-hidden="true">${juego.niveles.map((n, i) => `<span class="${estados[i]}" style="--tono:${tonoObjeto(n.tejedora.objeto)}" title="${escapar(n.nombre)}"></span>`).join('')}</div>
    <ul class="rejilla">${juego.niveles.map((n, i) => {
      const e = guardado.estado(n.id);
      const fase = estados[i];
      return h`<li class="tarjeta-const ${fase}" data-id="${n.id}" style="--i:${i};--tono:${tonoObjeto(n.tejedora.objeto)}">
        <div class="ventana"></div>
        ${e.tejedora ? `<span class="sello">✦ Despierta</span>` : ''}
        <p class="etiqueta"><span>${dos(i + 1)}</span>${escapar(temporadaCorta(n.temporada))}</p>
        <h2>${escapar(n.nombre)}</h2>
        <p class="estado">${e.tejedora ? `${escapar(n.tejedora.objeto.nombre)} brilla en tu atlas` : e.aprendiz ? 'Algo duerme entre sus estrellas' : 'Por descubrir'}</p>
        <div class="niveles">
          <a class="boton ${e.aprendiz ? 'hecho' : ''}" href="#/aprendiz/${n.id}">Aprendiz${e.aprendiz ? ' ✓' : ''}</a>
          ${e.aprendiz
            ? `<a class="boton ${e.tejedora ? 'hecho' : 'principal'}" href="#/tejedora/${n.id}">Tejedora${e.tejedora ? ' ✓' : ''}</a>`
            : `<span class="boton bloqueado" title="Completa Aprendiz para abrirla">Tejedora</span>`}
        </div>
      </li>`;
    }).join('')}</ul>
    <footer class="pie">
      <button class="enlace" id="borrar">Borrar el progreso</button>
      <p>Datos de estrellas: HYG Database v3.8 (CC BY-SA 4.0). Figuras: Stellarium (cultura «modern»).</p>
    </footer>`;
  app.querySelectorAll('.tarjeta-const').forEach(t => {
    const fase = ['despierta', 'aprendiz', 'pendiente'].find(c => t.classList.contains(c));
    miniFigura(t.querySelector('.ventana'), nivelPorId(t.dataset.id), fase);
    if (fase === 'despierta') bordeLuz(t);
  });
  // Confirmación dentro de la página (algunos visores bloquean confirm()).
  const pie = app.querySelector('.pie');
  app.querySelector('#borrar').addEventListener('click', () => {
    pie.querySelector('.confirmar')?.remove();
    pie.insertAdjacentHTML('afterbegin', `<div class="confirmar"><span>¿Borrar todo el progreso y el atlas?</span>
      <button class="boton" id="si-borrar">Sí, borrar</button><button class="boton" id="no-borrar">Cancelar</button></div>`);
    pie.querySelector('#si-borrar').addEventListener('click', () => { guardado.borrar(); pantallaInicio(); });
    pie.querySelector('#no-borrar').addEventListener('click', () => pie.querySelector('.confirmar').remove());
  });
}

// ---------- Guía de la primera vez ----------
// Una tarjeta corta encima del cielo, solo la primera vez que se entra en cada nivel.
const GUIAS = {
  aprendiz: {
    titulo: 'Aprendiz',
    pasos: ['Arrastra cada estrella hasta su hueco.', 'O toca un hueco vacío y su estrella irá sola.'],
    demo: `<svg viewBox="0 0 200 90" class="demo demo-aprendiz" aria-hidden="true">
      <circle cx="150" cy="45" r="13" class="demo-hueco"/><circle cx="40" cy="45" r="6" class="demo-estrella"/></svg>`,
  },
  tejedora: {
    titulo: 'Tejedora',
    pasos: ['Pasa el dedo por las estrellas de la figura sin levantarlo: cada una que toques teje un hilo.', 'Las estrellas con aro son las de la figura; al elegir una, se iluminan las que siguen.'],
    demo: `<svg viewBox="0 0 200 90" class="demo demo-tejedora" aria-hidden="true">
      <polyline points="30,60 90,25 170,55" class="demo-hilo"/>
      <circle cx="30" cy="60" r="5" class="demo-punto"/><circle cx="90" cy="25" r="5" class="demo-punto"/><circle cx="170" cy="55" r="5" class="demo-punto"/></svg>`,
  },
};

function mostrarGuia(nivel) {
  if (guardado.ajuste(`guia-${nivel}`)) return;
  const g = GUIAS[nivel];
  const cielo = app.querySelector('.cielo');
  cielo.insertAdjacentHTML('beforeend', h`<div class="guia-inicial" role="dialog" aria-label="Cómo se juega">
    <div class="guia-caja"><p class="eyebrow">Cómo se juega · ${g.titulo}</p>${g.demo}
    <ol>${g.pasos.map(p => `<li>${p}</li>`).join('')}</ol>
    <button class="boton principal">Entendido</button></div></div>`);
  const guia = cielo.querySelector('.guia-inicial');
  const cerrar = () => { guardado.ajuste(`guia-${nivel}`, true); guia.classList.add('se-va'); setTimeout(() => guia.remove(), 400); };
  guia.querySelector('button').addEventListener('click', cerrar);
  guia.querySelector('button').focus({ preventScroll: true });
}

// La siguiente constelación por terminar, empezando después de `id` (o el atlas si no queda ninguna).
function siguiente(id) {
  const i = juego.niveles.findIndex(n => n.id === id);
  for (let k = 1; k <= juego.niveles.length; k++) {
    const n = juego.niveles[(i + k) % juego.niveles.length], e = guardado.estado(n.id);
    if (!e.tejedora) return { href: `#/${e.aprendiz ? 'tejedora' : 'aprendiz'}/${n.id}`, texto: `Siguiente: ${n.nombre} →` };
  }
  return { href: '#/atlas', texto: 'Ver el atlas completo →' };
}

// ---------- Aprendiz ----------
function pantallaAprendiz(nivel) {
  app.innerHTML = cabecera(nivel.nombre, 'Aprendiz · arrastra cada estrella a su hueco') +
    `<section class="escena"><div class="cielo"></div><div class="tarjeta"><div class="contenido" aria-live="polite"><p class="sub">Así es ${escapar(nivel.nombre)}. Fíjate en su forma…</p></div></div></section>`;
  const tarjeta = app.querySelector('.contenido');
  let colocadas = 0;
  const contador = crearContador(app.querySelector('.tarjeta'), nivel.aprendiz.estrellas.length, ' estrellas');
  const panel = montarPanel(app.querySelector('.tarjeta'), nivel, juego.niveles, 'aprendiz');
  pantallaActual = montarAprendiz(app.querySelector('.cielo'), nivel, {
    alTocarMisterio: () => ir(`#/tejedora/${nivel.id}`),
    alEmpezar() {
      tarjeta.innerHTML = '<p class="sub">Las estrellas se han soltado. Llévalas a su sitio, o toca un hueco y su estrella irá sola.</p>';
      mostrarGuia('aprendiz');
    },
    alColocar(estrella) {
      contador.poner(++colocadas, estrella.nombre ? `${estrella.nombre} vuelve a su sitio` : '');
      panel.encender(estrella.hip);
      panel.revelar(colocadas / nivel.aprendiz.estrellas.length);
    },
    alCompletar() {
      guardado.completar(nivel.id, 'aprendiz');
      const o = nivel.tejedora.objeto;
      const femenino = /^(nebulosa|galaxia)/.test(o.tipo);
      tarjeta.innerHTML = h`<p class="eyebrow">Constelación completa</p>
        <h2>${escapar(nivel.nombre)}</h2>
        <p>${escapar(nivel.aprendiz.dato)}</p>
        <div class="misterio-texto">
          <p><strong>Algo brilla cerca de sus estrellas.</strong> Es ${femenino ? 'una' : 'un'} ${escapar(o.tipo)} que duerme en este trozo de cielo y que todavía nadie ha despertado.</p>
          <p class="sub">Teje la figura sobre el cielo real para descubrir ${femenino ? 'cuál es' : 'qué es'}.</p>
        </div>
        <div class="acciones"><a class="boton principal" href="#/tejedora/${nivel.id}">Tejer y despertar</a><a class="boton" href="#/">Volver al cielo</a></div>`;
      pantallaActual.mostrarMisterio();
    },
  });
}

// ---------- Tejedora ----------
function pantallaTejedora(nivel) {
  prepararObjeto(nivel.tejedora.objeto); // se pinta mientras se teje, para que esté listo al despertar
  if (!guardado.estado(nivel.id).aprendiz) { ir(`#/aprendiz/${nivel.id}`, { reemplazar: true }); return; }
  app.innerHTML = cabecera(nivel.nombre, 'Tejedora · teje la figura sobre el cielo real') +
    `<section class="escena"><div class="cielo"></div><div class="tarjeta"><div class="contenido" aria-live="polite"></div></div></section>`;
  const tarjeta = app.querySelector('.contenido');
  const ayuda = texto => { tarjeta.innerHTML = `<p class="sub">${texto}</p>`; };
  const contador = crearContador(app.querySelector('.tarjeta'), nivel.lineas.length, ' hilos');
  const panel = montarPanel(app.querySelector('.tarjeta'), nivel, juego.niveles, 'tejedora');
  let despierto = false;
  async function despertarYa() { // desde el botón o tocando el brillo del cielo
    if (despierto) return;
    despierto = true;
    tarjeta.querySelector('#despertar')?.setAttribute('disabled', '');
    const { svg, objeto, quitarLlamada } = pantallaActual;
    quitarLlamada();
    await despertar(svg, nivel.tejedora.objeto, objeto.x, objeto.y, 120);
    contador.quitar(); // la ficha del objeto ocupa ya toda la tarjeta
    panel.quitar();
    const sig = siguiente(nivel.id);
    tarjeta.innerHTML = ficha(nivel) + `<div class="acciones"><a class="boton principal" href="${sig.href}">${escapar(sig.texto)}</a><a class="boton" href="#/atlas">Ver el atlas</a></div>`;
  }
  pantallaActual = montarTejedora(app.querySelector('.cielo'), nivel, {
    alTejer(n, total, a, b) {
      contador.poner(n);
      panel.encender(a.hip); panel.encender(b.hip);
      panel.revelar(n / total);
    },
    alCompletar() {
      guardado.completar(nivel.id, 'tejedora'); // se guarda ya en el atlas
      tarjeta.innerHTML = h`<p class="eyebrow">Has tejido ${escapar(nivel.nombre)}</p>
        <p>Algo brilla en este trozo de cielo. Tócalo para despertarlo.</p>
        <div class="acciones"><button class="boton principal" id="despertar">Despertar</button></div>`;
      tarjeta.querySelector('#despertar').addEventListener('click', despertarYa);
    },
    alDespertar: despertarYa,
  });
  ayuda('Repasa la figura con hilos de luz: pasa el dedo por sus estrellas sin levantarlo, o toca una y luego otra.');
  mostrarGuia('tejedora');
}

// ---------- Atlas ----------
function miniObjeto(contenedor, nivel, lado = 300) {
  const svg = el('svg', { viewBox: `${-lado / 2} ${-lado / 2} ${lado} ${lado}`, class: 'mini' });
  el('defs', {}, svg);
  const f = el('filter', { id: 'brillo', x: '-100%', y: '-100%', width: '300%', height: '300%' }, svg.querySelector('defs'));
  el('feGaussianBlur', { stdDeviation: 3 }, f);
  contenedor.appendChild(svg);
  dibujarObjeto(svg, svg, nivel.tejedora.objeto, 0, 0, lado * 0.4);
}

function pantallaAtlas() {
  const atlas = new Set(guardado.atlas());
  const total = juego.niveles.length;
  app.innerHTML = cabecera('Atlas', `${atlas.size} de ${total} objetos despiertos`) +
    `<div class="atlas-progreso" aria-hidden="true">${juego.niveles.map(n => `<span class="${atlas.has(n.id) ? 'viva' : ''}" style="--tono:${tonoObjeto(n.tejedora.objeto)}"></span>`).join('')}</div>
    <ul class="rejilla atlas">${juego.niveles.map((n, i) => {
      const o = n.tejedora.objeto, tono = tonoObjeto(o), e = guardado.estado(n.id);
      return atlas.has(n.id)
        ? `<li style="--i:${i};--tono:${tono}"><a class="tarjeta-objeto" href="#/atlas/${n.id}">
            <div class="portal" data-id="${n.id}"></div>
            <div class="pie-objeto"><p class="eyebrow">${escapar(o.tipo)}</p><h2>${escapar(o.nombre)}</h2>
            <p class="sub">${escapar(o.id)} · en ${escapar(n.nombre)}</p><p class="coords">${coordenadas(o)}</p></div></a></li>`
        : `<li style="--i:${i}"><a class="tarjeta-objeto dormido" href="#/${e.aprendiz ? 'tejedora' : 'aprendiz'}/${n.id}">
            <div class="portal" data-fig="${n.id}"></div>
            <div class="pie-objeto"><p class="eyebrow">Dormido</p><h2>Algo duerme aquí</h2>
            <p class="sub">${e.aprendiz ? `Teje ${escapar(n.nombre)} para despertarlo` : `Empieza por ${escapar(n.nombre)}`}</p></div></a></li>`;
    }).join('')}</ul>`;
  app.querySelectorAll('.portal[data-id]').forEach(c => { miniObjeto(c, nivelPorId(c.dataset.id), 220); bordeLuz(c.closest('.tarjeta-objeto')); });
  app.querySelectorAll('.portal[data-fig]').forEach(c => miniFigura(c, nivelPorId(c.dataset.fig), 'pendiente'));
}

// Campo de estrellas de fondo, como en una foto de telescopio: muchas tenues,
// pocas brillantes, de azuladas a anaranjadas. Siempre el mismo para cada objeto.
const TONOS_ESTRELLA = ['#c9daff', '#dde6ff', '#f0f0ff', '#fffefa', '#fff2e0', '#ffe6d2', '#ffd2a8'];
function campoEstelar(lienzo, id) {
  const r = semilla(`${id}-campo`), lado = lienzo.width, ctx = lienzo.getContext('2d');
  for (let i = 0; i < 520; i++) {
    const x = r() * lado, y = r() * lado, brillo = Math.pow(r(), 6); // casi todas tenues
    const tam = 0.5 + brillo * 2.6, tono = TONOS_ESTRELLA[(r() * TONOS_ESTRELLA.length) | 0];
    if (brillo > 0.25) {
      const h = ctx.createRadialGradient(x, y, 0, x, y, tam * 4);
      h.addColorStop(0, tono + '66'); h.addColorStop(1, tono + '00');
      ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, tam * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, brillo * 3 + r() * 0.3);
    ctx.fillStyle = tono; ctx.beginPath(); ctx.arc(x, y, tam, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// Pantalla del objeto: la imagen llena toda su caja, sobre un campo de estrellas,
// y se acerca muy despacio. Encima solo hay esquinas de visor, sin textos.
function fotoObjeto(contenedor, nivel) {
  contenedor.classList.add('foto');
  contenedor.innerHTML = `<div class="foto-movil"><canvas class="foto-campo" width="1200" height="1200"></canvas></div>
    <span class="visor" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  campoEstelar(contenedor.querySelector('canvas'), nivel.tejedora.objeto.id);
  const lado = 300;
  const svg = el('svg', { viewBox: `${-lado / 2} ${-lado / 2} ${lado} ${lado}`, preserveAspectRatio: 'xMidYMid slice', class: 'foto-objeto',
    role: 'img', 'aria-label': nivel.tejedora.objeto.nombre });
  contenedor.querySelector('.foto-movil').appendChild(svg);
  dibujarObjeto(svg, svg, nivel.tejedora.objeto, 0, 0, lado * 0.5);
}

function pantallaObjeto(nivel) {
  if (!guardado.atlas().includes(nivel.id)) { ir('#/atlas', { reemplazar: true }); return; }
  app.innerHTML = cabecera(nivel.tejedora.objeto.nombre, `Atlas · ${nivel.nombre}`, [['#/atlas', 'Atlas']]) +
    `<section class="escena"><div class="cielo objeto-grande"></div><div class="tarjeta">${ficha(nivel)}<div class="acciones"><a class="boton" href="#/atlas">Volver al atlas</a></div></div></section>`;
  fotoObjeto(app.querySelector('.cielo'), nivel);
}

// ---------- Navegación ----------
// La ruta vive en la dirección (#/tejedora/Ori) cuando el navegador lo permite;
// si el visor no deja cambiarla, se guarda solo en memoria.
let ruta = location.hash || '#/';

function ir(nueva, { reemplazar = false } = {}) {
  ruta = nueva;
  try { history[reemplazar ? 'replaceState' : 'pushState'](null, '', nueva); } catch { /* visor sin historial */ }
  navegar();
}

// Tocar el espacio vacío de fuera (el fondo, no un cuadro) lleva al inicio.
// Se mira también dónde empezó el toque, para que soltar un arrastre fuera no cuente.
const fuera = t => t === document.body || t === document.documentElement || t === app;
const enInicio = () => ['#/', '', '#/intro'].includes(ruta);
let empezoFuera = false;
document.addEventListener('pointerdown', ev => { empezoFuera = fuera(ev.target); });
document.addEventListener('pointermove', ev => {
  document.body.classList.toggle('sobre-fondo', !enInicio() && fuera(ev.target));
}, { passive: true });

document.addEventListener('click', ev => {
  if (empezoFuera && fuera(ev.target) && !enInicio()) { ir('#/'); return; }
  const a = ev.target.closest('a[href^="#/"]');
  if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
  ev.preventDefault();
  ir(a.getAttribute('href'));
});

function navegar() {
  document.body.classList.remove('sobre-fondo');
  pantallaActual?.parar?.();
  pantallaActual = null;
  const [, pantalla, id] = ruta.replace(/^#?\/?/, '#/').split('/');
  const nivel = id && nivelPorId(id);
  window.scrollTo(0, 0);
  document.body.classList.toggle('en-intro', pantalla === 'intro');
  if (pantalla === 'intro') pantallaIntro(app, { alEntrar: () => ir('#/') });
  else if (pantalla === 'aprendiz' && nivel) pantallaAprendiz(nivel);
  else if (pantalla === 'tejedora' && nivel) pantallaTejedora(nivel);
  else if (pantalla === 'atlas' && nivel) pantallaObjeto(nivel);
  else if (pantalla === 'atlas') pantallaAtlas();
  else pantallaInicio();
}

async function iniciar() {
  try {
    juego = await cargarJuego(RUTA_DATOS);
  } catch (e) {
    app.innerHTML = `<p class="error">No se pudieron cargar los datos del cielo. Si has abierto el archivo directamente, sírvelo con un servidor local (mira el README).</p>`;
    console.error(e);
    return;
  }
  window.addEventListener('popstate', () => { ruta = location.hash || '#/'; navegar(); });
  // Al abrir el juego por la puerta principal se entra por la pantalla del logo.
  if (ruta === '#/' || ruta === '' || ruta === '#') ir('#/intro', { reemplazar: true });
  else navegar();
}

montarFondo();
iniciar();
