"""Genera la evidencia de la nota de Hallazgos sobre la Ley de Garantías.

Escribe public/data/hallazgos/2026-10-ley-de-garantias.json con todo lo que
grafica la nota (app/hallazgos/2026-10-ley-de-garantias/page.tsx), para que
la nota se pueda reconstruir con datos nuevos sin tocar el código:

  - corte: por año, qué parte de la contratación directa se firmó antes del
    corte de enero (inicio de la restricción en años de elección presidencial;
    28 de enero en los demás);
  - diarias: contratos directos firmados por día alrededor del corte, para los
    años de elección y un año de control;
  - dentro: contratos directos firmados dentro de cada restricción;
  - fin_por_mes: mes de terminación de los contratos de servicios, por año;
  - contratos_dentro: la lista completa de los firmados dentro de la restricción.

Uso:
  python3 scripts/estudios/nota_garantias.py [--entidad "..."] [--control 2025]
"""
import sys, os, json
from datetime import timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *
import calendario, modalidades

SALIDA_NOTA = os.path.join(RAIZ, "public", "data", "hallazgos", "2026-10-ley-de-garantias.json")
PALABRAS_EXCEPCION = ("iota", "emergencia", "desastre", "reconstruc", "salud", "covid", "pandemia")


def diarias(dirs, anio, corte):
    """Contratos directos por día, del 15 de diciembre anterior al 28 de febrero."""
    a, b = fecha(f"{int(anio) - 1}-12-15"), fecha(f"{anio}-02-28")
    cuenta = {f: len(g) for f, g in agrupar(dirs, lambda c: c["firma"]).items()}
    dias, d = [], a
    while d <= b:
        dias.append({"fecha": d.isoformat(), "n": cuenta.get(d.isoformat(), 0)})
        d += timedelta(days=1)
    return {"anio": anio, "corte": corte, "electoral": anio in {e for e, _, _ in GARANTIAS_PRESIDENCIALES}, "dias": dias}


def generar(cs, control="2025"):
    r = calendario.estudiar(cs)
    dirs = [c for c in cs if calendario.directa(c)]
    cortes = {e: ini for e, ini, _ in GARANTIAS_PRESIDENCIALES}
    lista = []
    for e, ini, fin in GARANTIAS_PRESIDENCIALES:
        for c in dirs:
            if ini <= c["firma"] <= fin:
                lista.append({"eleccion": e, "id": c["id"], "fuente": c["fuente"], "firma": c["firma"],
                              "inicio": c["inicio"], "fin": c["fin"], "valor": c["valor"], "proveedor": c["proveedor"],
                              "documento": c["documento"], "objeto": c["objeto"], "estado": c["estado"],
                              "entidad": c["entidad"], "enlace": c.get("enlace") or "",
                              "palabras_excepcion": any(k in normalizar(c["objeto"]) for k in PALABRAS_EXCEPCION)})
    # peso de la contratación directa en cada año completo con volumen suficiente
    mods = modalidades.estudiar(cs)["por_anio"]
    directa = {a: x["pct_directa_n"] for a, x in mods.items() if x["n"] >= 300}
    return {
        "generado": r["ultimo"],
        "directa_por_anio": directa, "directa_min": min(directa.values()) if directa else None, "entidad": cs[0]["entidad"] if cs else "",
        "restricciones": [{"eleccion": e, "inicio": a, "fin": b} for e, a, b in GARANTIAS_PRESIDENCIALES],
        "corte": [{"anio": int(a), **{k: x[k] for k in ("electoral", "corte", "n", "n_anio", "pct_n", "pct_valor",
                                                        "duracion_media_meses", "anio_completo")}}
                  for a, x in r["enero_electoral"].items() if x["n_anio"] >= 300],
        "diarias": [diarias(dirs, e, cortes[e]) for e in sorted(cortes) if cortes[e] <= r["ultimo"]]
                   + [diarias(dirs, control, f"{control}-01-28")],
        "dentro": [{"eleccion": e, **{k: x[k] for k in ("n", "valor", "con_palabras_de_excepcion")},
                    "dias": [{"fecha": f, "n": n} for f, n in x["dias"].items()]}
                   for e, x in r["directa_dentro_restriccion"].items()],
        "fin_por_mes": [{"anio": int(a), "meses": [x.get(f"{m:02d}", 0) for m in range(1, 13)]}
                        for a, x in r["fin_por_mes"].items()],
        "dias_pico": r["dias_pico"][:10],
        "contratos_dentro": lista,
    }


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.add_argument("--control", default="2025", help="año sin elección para comparar")
    p.add_argument("--archivo", default=SALIDA_NOTA)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    d = generar(cs, a.control)
    with open(a.archivo, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(a.archivo, f"{os.path.getsize(a.archivo) / 1024:.0f} KB", len(d["contratos_dentro"]), "contratos dentro")
