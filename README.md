# Astraloom

Juego relajante de constelaciones para el navegador: teje estrellas reales y despierta nebulosas. Sin tiempo ni derrota.

Cada constelación tiene dos niveles:

- **Aprendiz**: las estrellas se han soltado y hay que arrastrarlas a sus huecos. Al completarla aparece un dato de la constelación y se abre Tejedora.
- **Tejedora**: las estrellas están en su posición real, entre estrellas vecinas, con la figura como guía tenue. Se repasa uniendo las estrellas con hilos de luz. Al terminar despierta un objeto de cielo profundo (una nebulosa, un cúmulo o una galaxia) que se guarda en el atlas con su ficha.

No hay puntuación, tiempo ni errores. Tras 20 segundos sin avanzar aparece una pista discreta, y a los 40 una segunda.

Proyecto de portfolio de carolly, llevado de principio a fin por fases (diseño, contenido, lógica, arte, sonido, pruebas y publicación).

## Estado: prototipo v0.2 (fase 3, lógica)

- Las 12 constelaciones del juego base se cargan desde los datos de `contenido/`.
- El progreso y el atlas se guardan en el navegador (`localStorage`).
- Los gráficos son provisionales: el arte final llega en la fase 4.

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
| `src/despertar.js` | El estallido de estrellitas y el dibujo provisional de cada objeto |
| `src/pistas.js` | Las pistas sin castigo (20 s) |
| `src/main.js` | Pantallas y navegación |
| `src/intro.js` | Pantalla de entrada: logo animado y tutorial |
| `src/panel.js` | Ficha de la constelación en la caja de información (silueta, mapa del cielo y estrellas) |
| `contenido/` | Datos reales de las 88 constelaciones y fichas de las 12 del juego (ver `contenido/README.md`) |
| `pruebas/probar.mjs` | Comprueba que todas las constelaciones cargan y que el guardado funciona: `node pruebas/probar.mjs` |

## Añadir una constelación

No hay que tocar código: se escribe su ficha en `contenido/datos/textos/` y se añade su ID a `contenido/datos/indice.json`. Los pasos están en `contenido/README.md`.

## Créditos de los datos

- Estrellas: [HYG Database v3.8](https://github.com/astronexus/HYG-Database) (CC BY-SA 4.0).
- Figuras de las constelaciones: [Stellarium](https://github.com/Stellarium/stellarium), cultura del cielo «modern».
