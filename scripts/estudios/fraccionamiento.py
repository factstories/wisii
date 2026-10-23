"""Estudio 3 · Posible fraccionamiento: varios contratos con el mismo
contratista, objeto parecido y firmas cercanas.

Partir una compra en contratos más pequeños para evitar una modalidad más
exigente está prohibido (Ley 80 de 1993 y Ley 1150 de 2007). Este estudio no
lo demuestra: señala grupos que vale la pena revisar. En prestación de
servicios, contratos sucesivos con el mismo objeto son la norma (renovaciones),
así que ahí se exige un grupo de al menos tres contratos firmados casi a la vez;
en los demás tipos bastan dos. Aparte se listan pares de servicios parecidos
vigentes al mismo tiempo.

Un grupo = mismo contratista y entidad, contratos firmados con no más de
--dias días de diferencia entre uno y el siguiente, y objetos con similitud
de al menos --similitud (0 a 1, difflib).

Uso:
  python3 scripts/estudios/fraccionamiento.py [--dias 30] [--similitud 0.8] [--top 25]
"""
import sys, os
from difflib import SequenceMatcher
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def parecidos(a, b, umbral):
    a, b = normalizar(a["objeto"]), normalizar(b["objeto"])
    if not a or not b or a == "no definido" or b == "no definido":
        return False
    return a == b or SequenceMatcher(None, a, b).ratio() >= umbral


def fechas_validas(c):
    """Descarta fin antes del inicio o duraciones de más de cuatro años (errores de digitación)."""
    a, b = fecha(c["inicio"]), fecha(c["fin"])
    return bool(a and b and a <= b and (b - a).days <= 1460)


def grupos(cs, dias, umbral):
    out = []
    for (_, k), g in agrupar(cs, lambda c: (c["entidad"], clave(c))).items():
        if len(g) < 2:
            continue
        g.sort(key=lambda c: c["firma"])
        actual = [g[0]]
        for c in g[1:]:
            prev = actual[-1]
            if (fecha(c["firma"]) - fecha(prev["firma"])).days <= dias and parecidos(prev, c, umbral):
                actual.append(c)
            else:
                if len(actual) > 1:
                    out.append(actual)
                actual = [c]
        if len(actual) > 1:
            out.append(actual)
    return out


def resumir(g):
    smmlv = [x for x in map(en_smmlv, g) if x]
    return {"max_smmlv": max(smmlv) if smmlv else None,"contratista": g[0]["proveedor"], "documento": g[0]["documento"], "entidad": g[0]["entidad"],
            "n": len(g), "valor": sum(c["valor"] for c in g), "desde": g[0]["firma"], "hasta": g[-1]["firma"],
            "modalidades": sorted({familia_modalidad(c["modalidad"]) for c in g}),
            "tipos": sorted({c["tipo"] for c in g}), "objeto": g[0]["objeto"][:160],
            "ids": [c["id"] for c in g]}


def estudiar(cs, dias=30, umbral=0.8, top=25):
    def minimo(g):
        return 3 if familia_tipo(g[0]["tipo"]) == "Prestación de servicios" else 2
    gs = sorted((resumir(g) for g in grupos(cs, dias, umbral) if len(g) >= minimo(g)), key=lambda x: -x["valor"])
    # servicios: mismo contratista con dos contratos de objeto parecido vigentes a la vez
    serv = [c for c in cs if familia_tipo(c["tipo"]) == "Prestación de servicios" and fechas_validas(c)]
    dobles = []
    for (_, k), g in agrupar(serv, lambda c: (c["entidad"], clave(c))).items():
        g.sort(key=lambda c: c["inicio"])
        for a, b in zip(g, g[1:]):
            if b["inicio"] <= a["fin"] and b["inicio"] != a["inicio"] and parecidos(a, b, umbral) \
               and (fecha(a["fin"]) - fecha(b["inicio"])).days >= 15:
                dobles.append({"contratista": a["proveedor"], "documento": a["documento"], "entidad": a["entidad"],
                               "a": {k2: a[k2] for k2 in ("id", "firma", "inicio", "fin", "valor")},
                               "b": {k2: b[k2] for k2 in ("id", "firma", "inicio", "fin", "valor")},
                               "solape_dias": (fecha(a["fin"]) - fecha(b["inicio"])).days, "objeto": a["objeto"][:160]})
    dobles.sort(key=lambda x: -x["solape_dias"])
    return {"parametros": {"dias": dias, "similitud": umbral}, "grupos_n": len(gs),
            "grupos_valor": sum(g["valor"] for g in gs), "grupos": gs[:top],
            "por_tipo": {t: len([g for g in gs if t in g["tipos"]]) for t in sorted({t for g in gs for t in g["tipos"]})},
            "servicios_solapados_n": len(dobles), "servicios_solapados": dobles[:top]}


def informe(r, entidad):
    p = r["parametros"]
    md = [f"# Posible fraccionamiento · {entidad or 'todas las entidades'}\n",
          f"Grupos: mismo contratista y entidad, firmas a ≤{p['dias']} días entre sí y objetos con similitud ≥{p['similitud']}. "
          "En prestación de servicios se exigen tres o más contratos. **Son señales para revisar, no irregularidades probadas.**\n",
          f"**{entero(r['grupos_n'])} grupos** por {mmm(r['grupos_valor'])}.\n", "## Grupos de mayor valor\n"]
    md.append(tabla(["Contratista", "Entidad", "Contratos", "Valor", "Mayor (SMMLV)", "Entre", "Modalidad", "Objeto"],
                    [[g["contratista"][:35], g["entidad"][:25], g["n"], millones(g["valor"]),
                      f"{g['max_smmlv']:.1f}" if g["max_smmlv"] else "—", f"{g['desde']} → {g['hasta']}",
                      ", ".join(g["modalidades"]), g["objeto"][:60]] for g in r["grupos"]]))
    md.append(f"\n## Prestación de servicios: contratos parecidos vigentes a la vez\n\n"
              f"**{entero(r['servicios_solapados_n'])} pares** con al menos 15 días de solape.\n")
    md.append(tabla(["Contratista", "Contrato A (inicio → fin)", "Contrato B (inicio → fin)", "Solape (días)", "Objeto"],
                    [[d["contratista"][:35], f"{d['a']['inicio']} → {d['a']['fin']}", f"{d['b']['inicio']} → {d['b']['fin']}",
                      d["solape_dias"], d["objeto"][:60]] for d in r["servicios_solapados"]]))
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.add_argument("--dias", type=int, default=30)
    p.add_argument("--similitud", type=float, default=0.8)
    p.add_argument("--top", type=int, default=25)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs, a.dias, a.similitud, a.top)
    print(guardar("fraccionamiento", r, informe(r, a.entidad), a.salida))
