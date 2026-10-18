// Astraloom · control de sonido: un botón en la cabecera de cada pantalla que abre
// un panel pequeño con «Sonido» (encendido/apagado) y el volumen de música y efectos.
// Los ajustes se guardan con el progreso.

import { leerAjustes, cambiarAjustes } from './sonido.js';

const ICONO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="altavoz" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/>
  <path class="ondas" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/><path class="cruz" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;

export function botonSonido() {
  const { silencio } = leerAjustes();
  return `<div class="control-sonido">
    <button class="boton-sonido${silencio ? ' callado' : ''}" type="button" aria-expanded="false" aria-label="Sonido" title="Sonido">${ICONO}</button>
  </div>`;
}

function panel() {
  const a = leerAjustes();
  const pct = v => Math.round(v * 100);
  return `<div class="panel-sonido" role="dialog" aria-label="Ajustes de sonido">
    <label class="interruptor"><span>Sonido</span><input type="checkbox" name="sonido" ${a.silencio ? '' : 'checked'}><i aria-hidden="true"></i></label>
    <label class="deslizador"><span>Música</span><input type="range" name="musica" min="0" max="100" step="5" value="${pct(a.musica)}"><output>${pct(a.musica)}</output></label>
    <label class="deslizador"><span>Efectos</span><input type="range" name="efectos" min="0" max="100" step="5" value="${pct(a.efectos)}"><output>${pct(a.efectos)}</output></label>
  </div>`;
}

function cerrarTodos(salvo) {
  document.querySelectorAll('.panel-sonido').forEach(p => {
    if (p.parentElement === salvo) return;
    p.parentElement.querySelector('.boton-sonido').setAttribute('aria-expanded', 'false');
    p.remove();
  });
}

// Un solo manejador para todos los botones (las pantallas se repintan enteras).
export function activarControlSonido() {
  document.addEventListener('click', ev => {
    const boton = ev.target.closest('.boton-sonido');
    const control = ev.target.closest('.control-sonido');
    cerrarTodos(control);
    if (!boton) return;
    if (control.querySelector('.panel-sonido')) { cerrarTodos(); return; }
    control.insertAdjacentHTML('beforeend', panel());
    boton.setAttribute('aria-expanded', 'true');
    control.querySelector('.panel-sonido input').focus({ preventScroll: true });
  });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    const abierto = document.querySelector('.panel-sonido');
    if (!abierto) return;
    const boton = abierto.parentElement.querySelector('.boton-sonido');
    cerrarTodos();
    boton.focus();
  });
  document.addEventListener('input', ev => {
    const campo = ev.target.closest('.panel-sonido input');
    if (!campo) return;
    if (campo.name === 'sonido') {
      cambiarAjustes({ silencio: !campo.checked });
      document.querySelectorAll('.boton-sonido').forEach(b => b.classList.toggle('callado', !campo.checked));
    } else {
      cambiarAjustes({ [campo.name]: campo.value / 100 });
      campo.nextElementSibling.textContent = campo.value;
    }
  });
}
