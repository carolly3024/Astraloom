"""Genera datos/cielo/<CON>.json para las 88 constelaciones.

Fuentes (sin tocar a mano):
  - Estrellas: catálogo HYG v3.8 (astronexus, CC BY-SA 4.0), hyg_v38.csv
  - Figuras (líneas): Stellarium, cultura del cielo «modern», index.json
Uso:
  python3 generar_cielo.py hyg_v38.csv index.json ../datos/cielo [../datos/textos]
Si se da la carpeta de textos, el recuadro de cada constelación se amplía
para que su objeto de cielo profundo quede dentro.
"""
import csv, json, math, sys, os

MAG_FONDO = 5.0      # estrellas de fondo para Tejedora: hasta magnitud 5
MARGEN_GRADOS = 4.0  # margen alrededor de la figura

def color_hex(bv):
    """Color aproximado de una estrella a partir de su índice B-V.
    B-V -> temperatura (Ballesteros 2012) -> RGB de cuerpo negro (aprox. Tanner Helland)."""
    if bv is None:
        return None
    bv = max(-0.4, min(2.0, bv))
    t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
    x = t / 100
    if x <= 66:
        r = 255
        g = 99.4708025861 * math.log(x) - 161.1195681661
        b = 0 if x <= 19 else 138.5177312231 * math.log(x - 10) - 305.0447927307
    else:
        r = 329.698727446 * (x - 60) ** -0.1332047592
        g = 288.1221695283 * (x - 60) ** -0.0755148492
        b = 255
    c = lambda v: max(0, min(255, int(round(v))))
    return "#%02x%02x%02x" % (c(r), c(g), c(b)), int(round(t, -1))

def num(v):
    return float(v) if v not in ("", None) else None

def main(hyg_path, lines_path, out_dir, textos_dir=None):
    by_hip, todas = {}, []
    with open(hyg_path, newline="") as f:
        for row in csv.DictReader(f):
            mag = num(row["mag"])
            if mag is None or mag > 6.5 or row["proper"] == "Sol":
                continue
            ci = num(row["ci"])
            ch = color_hex(ci)
            s = {
                "hip": int(row["hip"]) if row["hip"] else None,
                "nombre": row["proper"] or None,
                "bayer": row["bayer"] or None,
                "flamsteed": int(row["flam"]) if row["flam"] else None,
                "ar": round(float(row["ra"]) * 15, 5),   # ascensión recta en grados
                "dec": round(float(row["dec"]), 5),        # declinación en grados
                "mag": round(mag, 2),
                "bv": ci,
                "temperatura_k": ch[1] if ch else None,
                "color": ch[0] if ch else None,
                "espectro": row["spect"] or None,
                "distancia_al": round(float(row["dist"]) * 3.26156, 1) if num(row["dist"]) and float(row["dist"]) < 100000 else None,
                "con": row["con"] or None,
            }
            todas.append(s)
            if s["hip"]:
                by_hip[s["hip"]] = s

    sky = json.load(open(lines_path))
    os.makedirs(out_dir, exist_ok=True)
    faltan = []
    for con in sky["constellations"]:
        abbr = con["id"].split()[-1]
        hips = sorted({h for l in con["lines"] for h in l})
        estrellas = []
        for h in hips:
            if h not in by_hip:
                faltan.append((abbr, h))
                continue
            estrellas.append(by_hip[h])
        # Recuadro de la figura (ojo con el cruce de AR 0/360)
        ars = [s["ar"] for s in estrellas]
        decs = [s["dec"] for s in estrellas]
        extra_ar, extra_dec = [], []
        tp = os.path.join(textos_dir, abbr + ".json") if textos_dir else None
        if tp and os.path.exists(tp):
            obj = json.load(open(tp))["objeto"]
            extra_ar, extra_dec = [obj["ar"]], [obj["dec"]]
        centro_ar = math.degrees(math.atan2(sum(math.sin(math.radians(a)) for a in ars),
                                            sum(math.cos(math.radians(a)) for a in ars))) % 360
        def dar(a):
            return (a - centro_ar + 180) % 360 - 180
        cosd = max(0.2, math.cos(math.radians(sum(decs) / len(decs))))
        rx = max(abs(dar(a)) for a in ars + extra_ar) + MARGEN_GRADOS / cosd
        dmin = min(decs + extra_dec) - MARGEN_GRADOS
        dmax = max(decs + extra_dec) + MARGEN_GRADOS
        fondo = [s for s in todas
                 if s["mag"] <= MAG_FONDO and s["hip"] not in hips
                 and dmin <= s["dec"] <= dmax and abs(dar(s["ar"])) <= rx]
        out = {
            "id": abbr,
            "nombre_latin": con["common_name"]["native"],
            "fuente": "HYG v3.8 + Stellarium (modern)",
            "centro": {"ar": round(centro_ar, 4), "dec": round(sum(decs) / len(decs), 4)},
            "recuadro": {"ar_semiancho": round(rx, 3), "dec_min": round(dmin, 3), "dec_max": round(dmax, 3)},
            "estrellas": [{k: v for k, v in s.items() if k != "con"} for s in estrellas],
            "lineas": [[l[i], l[i + 1]] for l in con["lines"] for i in range(len(l) - 1)],
            "fondo": [{k: s[k] for k in ("hip", "ar", "dec", "mag", "color")} for s in fondo],
        }
        with open(os.path.join(out_dir, abbr + ".json"), "w") as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
    print("Constelaciones:", len(sky["constellations"]))
    print("Estrellas de figura sin dato en HYG (mag > 6.5 o sin HIP):", faltan)

if __name__ == "__main__":
    main(*sys.argv[1:5])
