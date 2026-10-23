"""Estudio 7 · Calidad de los datos publicados.

Cuenta problemas que impiden o distorsionan el control ciudadano:
  - ejecución que empieza antes de la firma (inicio < firma), por año;
  - fin antes del inicio, o duraciones de más de cuatro años;
  - valor cero o negativo; objeto «No definido»; contratista sin documento;
  - posibles duplicados (mismo contratista, valor, fecha de firma y objeto).

Un inicio anterior a la firma puede ser un error de digitación o un «hecho
cumplido» (trabajo hecho sin contrato), que la ley prohíbe: por eso se separan
los casos de más de 30 días.

Uso:
  python3 scripts/estudios/calidad.py [--entidad ""]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def estudiar(cs):
    por_anio = {}
    for anio, g in sorted(agrupar(cs, lambda c: c["firma"][:4]).items()):
        antes = [c for c in g if fecha(c["inicio"]) and fecha(c["inicio"]) < fecha(c["firma"])]
        mucho = [c for c in antes if (fecha(c["firma"]) - fecha(c["inicio"])).days > 30]
        por_anio[anio] = {"n": len(g), "inicio_antes_firma": len(antes), "mas_de_30_dias": len(mucho),
                          "valor_mas_de_30_dias": sum(c["valor"] for c in mucho)}
    def invalida(c):
        a, b = fecha(c["inicio"]), fecha(c["fin"])
        return not a or not b or b < a or (b - a).days > 1460
    dup = agrupar(cs, lambda c: (clave(c), c["valor"], c["firma"], normalizar(c["objeto"])))
    duplicados = [g for g in dup.values() if len(g) > 1]
    mayores_atraso = sorted((c for c in cs if fecha(c["inicio"]) and fecha(c["inicio"]) < fecha(c["firma"])),
                            key=lambda c: -(fecha(c["firma"]) - fecha(c["inicio"])).days)[:15]
    return {
        "total": len(cs), "por_anio": por_anio,
        "fechas_invalidas": sum(1 for c in cs if invalida(c)),
        "valor_cero": sum(1 for c in cs if c["valor"] <= 0),
        "objeto_no_definido": sum(1 for c in cs if normalizar(c["objeto"]) in ("", "no definido")),
        "sin_documento": sum(1 for c in cs if not doc_valido(c["documento"])),
        "grupos_duplicados": len(duplicados), "contratos_en_duplicados": sum(len(g) for g in duplicados),
        "valor_duplicado": sum(sum(c["valor"] for c in g[1:]) for g in duplicados),
        "por_entidad": {e: {"n": len(g), "sin_documento": sum(1 for c in g if not doc_valido(c["documento"])),
                            "objeto_no_definido": sum(1 for c in g if normalizar(c["objeto"]) in ("", "no definido"))}
                        for e, g in agrupar(cs, lambda c: c["entidad"]).items()},
        "mayores_atrasos": [{"id": c["id"], "entidad": c["entidad"], "firma": c["firma"], "inicio": c["inicio"],
                             "dias": (fecha(c["firma"]) - fecha(c["inicio"])).days, "valor": c["valor"],
                             "proveedor": c["proveedor"]} for c in mayores_atraso],
    }


def informe(r, entidad):
    t = r["total"]
    md = [f"# Calidad de los datos · {entidad or 'todas las entidades'}\n",
          tabla(["Problema", "Contratos", "%"], [
              ["Fechas inválidas (fin < inicio o > 4 años)", entero(r["fechas_invalidas"]), pct(r["fechas_invalidas"] / t, 2)],
              ["Valor cero o negativo", entero(r["valor_cero"]), pct(r["valor_cero"] / t, 2)],
              ["Objeto «No definido»", entero(r["objeto_no_definido"]), pct(r["objeto_no_definido"] / t, 2)],
              ["Contratista sin documento válido", entero(r["sin_documento"]), pct(r["sin_documento"] / t, 2)],
              ["En grupos de posibles duplicados", entero(r["contratos_en_duplicados"]), pct(r["contratos_en_duplicados"] / t, 2)],
          ]),
          f"\nLos posibles duplicados suman {mmm(r['valor_duplicado'])} contando solo las copias.\n",
          "\n## Ejecución que empieza antes de la firma\n",
          tabla(["Año", "Contratos", "Inicio antes de la firma", "Más de 30 días antes", "Valor (> 30 días)"],
                [[a, entero(x["n"]), entero(x["inicio_antes_firma"]), entero(x["mas_de_30_dias"]),
                  mmm(x["valor_mas_de_30_dias"])] for a, x in r["por_anio"].items()]),
          "\n### Mayores diferencias\n",
          tabla(["Entidad", "Firma", "Inicio", "Días", "Valor", "Contratista"],
                [[c["entidad"][:30], c["firma"], c["inicio"], entero(c["dias"]), millones(c["valor"]), c["proveedor"][:35]]
                 for c in r["mayores_atrasos"]])]
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.set_defaults(entidad="")
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs)
    print(guardar("calidad", r, informe(r, a.entidad), a.salida))
