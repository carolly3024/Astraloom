// Astraloom · contador de progreso («12 de 24 hilos»)
// Una forma de píldora que ocupa todo el ancho de la tarjeta y se rellena con el
// avance. Un borde de luz gira despacio a su alrededor. Dentro puede llevar
// un detalle, como el nombre de la estrella que acaba de volver a su sitio.

import { bordeLuz } from './adornos.js';

export function crearContador(padre, total, etiqueta = '') {
  const caja = document.createElement('div');
  caja.className = 'contador';
  caja.innerHTML = `<div class="contador-relleno"></div>
    <div class="contador-textos"><span class="contador-detalle"></span><span class="contador-texto"></span></div>`;
  bordeLuz(caja);
  padre.prepend(caja); // siempre arriba de la tarjeta
  const texto = caja.querySelector('.contador-texto'), detalle = caja.querySelector('.contador-detalle');
  const relleno = caja.querySelector('.contador-relleno');

  function poner(n, textoDetalle = '') {
    texto.textContent = `${n} de ${total}${etiqueta}`;
    detalle.textContent = textoDetalle;
    caja.classList.toggle('con-detalle', !!textoDetalle);
    relleno.style.width = `${(n / total) * 100}%`;
    caja.classList.toggle('lleno', n >= total);
  }
  poner(0);

  return { poner, quitar() { caja.remove(); } };
}
