"""Corre todos los estudios y deja un índice en la carpeta de salida.

Uso:
  python3 scripts/estudios/estudiar.py [--contratos ruta] [--salida carpeta]

Cada estudio usa su ámbito por defecto: los que miran cómo contrata una
entidad usan la Gobernación; los que buscan patrones entre entidades
(simultaneidad, umbrales, calidad, fraccionamiento) miran todas.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import CONTRATOS, GOBERNACION, SALIDA, cargar, filtrar_entidad
import modalidades, calendario, fraccionamiento, simultaneidad, umbrales, continuidad, calidad
from comun import guardar

ESTUDIOS = [
    ("modalidades", modalidades, GOBERNACION, "Cómo se contrata: directa frente a modalidades competitivas"),
    ("calendario", calendario, GOBERNACION, "Cuándo se contrata: cierres de año, Ley de Garantías, fin de contratos"),
    ("fraccionamiento", fraccionamiento, "", "Contratos parecidos, mismo contratista, firmas cercanas"),
    ("simultaneidad", simultaneidad, "", "Contratistas con muchos contratos de servicios a la vez"),
    ("umbrales", umbrales, "", "Valores amontonados justo debajo de los topes legales"),
    ("continuidad", continuidad, GOBERNACION, "Concentración y contratistas que pasan de un gobierno a otro"),
    ("calidad", calidad, "", "Problemas en los datos publicados"),
]

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--contratos", default=CONTRATOS)
    p.add_argument("--salida", default=SALIDA)
    a = p.parse_args()
    todos = cargar(a.contratos)
    indice = [f"# Estudios de datos\n\nGenerado el {time.strftime('%Y-%m-%d')} con {len(todos):,} contratos.\n".replace(",", "."),
              "| Estudio | Ámbito | Qué mide |", "|---|---|---|"]
    for nombre, mod, entidad, que in ESTUDIOS:
        cs = filtrar_entidad(todos, entidad)
        r = mod.estudiar(cs)
        guardar(nombre, r, mod.informe(r, entidad), a.salida)
        indice.append(f"| [{nombre}]({nombre}.md) | {entidad or 'todas'} | {que} |")
        print("✓", nombre)
    with open(os.path.join(a.salida, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(indice) + "\n")
    print("índice:", os.path.join(a.salida, "README.md"))
