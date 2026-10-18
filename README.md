# Astraloom

Juego relajante de constelaciones para el navegador: teje estrellas reales y despierta nebulosas. Sin tiempo ni derrota.

Cada constelación tiene dos niveles:

- **Aprendiz**: las estrellas se han soltado y hay que arrastrarlas a sus huecos. Al completarla aparece un dato de la constelación y se abre Tejedora.
- **Tejedora**: las estrellas están en su posición real, entre estrellas vecinas, con la figura como guía tenue. Se repasa uniendo las estrellas con hilos de luz. Al terminar despierta un objeto de cielo profundo (una nebulosa, un cúmulo o una galaxia) que se guarda en el atlas con su ficha.

No hay puntuación, tiempo ni errores. Tras 20 segundos sin avanzar aparece una pista discreta, y a los 40 una segunda.

Proyecto de portfolio de carolly, llevado de principio a fin por fases (diseño, contenido, lógica, arte, sonido, pruebas y publicación).

## Estado: v0.3 (fase 4, arte y UI)

- Las 12 constelaciones del juego base se cargan desde los datos de `contenido/`.
- El progreso y el atlas se guardan en el navegador (`localStorage`).
- Arte final: pantalla de entrada con tutorial, ficha de la constelación mientras se juega, nebulosas pintadas punto a punto con sus colores reales y un despertar más pausado.
- Diseño en Figma: [guía visual y pantallas](https://www.figma.com/design/NYjhHgJy4RmuHcy7lxV6NA/Astraloom) (páginas «03 Guía visual» y «04 Pantallas», en escritorio y móvil).
- Pendiente: música y sonido (fase 5) y pruebas (fase 6).

## Cómo jugarlo en local

El juego lee sus datos con `fetch`, así que hay que servirlo desde un servidor local (abrir `index.html` con doble clic no funciona):

```
python3 -m http.server 8000
```

y abrir http://localhost:8000.

## Estructura

| Ruta | Qué es |
|---|---|
| `index.html`, `estilos.css` | La página del juego |
| `src/datos.js` | Lee el índice y las constelaciones y las convierte en niveles |
| `src/guardado.js` | Guarda el progreso y el atlas; si el navegador no deja guardar, sigue en memoria |
| `src/aprendiz.js`, `src/tejedora.js` | Los dos niveles |
| `src/despertar.js` | El momento de despertar: el cielo se apaga, las chispas se reúnen y se abre el objeto |
| `src/nebulosas.js` | Pinta cada objeto punto a punto con sus colores reales (`pruebas/galeria.html` los muestra juntos) |
| `src/pistas.js` | Las pistas sin castigo (20 s) |
| `src/main.js` | Pantallas y navegación |
| `src/sonido.js` | Música generativa y efectos con Tone.js: cada pantalla suena en la tonalidad del color de su objeto |
| `src/control-sonido.js` | Botón de sonido de la cabecera: silenciar y volumen de música y efectos |
| `src/intro.js` | Pantalla de entrada: logo animado y tutorial |
| `src/fondo.js`, `src/adornos.js` | El fondo de espacio profundo y los detalles de la interfaz (miniaturas, bordes de luz) |
| `src/panel.js` | Ficha de la constelación en la caja de información (silueta, mapa del cielo y estrellas) |
| `contenido/` | Datos reales de las 88 constelaciones y fichas de las 12 del juego (ver `contenido/README.md`) |
| `pruebas/probar.mjs` | Comprueba que todas las constelaciones cargan y que el guardado funciona: `node pruebas/probar.mjs` |

## Añadir una constelación

No hay que tocar código: se escribe su ficha en `contenido/datos/textos/` y se añade su ID a `contenido/datos/indice.json`. Los pasos están en `contenido/README.md`.

## Créditos

- Sonido: [Tone.js](https://tonejs.github.io/) 15.1.22 (MIT), copiado en `assets/vendor/`. Toda la música y los efectos se generan en el navegador, sin grabaciones.

## Créditos de los datos

- Estrellas: [HYG Database v3.8](https://github.com/astronexus/HYG-Database) (CC BY-SA 4.0).
- Figuras de las constelaciones: [Stellarium](https://github.com/Stellarium/stellarium), cultura del cielo «modern».
