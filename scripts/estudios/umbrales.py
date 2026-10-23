"""Estudio 5 · ¿Se amontonan los valores justo debajo de los topes legales?

La modalidad de selección depende del valor del contrato frente a topes en
salarios mínimos (SMMLV). Si muchos contratos quedan justo por debajo de un
tope y pocos justo por encima, hay un «amontonamiento» que sugiere ajustar el
valor para evitar la modalidad más exigente.

Para cada tope T (ver TOPES_MENOR_CUANTIA en comun.py, y su 10%: la mínima
cuantía) compara cuántos contratos caen en [0,9·T, T) contra [T, 1,1·T). Sin
manipulación, las dos franjas deberían tener cantidades parecidas (o menos
debajo, porque la distribución de valores decrece). Un cociente alto es la
señal. Se calcula por entidad, porque el tope que aplica depende de su
presupuesto.

Uso:
  python3 scripts/estudios/umbrales.py [--entidad ""] [--minimo 30]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import *


def estudiar(cs, minimo=30):
    topes = sorted({t for t in TOPES_MENOR_CUANTIA} | {t / 10 for t in TOPES_MENOR_CUANTIA})
    filas = []
    for ent, g in agrupar(cs, lambda c: c["entidad"]).items():
        vals = [(c, en_smmlv(c)) for c in g if en_smmlv(c)]
        for t in topes:
            debajo = [c for c, x in vals if 0.9 * t <= x < t]
            encima = [c for c, x in vals if t <= x < 1.1 * t]
            if len(debajo) + len(encima) < minimo:
                continue
            filas.append({"entidad": ent, "tope_smmlv": t, "debajo": len(debajo), "encima": len(encima),
                          "cociente": len(debajo) / max(len(encima), 1),
                          "debajo_directa": sum(1 for c in debajo if familia_modalidad(c["modalidad"]) == "Contratación directa"),
                          "ejemplos": [{k: c[k] for k in ("id", "firma", "proveedor", "valor", "objeto")}
                                       for c in sorted(debajo, key=lambda c: -c["valor"])[:5]]})
    filas.sort(key=lambda f: -f["cociente"])
    return {"minimo": minimo, "filas": filas}


def informe(r, entidad):
    md = [f"# Valores junto a los topes legales · {entidad or 'todas las entidades'}\n",
          "Franja de 10% a cada lado del tope, en salarios mínimos del año de firma. "
          f"Solo combinaciones con al menos {r['minimo']} contratos en las dos franjas.\n"]
    md.append(tabla(["Entidad", "Tope (SMMLV)", "Justo debajo", "Justo encima", "Cociente", "Debajo y por contratación directa"],
                    [[f["entidad"][:40], f"{f['tope_smmlv']:g}", entero(f["debajo"]), entero(f["encima"]),
                      f"{f['cociente']:.1f}×", entero(f["debajo_directa"])] for f in r["filas"][:30]]))
    md.append("\nUn cociente cercano a 1 es lo esperable. Por encima de 3 merece revisar los contratos.")
    return "\n".join(md)


if __name__ == "__main__":
    p = argumentos(__doc__.splitlines()[0])
    p.set_defaults(entidad="")
    p.add_argument("--minimo", type=int, default=30)
    a = p.parse_args()
    cs = filtrar_entidad(cargar(a.contratos), a.entidad)
    r = estudiar(cs, a.minimo)
    print(guardar("umbrales", r, informe(r, a.entidad), a.salida))
