"""Estudio 4 · Contratistas con muchos contratos vigentes a la vez.

Para cada contratista calcula el máximo de contratos simultáneos (por fechas
de inicio y fin) en una entidad y entre todas las entidades. Una persona con
varios contratos de prestación de servicios al mismo tiempo no es ilegal por
sí misma, pero obliga a preguntar si es posible cumplirlos todos.

Se descartan fechas inválidas (fin antes del inicio o duración de más de
cuatro años) para que un error de digitación no infle el resultado.

Uso:
  python3 scripts/estudios/simultaneidad.py [--entidad ""] [--minimo 3] [--top 25]
  (por defecto mira todas las entidades: la simultaneidad interesa entre ellas)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def max_simultaneos(cs):
    eventos = []
    for c in cs:
        a, b = fecha(c["inicio"]), fecha(c["fin"])
        if not a or not b or b < a or (b - a).days > 1460:
            continue
        eventos += [(a, 1, c), (b, -1, c)]
    eventos.sort(key=lambda e: (e[0], -e[1]))
    actual, mejor, cuando, vivos, mejores = 0, 0, None, set(), []
    for f, d, c in eventos:
        if d == 1:
            vivos.add(c["id"]); actual += 1
            if actual > mejor:
                mejor, cuando, mejores = actual, f, list(vivos)
        else:
            vivos.discard(c["id"]); actual -= 1
    return mejor, cuando, mejores


def estudiar(cs, minimo=3, top=25):
    serv = [c for c in cs if familia_tipo(c["tipo"]) == "Prestación de servicios"]
    por_id = {c["id"]: c for c in serv}
    filas = []
    for k, g in agrupar(serv, clave).items():
        if len(g) < minimo:
            continue
        m, cuando, ids = max_simultaneos(g)
        if m >= minimo:
            vig = [por_id[i] for i in ids]
            filas.append({"contratista": g[0]["proveedor"], "documento": g[0]["documento"], "maximo": m,
                          "fecha": cuando.isoformat(), "entidades": sorted({c["entidad"] for c in vig}),
                          "valor_vigente": sum(c["valor"] for c in vig), "contratos_total": len(g),
                          "ids": ids})
    filas.sort(key=lambda x: (-x["maximo"], -x["valor_vigente"]))
    reparto = {}
    for f in filas:
        reparto[f["maximo"]] = reparto.get(f["maximo"], 0) + 1
    return {"minimo": minimo, "contratistas": len(filas), "reparto": dict(sorted(reparto.items())),
            "varias_entidades": sum(1 for f in filas if len(f["entidades"]) > 1), "top": filas[:top]}


def informe(r, entidad):
    md = [f"# Contratos de servicios simultáneos · {entidad or 'todas las entidades'}\n",
          f"**{entero(r['contratistas'])} contratistas** llegaron a tener {r['minimo']} o más contratos de prestación de "
          f"servicios vigentes a la vez; {entero(r['varias_entidades'])} de ellos en más de una entidad.\n",
          tabla(["Contratos a la vez", "Contratistas"], [[k, entero(v)] for k, v in r["reparto"].items()]),
          "\n## Casos con más contratos simultáneos\n"]
    md.append(tabla(["Contratista", "Máximo a la vez", "Fecha", "Valor vigente", "Entidades"],
                    [[f["contratista"][:40], f["maximo"], f["fecha"], millones(f["valor_vigente"]),
                      "; ".join(e[:30] for e in f["entidades"])] for f in r["top"]]))
    md.append("\nPersonas jurídicas (empresas, fundaciones) pueden tener varios contratos legítimamente; "
              "el caso a revisar es el de personas naturales.")
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.set_defaults(entidad="")
    p.add_argument("--minimo", type=int, default=3)
    p.add_argument("--top", type=int, default=25)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs, a.minimo, a.top)
    print(guardar("simultaneidad", r, informe(r, a.entidad), a.salida))
