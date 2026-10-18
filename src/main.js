// Astraloom · prototipo v0.2
// Pantallas: inicio (constelaciones), Aprendiz, Tejedora, atlas y ficha de objeto.
// Navegación por la dirección (#/aprendiz/Ori, #/tejedora/Ori, #/atlas…).

import { cargarJuego } from './datos.js';
import { crearGuardado } from './guardado.js';
import { montarAprendiz } from './aprendiz.js';
import { montarTejedora } from './tejedora.js';
import { despertar, dibujarObjeto } from './despertar.js';
import { el, escapar } from './svg.js';

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
      return h`<li class="tarjeta-const ${e.tejedora ? 'despierta' : ''}">
        <h2>${escapar(n.nombre)}</h2>
        <p class="sub">${escapar(n.temporada)}</p>
        <p class="estado">${e.tejedora ? `✦ ${escapar(n.tejedora.objeto.nombre)}` : e.aprendiz ? 'Lista para tejer' : 'Por descubrir'}</p>
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
    `<section class="escena"><div class="cielo"></div><div class="tarjeta" aria-live="polite"><p class="sub">Las estrellas se han soltado. Llévalas a su sitio.</p></div></section>`;
  const tarjeta = app.querySelector('.tarjeta');
  let colocadas = 0;
  const total = nivel.aprendiz.estrellas.length;
  pantallaActual = montarAprendiz(app.querySelector('.cielo'), nivel, {
    alColocar(estrella) {
      colocadas++;
      tarjeta.innerHTML = `<p class="sub">${estrella.nombre ? `${escapar(estrella.nombre)} vuelve a su sitio. ` : ''}${colocadas} de ${total}</p>`;
    },
    alCompletar() {
      guardado.completar(nivel.id, 'aprendiz');
      tarjeta.innerHTML = h`<p class="eyebrow">Constelación completa</p>
        <h2>${escapar(nivel.nombre)}</h2>
        <p>${escapar(nivel.aprendiz.dato)}</p>
        <div class="acciones"><a class="boton principal" href="#/tejedora/${nivel.id}">Tejer sobre el cielo</a><a class="boton" href="#/">Volver al cielo</a></div>`;
    },
  });
}

// ---------- Tejedora ----------
function pantallaTejedora(nivel) {
  if (!guardado.estado(nivel.id).aprendiz) { ir(`#/aprendiz/${nivel.id}`, { reemplazar: true }); return; }
  app.innerHTML = cabecera(nivel.nombre, 'Tejedora · teje la figura sobre el cielo real') +
    `<section class="escena"><div class="cielo"></div><div class="tarjeta" aria-live="polite"></div></section>`;
  const tarjeta = app.querySelector('.tarjeta');
  const ayuda = texto => { tarjeta.innerHTML = `<p class="sub">${texto}</p>`; };
  pantallaActual = montarTejedora(app.querySelector('.cielo'), nivel, {
    alTejer: (n, total) => ayuda(`${n} de ${total} hilos`),
    alCompletar() {
      guardado.completar(nivel.id, 'tejedora'); // se guarda ya en el atlas
      tarjeta.innerHTML = h`<p class="eyebrow">Has tejido ${escapar(nivel.nombre)}</p>
        <p>Algo duerme en este trozo de cielo.</p>
        <div class="acciones"><button class="boton principal" id="despertar">Despertar</button></div>`;
      tarjeta.querySelector('#despertar').addEventListener('click', async ev => {
        ev.currentTarget.disabled = true;
        const { svg, objeto } = pantallaActual;
        await despertar(svg, nivel.tejedora.objeto, objeto.x, objeto.y, 85);
        tarjeta.innerHTML = ficha(nivel) + `<div class="acciones"><a class="boton principal" href="#/atlas">Ver el atlas</a><a class="boton" href="#/">Volver al cielo</a></div>`;
      });
    },
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
  app.innerHTML = cabecera('Atlas', `${atlas.size} de ${juego.niveles.length} objetos despiertos`) +
    `<ul class="rejilla atlas">${juego.niveles.map(n => atlas.has(n.id)
      ? `<li><a class="tarjeta-objeto" href="#/atlas/${n.id}"><div class="hueco-mini" data-id="${n.id}"></div><h2>${escapar(n.tejedora.objeto.nombre)}</h2><p class="sub">en ${escapar(n.nombre)}</p></a></li>`
      : `<li class="tarjeta-objeto dormido"><div class="hueco-mini vacio">?</div><h2>Por despertar</h2><p class="sub">en ${escapar(n.nombre)}</p></li>`).join('')}</ul>`;
  app.querySelectorAll('.hueco-mini[data-id]').forEach(c => miniObjeto(c, nivelPorId(c.dataset.id), 220));
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

iniciar();
