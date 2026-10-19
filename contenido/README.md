# Astraloom · Contenido (fase 2)

Datos y textos de las constelaciones del juego. El juego (fase 3) los carga tal cual: añadir una constelación es añadir datos, no tocar código.

## Qué hay aquí

| Ruta | Qué es | ¿Se edita a mano? |
|---|---|---|
| `datos/indice.json` | Qué constelaciones forman el juego base y la paleta de colores de referencia del atlas | Sí |
| `datos/cielo/<ID>.json` | Estrellas reales, líneas de la figura y estrellas de fondo. **Están las 88 constelaciones.** | No, se genera |
| `datos/textos/<ID>.json` | Dato de Aprendiz y ficha del objeto que despierta (texto, por qué tiene ese color, colores, fuentes) | Sí |
| `fichas.md` | Las fichas en formato de lectura, para revisar | No, se genera |
| `herramientas/` | Los dos scripts que generan lo anterior | |

`<ID>` es la abreviatura oficial de la IAU: `Ori`, `UMa`, `Cas`, `Lyr`, `Cyg`, `And`, `Tau`, `Sco`, `Sgr`, `Her`, `Cru`, `Leo`…

## Cómo añadir una constelación nueva

1. Sus estrellas y líneas ya existen en `datos/cielo/` (las 88 están generadas).
2. Copia un archivo de `datos/textos/` (por ejemplo `Lyr.json`), renómbralo con el ID nuevo y rellena los textos y el objeto.
3. Añade el ID a `juego_base` (o a una lista nueva de contenido extra) en `datos/indice.json`.
4. Vuelve a generar el cielo para que el recuadro incluya el objeto, y las fichas:
   ```
   python3 herramientas/generar_cielo.py hyg_v38.csv index.json datos/cielo datos/textos
   python3 herramientas/generar_fichas.py datos fichas.md
   ```

## Formato

### `datos/cielo/<ID>.json` (generado)
- `centro`: centro de la figura (`ar`, `dec` en grados, J2000).
- `recuadro`: trozo de cielo que muestra Tejedora (incluye el objeto de cielo profundo).
- `estrellas[]`: `hip` (número Hipparcos, el identificador que usan las líneas), `nombre` (IAU), `bayer`, `ar`, `dec`, `mag` (magnitud aparente: menor = más brillante), `bv`, `temperatura_k` y `color` (aproximados, para pintar la estrella), `espectro`, `distancia_al` (años luz, de la paralaje de Hipparcos).
- `lineas[]`: pares de números `hip` que se unen con un hilo.
- `fondo[]`: estrellas reales cercanas hasta magnitud 5, que en Tejedora hacen de distracción.

### `datos/textos/<ID>.json` (a mano)
- `nombre`, `orden` (solo desempata: el juego ordena de más fácil a más difícil por estrellas + hilos), `temporada`, `nombres_es` (nombre en español de una estrella cuando difiere del IAU, por `hip`).
- `aprendiz.dato`: lo que aparece al completar Aprendiz.
- `objeto`: lo que despierta Tejedora. `id`, `nombre`, `tipo`, `pista` (frase corta que se ve en el atlas mientras duerme, sin decir qué es), `forma` (pista para la animación: `nebulosa_difusa`, `continente`, `laguna`, `burbuja`, `anillo`, `filamentos`, `espiral_de_frente`, `espiral_inclinada`, `trio_de_galaxias`, `globular`, `globular_disperso`, `cumulo_abierto`), `ar`/`dec`, `distancia`, `tamano`, `texto`, `por_que_color`, `colores[]` (`hex`, `nombre`, `origen`, `peso` = proporción del color en la nube) y `fuentes[]`.
- `estado`: `borrador` o `verificado`.

## Decisiones y su porqué

- **Un archivo por constelación, separado en cielo y textos.** El cielo sale de catálogos y se puede regenerar sin pisar los textos; los textos se escriben a mano. Así añadir una de las 76 restantes es solo escribir su ficha.
- **Las 88 constelaciones generadas desde el principio.** Cuesta lo mismo que generar 12 y deja el contenido extra listo.
- **Fuentes de datos:** estrellas del catálogo HYG v3.8 (Hipparcos, Yale y Gliese); figuras de la cultura «modern» de Stellarium, que son las líneas que conoce casi todo el mundo.
- **Colores del objeto por su física, no por gusto.** Cada color dice de dónde sale (hidrógeno, oxígeno, estrellas viejas…). El juego puede «encender» la nebulosa con esos colores en sus proporciones, y la ficha explica por qué. Todos los objetos usan la misma paleta de referencia (`indice.json`) para que el atlas sea coherente.
- **Objetos variados:** nebulosas de emisión, una planetaria, un resto de supernova, galaxias, cúmulos globulares y uno abierto, para que cada despertar sea distinto.
- **Distancias redondeadas, con el rango cuando las medidas no coinciden** (por ejemplo, la Burbuja).
- **Textos breves y sin jerga**, con el tono tranquilo del juego.

## Avisos sobre los datos

- `distancia_al` de las estrellas viene de Hipparcos y es poco fiable para estrellas lejanas (por ejemplo Alnilam o Deneb). No se usa en los textos.
- `temperatura_k` y `color` de las estrellas se calculan del índice B-V: sirven para pintar, no como dato científico.
- Dos estrellas de figura no están en el catálogo filtrado (una en Can Mayor y otra en Monoceros); no afectan al juego base.

## Fuentes y licencias

- HYG Database v3.8, astronexus: https://github.com/astronexus/HYG-Database (CC BY-SA 4.0). Descarga: `hyg/v3/hyg_v38.csv.gz`.
- Stellarium, cultura del cielo «modern»: https://github.com/Stellarium/stellarium/tree/master/skycultures/modern (`index.json`).
- Las fuentes de cada texto están en su archivo de `datos/textos/`.
- Los créditos de HYG y Stellarium deberán aparecer en la pantalla de créditos del juego.
