"""Estudio 2 · ¿Cuándo se contrata? Ritmo mensual, cierres de año, Ley de
Garantías y arranque de cada gobierno.

- Contratos y valor por mes; peso de diciembre y de su segunda quincena.
- Ley de Garantías (Ley 996 de 2005): compara el ritmo diario de contratación
  directa en los 30 días previos a cada restricción presidencial con los 90
  días anteriores a ese tramo, y con el período restringido. Un pico justo
  antes es la «carrera» que la prensa suele reportar.
- Convenios interadministrativos alrededor de las restricciones territoriales.
- Primeros 60 días de cada gobierno frente a su promedio.

Uso:
  python3 scripts/estudios/calendario.py [--entidad "..."]
"""
import sys, os
from datetime import timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def directa(c):
    return familia_modalidad(c["modalidad"]) == "Contratación directa"


def ritmo(cs, a, b):
    """Contratos y valor por día entre las fechas a y b (inclusive)."""
    g = [c for c in cs if a <= c["firma"] <= b]
    dias = (fecha(b) - fecha(a)).days + 1
    return {"n": len(g), "valor": sum(c["valor"] for c in g), "dias": dias,
            "n_dia": len(g) / dias, "valor_dia": sum(c["valor"] for c in g) / dias}


def menos(f, d):
    return (fecha(f) - timedelta(days=d)).isoformat()


def es_convenio(c):
    # el SECOP no tiene un tipo propio para convenios: se reconocen por el objeto
    return "convenio" in normalizar(c["objeto"])


def meses_duracion(c):
    """Duración en meses entre inicio y fin (None si las fechas no sirven)."""
    a, b = fecha(c["inicio"]), fecha(c["fin"])
    if not a or not b or b < a or (b - a).days > 1500:
        return None
    return (b - a).days / 30.44


def estudiar(cs):
    ultimo = max(c["firma"] for c in cs)
    meses = {m: {"n": len(g), "valor": sum(c["valor"] for c in g)}
             for m, g in sorted(agrupar(cs, lambda c: c["firma"][:7]).items())}
    cierres = {}
    for anio, g in agrupar(cs, lambda c: c["firma"][:4]).items():
        if f"{anio}-12-31" > ultimo:
            continue  # año incompleto
        v = sum(c["valor"] for c in g)
        dic = [c for c in g if c["firma"][5:7] == "12"]
        q2 = [c for c in dic if c["firma"][8:10] >= "16"]
        cierres[anio] = {"n": len(g), "valor": v,
                         "pct_diciembre_n": len(dic) / len(g), "pct_diciembre_valor": sum(c["valor"] for c in dic) / v,
                         "pct_2a_quincena_dic_valor": sum(c["valor"] for c in q2) / v}
    dirs = [c for c in cs if directa(c)]
    garantias = {}
    for eleccion, ini, fin in GARANTIAS_PRESIDENCIALES:
        if ini > ultimo:
            continue
        base = ritmo(dirs, menos(ini, 120), menos(ini, 31))
        previo = ritmo(dirs, menos(ini, 30), menos(ini, 1))
        durante = ritmo(dirs, ini, min(fin, ultimo))
        garantias[eleccion] = {"inicio": ini, "fin": fin, "base_90d": base, "previo_30d": previo,
                               "durante": durante,
                               "multiplo_previo_n": previo["n_dia"] / base["n_dia"] if base["n_dia"] else None,
                               "multiplo_previo_valor": previo["valor_dia"] / base["valor_dia"] if base["valor_dia"] else None}
    convs = [c for c in cs if es_convenio(c)]
    territoriales = {}
    for eleccion, ini, fin in GARANTIAS_TERRITORIALES:
        territoriales[eleccion] = {"inicio": ini, "fin": fin,
                                   "base_90d": ritmo(convs, menos(ini, 120), menos(ini, 31)),
                                   "previo_30d": ritmo(convs, menos(ini, 30), menos(ini, 1)),
                                   "durante": ritmo(convs, ini, fin)}
    # Control de estacionalidad: enero siempre es distinto, así que se compara
    # la porción del año firmada antes del corte (inicio de la restricción en
    # años de elección presidencial; 28 de enero en los demás).
    cortes = {e: ini for e, ini, _ in GARANTIAS_PRESIDENCIALES}
    enero = {}
    for anio, g in sorted(agrupar(dirs, lambda c: c["firma"][:4]).items()):
        corte = cortes.get(anio, f"{anio}-01-28")
        antes = [c for c in g if c["firma"] < corte]
        durs = [m for m in map(meses_duracion, antes) if m is not None]
        enero[anio] = {"electoral": anio in cortes, "corte": corte, "n": len(antes), "n_anio": len(g),
                       "pct_n": len(antes) / len(g), "pct_valor": sum(c["valor"] for c in antes) / (sum(c["valor"] for c in g) or 1),
                       "duracion_media_meses": sum(durs) / len(durs) if durs else None,
                       "anio_completo": f"{anio}-12-31" <= ultimo}
    # firmas de contratación directa dentro de cada restricción presidencial, por día
    dentro = {}
    for e, ini, fin in GARANTIAS_PRESIDENCIALES:
        w = [c for c in dirs if ini <= c["firma"] <= min(fin, ultimo)]
        excepcion = [c for c in w if any(k in normalizar(c["objeto"]) for k in
                     ("iota", "emergencia", "desastre", "reconstruc", "salud", "covid", "pandemia"))]
        dentro[e] = {"n": len(w), "valor": sum(c["valor"] for c in w), "con_palabras_de_excepcion": len(excepcion),
                     "dias": dict(sorted(((f, len(g)) for f, g in agrupar(w, lambda c: c["firma"]).items()),
                                         key=lambda x: -x[1])[:5])}
    # mes de terminación de los contratos de servicios: ¿siguen el calendario electoral?
    serv = [c for c in dirs if familia_tipo(c["tipo"]) == "Prestación de servicios"]
    fin_mes = {}
    for anio, g in sorted(agrupar(serv, lambda c: c["fin"][:4]).items()):
        if len(g) >= 200 and anio <= ultimo[:4]:
            fin_mes[anio] = {m: len(x) / len(g) for m, x in sorted(agrupar(g, lambda c: c["fin"][5:7]).items())}
    dias_pico = sorted(((f, len(g), sum(c["valor"] for c in g)) for f, g in agrupar(dirs, lambda c: c["firma"]).items()),
                       key=lambda x: -x[1])[:15]
    arranques = {}
    for pid, a, b in PERIODOS:
        b2 = min(b, ultimo)
        if a > ultimo:
            continue
        total = ritmo(cs, a, b2)
        primeros = ritmo(cs, a, (fecha(a) + timedelta(days=59)).isoformat())
        arranques[pid] = {"promedio": total, "primeros_60d": primeros}
    return {"ultimo": ultimo, "meses": meses, "cierres": cierres, "garantias_presidenciales": garantias,
            "convenios_territoriales": territoriales, "arranques": arranques,
            "enero_electoral": enero, "directa_dentro_restriccion": dentro, "fin_por_mes": fin_mes, "dias_pico": [{"fecha": f, "n": n, "valor": v} for f, n, v in dias_pico]}


def informe(r, entidad):
    md = [f"# Calendario de contratación · {entidad or 'todas las entidades'}\n",
          f"Datos hasta {r['ultimo']}.\n", "## Cierres de año\n"]
    md.append(tabla(["Año", "Contratos", "Valor", "% dic. (n)", "% dic. (valor)", "% 2.ª quincena dic. (valor)"],
                    [[a, entero(x["n"]), mmm(x["valor"]), pct(x["pct_diciembre_n"]), pct(x["pct_diciembre_valor"]),
                      pct(x["pct_2a_quincena_dic_valor"])] for a, x in sorted(r["cierres"].items())]))
    md.append("\nUn mes «neutro» pesaría 8,3%.\n\n## Ley de Garantías · contratación directa antes de elecciones presidenciales\n")
    md.append(tabla(["Elección", "Restricción", "Base (contratos/día)", "30 días previos", "Múltiplo (n)",
                     "Múltiplo (valor)", "Durante (contratos/día)"],
                    [[e, f"{x['inicio']} → {x['fin']}", f"{x['base_90d']['n_dia']:.1f}", f"{x['previo_30d']['n_dia']:.1f}",
                      f"{x['multiplo_previo_n']:.1f}×" if x["multiplo_previo_n"] else "—",
                      f"{x['multiplo_previo_valor']:.1f}×" if x["multiplo_previo_valor"] else "—",
                      f"{x['durante']['n_dia']:.1f}"] for e, x in r["garantias_presidenciales"].items()]))
    md.append("\n### Control de estacionalidad: contratación directa firmada antes del corte de enero\n")
    md.append("Corte = inicio de la restricción en años de elección presidencial; 28 de enero en los demás.\n")
    md.append(tabla(["Año", "¿Elección presidencial?", "Corte", "Contratos antes", "% del año (n)", "% del año (valor)",
                     "Duración media (meses)"],
                    [[a + ("" if x["anio_completo"] else " (parcial)"), "sí" if x["electoral"] else "no", x["corte"],
                      entero(x["n"]), pct(x["pct_n"]), pct(x["pct_valor"]),
                      f"{x['duracion_media_meses']:.1f}" if x["duracion_media_meses"] else "—"]
                     for a, x in r["enero_electoral"].items()]))
    md.append("\n### Contratación directa firmada dentro de la restricción\n")
    md.append("La ley admite excepciones (defensa, salud, emergencias, reconstrucción por desastres, crédito). "
              "«Palabras de excepción» cuenta objetos que mencionan iota, emergencia, desastre, reconstrucción, salud o covid.\n")
    md.append(tabla(["Elección", "Contratos", "Valor", "Con palabras de excepción", "Días con más firmas"],
                    [[e, entero(x["n"]), mmm(x["valor"]), entero(x["con_palabras_de_excepcion"]),
                      ", ".join(f"{d} ({n})" for d, n in x["dias"].items())] for e, x in r["directa_dentro_restriccion"].items()]))
    md.append("\n### Mes de terminación de los contratos de servicios (% del año)\n")
    meses_n = [f"{m:02d}" for m in range(1, 13)]
    md.append(tabla(["Año"] + meses_n, [[a] + [pct(x.get(m, 0), 0) for m in meses_n] for a, x in r["fin_por_mes"].items()]))
    md.append("\n### Días con más contratos directos firmados\n")
    md.append(tabla(["Fecha", "Contratos", "Valor"], [[d["fecha"], entero(d["n"]), mmm(d["valor"])] for d in r["dias_pico"]]))
    md.append("\n## Convenios y elecciones territoriales\n")
    md.append(tabla(["Elección", "Base (90 d)", "30 días previos", "Durante restricción"],
                    [[e, f"{x['base_90d']['n']} ({mmm(x['base_90d']['valor'])})",
                      f"{x['previo_30d']['n']} ({mmm(x['previo_30d']['valor'])})",
                      f"{x['durante']['n']} ({mmm(x['durante']['valor'])})"]
                     for e, x in r["convenios_territoriales"].items()]))
    md.append("\n## Arranque de cada gobierno\n")
    md.append(tabla(["Período", "Contratos/día (promedio)", "Contratos/día (primeros 60 d)",
                     "Valor/día (promedio)", "Valor/día (primeros 60 d)"],
                    [[p, f"{x['promedio']['n_dia']:.1f}", f"{x['primeros_60d']['n_dia']:.1f}",
                      millones(x["promedio"]["valor_dia"]), millones(x["primeros_60d"]["valor_dia"])]
                     for p, x in r["arranques"].items()]))
    return "\n".join(md)


if __name__ == "__main__":
    a = argumentos(__doc__.splitlines()[0]).parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs)
    print(guardar("calendario", r, informe(r, a.entidad), a.salida))
