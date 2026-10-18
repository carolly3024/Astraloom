// Astraloom · prototipo v0.2
// Pantallas: inicio (constelaciones), Aprendiz, Tejedora, atlas y ficha de objeto.
// Navegación por la dirección (#/aprendiz/Ori, #/tejedora/Ori, #/atlas…).

import { cargarJuego } from './datos.js';
import { crearGuardado } from './guardado.js';
import { montarAprendiz } from './aprendiz.js';
import { montarTejedora } from './tejedora.js';
import { despertar, dibujarObjeto } from './despertar.js';
import { crearContador } from './contador.js';
import { el, escapar } from './svg.js';
import { bordeLuz, miniFigura, tonoObjeto } from './adornos.js';
import { montarFondo } from './fondo.js';

const RUTA_DATOS = 'contenido/datos';
const app = document.getElementById('app');
const guardado = crearGuardado();
let juego = null;
let pantallaActual = null; // para parar pistas al salir

const h = (strings, ...vals) => strings.reduce((s, str, i) => s + str + (i < vals.length ? vals[i] : ''), '');

function nivelPorId(id) { return juego.niveles.find(n => n.id === id); }

function cabecera(titulo, sub = '') {
  return h`<header class="barra">
    <a class="volver" href="#/">← Cielo</a>
    <div><h1>${escapar(titulo)}</h1>${sub ? `<p class="sub">${escapar(sub)}</p>` : ''}</div>
  </header>`;
}

function ficha(nivel) {
  const o = nivel.tejedora.objeto;
  return h`<article class="ficha">
    <p class="eyebrow">${escapar(o.tipo)} · en ${escapar(nivel.nombre)}</p>
    <h2>${escapar(o.nombre)} <span class="cat">${escapar(o.id)}</span></h2>
    <dl class="datos"><div><dt>Distancia</dt><dd>${escapar(o.distancia)}</dd></div><div><dt>Tamaño</dt><dd>${escapar(o.tamano)}</dd></div></dl>
    <p>${escapar(o.texto)}</p>
    <h3>Por qué tiene ese color</h3>
    <p>${escapar(o.por_que_color)}</p>
    <ul class="colores">${o.colores.map(c => `<li><span class="muestra" style="background:${escapar(c.hex)}"></span><span><strong>${escapar(c.nombre)}</strong> · ${escapar(c.origen)}</span></li>`).join('')}</ul>
  </article>`;
}

// ---------- Inicio ----------
function pantallaInicio() {
  const atlas = guardado.atlas();
  app.innerHTML = h`
    <header class="portada">
      <img src="assets/simbolo.svg" alt="" width="72" height="72">
      <div><h1 class="marca">Astraloom</h1><p class="sub">Devuelve las estrellas a su sitio y teje el cielo.</p></div>
    </header>
    <nav class="acciones"><a class="boton" href="#/atlas">Atlas · ${atlas.length} de ${juego.niveles.length}</a></nav>
    <ul class="rejilla">${juego.niveles.map(n => {
      const e = guardado.estado(n.id);
      const fase = e.tejedora ? 'despierta' : e.aprendiz ? 'aprendiz' : 'pendiente';
      return h`<li class="tarjeta-const ${fase}" data-id="${n.id}" style="--tono:${tonoObjeto(n.tejedora.objeto)}">
        <div class="ventana"></div>
        ${e.tejedora ? `<span class="sello">✦ Despierta</span>` : ''}
        <h2>${escapar(n.nombre)}</h2>
        <p class="sub">${escapar(n.temporada)}</p>
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
      <p>Datos de estrellas: HYG Database v3.8 (CC BY-SA 4.0). Figuras: Stellarium (cultura «modern»). Prototipo v0.2, gráficos provisionales.</p>
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

// ---------- Aprendiz ----------
function pantallaAprendiz(nivel) {
  app.innerHTML = cabecera(nivel.nombre, 'Aprendiz · arrastra cada estrella a su hueco') +
    `<section class="escena"><div class="cielo"></div><div class="tarjeta"><div class="contenido" aria-live="polite"><p class="sub">Así es ${escapar(nivel.nombre)}. Fíjate en su forma…</p></div></div></section>`;
  const tarjeta = app.querySelector('.contenido');
  let colocadas = 0;
  const contador = crearContador(app.querySelector('.tarjeta'), nivel.aprendiz.estrellas.length, ' estrellas');
  pantallaActual = montarAprendiz(app.querySelector('.cielo'), nivel, {
    alTocarMisterio: () => ir(`#/tejedora/${nivel.id}`),
    alEmpezar() { tarjeta.innerHTML = '<p class="sub">Las estrellas se han soltado. Llévalas a su sitio, o toca un hueco y su estrella irá sola.</p>'; },
    alColocar(estrella) {
      contador.poner(++colocadas, estrella.nombre ? `${estrella.nombre} vuelve a su sitio` : '');
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
  if (!guardado.estado(nivel.id).aprendiz) { ir(`#/aprendiz/${nivel.id}`, { reemplazar: true }); return; }
  app.innerHTML = cabecera(nivel.nombre, 'Tejedora · teje la figura sobre el cielo real') +
    `<section class="escena"><div class="cielo"></div><div class="tarjeta"><div class="contenido" aria-live="polite"></div></div></section>`;
  const tarjeta = app.querySelector('.contenido');
  const ayuda = texto => { tarjeta.innerHTML = `<p class="sub">${texto}</p>`; };
  const contador = crearContador(app.querySelector('.tarjeta'), nivel.lineas.length, ' hilos');
  let despierto = false;
  async function despertarYa() { // desde el botón o tocando el brillo del cielo
    if (despierto) return;
    despierto = true;
    tarjeta.querySelector('#despertar')?.setAttribute('disabled', '');
    const { svg, objeto, quitarLlamada } = pantallaActual;
    quitarLlamada();
    await despertar(svg, nivel.tejedora.objeto, objeto.x, objeto.y, 120);
    contador.quitar(); // la ficha ocupa ya toda la tarjeta
    tarjeta.innerHTML = ficha(nivel) + `<div class="acciones"><a class="boton principal" href="#/atlas">Ver el atlas</a><a class="boton" href="#/">Volver al cielo</a></div>`;
  }
  pantallaActual = montarTejedora(app.querySelector('.cielo'), nivel, {
    alTejer: n => contador.poner(n),
    alCompletar() {
      guardado.completar(nivel.id, 'tejedora'); // se guarda ya en el atlas
      tarjeta.innerHTML = h`<p class="eyebrow">Has tejido ${escapar(nivel.nombre)}</p>
        <p>Algo brilla en este trozo de cielo. Tócalo para despertarlo.</p>
        <div class="acciones"><button class="boton principal" id="despertar">Despertar</button></div>`;
      tarjeta.querySelector('#despertar').addEventListener('click', despertarYa);
    },
    alDespertar: despertarYa,
  });
  ayuda('Repasa la figura con hilos de luz: toca una estrella y luego otra, o arrastra entre ellas.');
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
            <p class="sub">${escapar(o.id)} · en ${escapar(n.nombre)}</p></div></a></li>`
        : `<li style="--i:${i}"><a class="tarjeta-objeto dormido" href="#/${e.aprendiz ? 'tejedora' : 'aprendiz'}/${n.id}">
            <div class="portal" data-fig="${n.id}"></div>
            <div class="pie-objeto"><p class="eyebrow">Dormido</p><h2>Algo duerme aquí</h2>
            <p class="sub">${e.aprendiz ? `Teje ${escapar(n.nombre)} para despertarlo` : `Empieza por ${escapar(n.nombre)}`}</p></div></a></li>`;
    }).join('')}</ul>`;
  app.querySelectorAll('.portal[data-id]').forEach(c => { miniObjeto(c, nivelPorId(c.dataset.id), 220); bordeLuz(c.closest('.tarjeta-objeto')); });
  app.querySelectorAll('.portal[data-fig]').forEach(c => miniFigura(c, nivelPorId(c.dataset.fig), 'pendiente'));
}

function pantallaObjeto(nivel) {
  if (!guardado.atlas().includes(nivel.id)) { ir('#/atlas', { reemplazar: true }); return; }
  app.innerHTML = cabecera(nivel.tejedora.objeto.nombre, `Atlas · ${nivel.nombre}`) +
    `<section class="escena"><div class="cielo objeto-grande"></div><div class="tarjeta">${ficha(nivel)}<div class="acciones"><a class="boton" href="#/atlas">Volver al atlas</a></div></div></section>`;
  miniObjeto(app.querySelector('.cielo'), nivel, 300);
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

document.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="#/"]');
  if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
  ev.preventDefault();
  ir(a.getAttribute('href'));
});

function navegar() {
  pantallaActual?.parar?.();
  pantallaActual = null;
  const [, pantalla, id] = ruta.replace(/^#?\/?/, '#/').split('/');
  const nivel = id && nivelPorId(id);
  window.scrollTo(0, 0);
  if (pantalla === 'aprendiz' && nivel) pantallaAprendiz(nivel);
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
  navegar();
}

montarFondo();
iniciar();
