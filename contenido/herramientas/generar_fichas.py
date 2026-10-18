"""Genera contenido/fichas.md (lectura y revisión) a partir de datos/textos/*.json.
Uso: python3 generar_fichas.py ../datos ../fichas.md
"""
import json, os, sys

def main(datos, salida):
    idx = json.load(open(os.path.join(datos, "indice.json")))
    L = ["# Astraloom · Fichas de contenido", "",
         "Archivo generado desde `datos/textos/`. No se edita a mano: se cambia el JSON y se vuelve a generar.", ""]
    for cid in idx["juego_base"]:
        t = json.load(open(os.path.join(datos, "textos", cid + ".json")))
        o = t["objeto"]
        L += [f"## {t['orden']}. {t['nombre']}", "",
              f"*Cuándo verla:* {t['temporada']}", "",
              f"**Aprendiz · dato.** {t['aprendiz']['dato']}", "",
              f"**Tejedora · despierta {o['nombre']}** ({o['id']}, {o['tipo']})", "",
              f"- Distancia: {o['distancia']}", f"- Tamaño: {o['tamano']}", "",
              o["texto"], "", f"**Por qué tiene ese color.** {o['por_que_color']}", "",
              "| Color | Muestra | De dónde sale | Peso |", "|---|---|---|---|"]
        for c in o["colores"]:
            L.append(f"| {c['nombre']} | `{c['hex']}` | {c['origen']} | {int(c['peso']*100)} % |")
        L += ["", "Fuentes: " + " · ".join(f"[{i+1}]({u})" for i, u in enumerate(o["fuentes"])), ""]
    open(salida, "w").write("\n".join(L))

if __name__ == "__main__":
    main(*sys.argv[1:3])
