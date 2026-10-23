"""Estudio 6 · ¿Quién contrata con cada gobierno? Concentración y continuidad.

Por período de gobierno: contratistas distintos, índice de concentración
(Herfindahl-Hirschman, 0 a 10.000, sobre el valor), peso de los diez mayores,
y qué parte del valor se fue a contratistas que no habían contratado con la
entidad en el gobierno anterior. También lista quiénes contrataron en tres o
más gobiernos.

Uso:
  python3 scripts/estudios/continuidad.py [--entidad "..."] [--top 20]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def estudiar(cs, top=20):
    por = agrupar([c for c in cs if periodo(c["firma"])], lambda c: periodo(c["firma"]))
    ids = sorted(por)
    previos, filas = set(), {}
    for p in ids:
        g = por[p]
        v = sum(c["valor"] for c in g) or 1
        porc = agrupar(g, clave)
        cuotas = sorted((sum(c["valor"] for c in x) / v for x in porc.values()), reverse=True)
        nuevos = [c for c in g if clave(c) not in previos]
        filas[p] = {"contratos": len(g), "valor": v, "contratistas": len(porc),
                    "hhi": round(sum((s * 100) ** 2 for s in cuotas)), "top10": sum(cuotas[:10]),
                    "pct_valor_nuevos": sum(c["valor"] for c in nuevos) / v if previos else None}
        previos = set(porc)
    presencia = {}
    for k, g in agrupar(cs, clave).items():
        ps = sorted({periodo(c["firma"]) for c in g} - {None})
        if len(ps) >= 3:
            presencia[k] = {"contratista": g[0]["proveedor"], "periodos": ps, "n": len(g),
                            "valor": sum(c["valor"] for c in g)}
    persistentes = sorted(presencia.values(), key=lambda x: -x["valor"])
    return {"periodos": filas, "en_3_o_mas": len(persistentes), "persistentes": persistentes[:top]}


def informe(r, entidad):
    md = [f"# Concentración y continuidad · {entidad or 'todas las entidades'}\n"]
    md.append(tabla(["Período", "Contratos", "Valor", "Contratistas", "HHI", "Top 10", "% valor a nuevos"],
                    [[p, entero(x["contratos"]), mmm(x["valor"]), entero(x["contratistas"]), entero(x["hhi"]),
                      pct(x["top10"]), pct(x["pct_valor_nuevos"]) if x["pct_valor_nuevos"] is not None else "—"]
                     for p, x in r["periodos"].items()]))
    md.append("\nHHI: menos de 1.500 es poco concentrado; más de 2.500, muy concentrado. "
              "«Nuevos» = sin contratos con la entidad en el gobierno anterior.\n")
    md.append(f"\n## Contratistas presentes en tres o más gobiernos ({entero(r['en_3_o_mas'])})\n")
    md.append(tabla(["Contratista", "Gobiernos", "Contratos", "Valor"],
                    [[x["contratista"][:45], ", ".join(x["periodos"]), entero(x["n"]), mmm(x["valor"])]
                     for x in r["persistentes"]]))
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.add_argument("--top", type=int, default=20)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs, a.top)
    print(guardar("continuidad", r, informe(r, a.entidad), a.salida))
