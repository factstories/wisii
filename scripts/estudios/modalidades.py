"""Estudio 1 · ¿Cómo se contrata? Modalidad de selección por año y gobierno.

Mide cuánto se contrata de forma directa (sin competencia) frente a las
modalidades competitivas, en número de contratos y en valor, y lista los
contratos directos de mayor valor. La contratación directa es legal (Ley 1150
de 2007, art. 2 num. 4), pero es la excepción: su peso es un indicador clásico
de veeduría.

Uso:
  python3 scripts/estudios/modalidades.py [--entidad "..."] [--top 15]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def resumen(cs):
    n, v = len(cs), sum(c["valor"] for c in cs)
    d = [c for c in cs if familia_modalidad(c["modalidad"]) == "Contratación directa"]
    vd = sum(c["valor"] for c in d)
    return {"n": n, "valor": v, "directa_n": len(d), "directa_valor": vd,
            "pct_directa_n": len(d) / n if n else 0, "pct_directa_valor": vd / v if v else 0}


def estudiar(cs, top=15):
    por_anio = {a: resumen(g) for a, g in sorted(agrupar(cs, lambda c: c["firma"][:4]).items())}
    por_periodo = {p: resumen(g) for p, g in sorted(agrupar(cs, lambda c: periodo(c["firma"])).items()) if p}
    familias = {}
    for fam, g in agrupar(cs, lambda c: familia_modalidad(c["modalidad"])).items():
        familias[fam] = {"n": len(g), "valor": sum(c["valor"] for c in g)}
    # directa fuera de prestación de servicios: obras, suministros, compraventas…
    directa_no_serv = [c for c in cs if familia_modalidad(c["modalidad"]) == "Contratación directa"
                       and familia_tipo(c["tipo"]) != "Prestación de servicios"]
    por_tipo = {t: {"n": len(g), "valor": sum(c["valor"] for c in g)}
                for t, g in agrupar(directa_no_serv, lambda c: familia_tipo(c["tipo"])).items()}
    mayores = sorted((c for c in cs if familia_modalidad(c["modalidad"]) == "Contratación directa"),
                     key=lambda c: -c["valor"])[:top]
    return {"por_anio": por_anio, "por_periodo": por_periodo, "familias": familias,
            "directa_no_servicios_por_tipo": por_tipo,
            "directos_mayor_valor": [{k: c[k] for k in ("id", "firma", "proveedor", "tipo", "valor", "objeto")}
                                     for c in mayores]}


def informe(r, entidad):
    md = [f"# Modalidades de contratación · {entidad or 'todas las entidades'}\n"]
    md.append("## Por gobierno\n")
    md.append(tabla(["Período", "Contratos", "Valor", "% directa (n)", "% directa (valor)"],
                    [[p, entero(x["n"]), mmm(x["valor"]), pct(x["pct_directa_n"]), pct(x["pct_directa_valor"])]
                     for p, x in r["por_periodo"].items()]))
    md.append("\n## Por año\n")
    md.append(tabla(["Año", "Contratos", "Valor", "% directa (n)", "% directa (valor)"],
                    [[a, entero(x["n"]), mmm(x["valor"]), pct(x["pct_directa_n"]), pct(x["pct_directa_valor"])]
                     for a, x in r["por_anio"].items()]))
    tot = sum(x["valor"] for x in r["familias"].values())
    md.append("\n## Familias de modalidad (todo el período)\n")
    md.append(tabla(["Modalidad", "Contratos", "Valor", "% valor"],
                    [[f, entero(x["n"]), mmm(x["valor"]), pct(x["valor"] / tot)]
                     for f, x in sorted(r["familias"].items(), key=lambda kv: -kv[1]["valor"])]))
    md.append("\n## Contratación directa que no es prestación de servicios\n")
    md.append(tabla(["Tipo", "Contratos", "Valor"],
                    [[t, entero(x["n"]), mmm(x["valor"])]
                     for t, x in sorted(r["directa_no_servicios_por_tipo"].items(), key=lambda kv: -kv[1]["valor"])]))
    md.append("\n## Contratos directos de mayor valor\n")
    md.append(tabla(["Firma", "Contratista", "Tipo", "Valor", "Objeto"],
                    [[c["firma"], c["proveedor"][:40], c["tipo"], millones(c["valor"]), c["objeto"][:80]]
                     for c in r["directos_mayor_valor"]]))
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.add_argument("--top", type=int, default=15)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs, a.top)
    print(guardar("modalidades", r, informe(r, a.entidad), a.salida))
