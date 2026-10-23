"""Frena la publicación si los datos nuevos se desplomaron respecto de los publicados.

Corre en el workflow después de build_data.py y antes de commitear. Compara
public/data/meta.json recién generado con el de la última versión publicada
(el del commit actual) y sale con error si:
  - una fuente (SECOP I o SECOP II) quedó en cero,
  - una fuente cayó más de UMBRAL_FUENTE,
  - el total cayó más de UMBRAL_TOTAL.

Si sale con error, el workflow no commitea y el sitio sigue con los datos de
la semana anterior. Un fallo es una señal para mirar, no un dato.

Los umbrales dejan pasar los cambios reales de la fuente: el 12 de octubre de
2026 SECOP II perdió 3.019 contratos de una semana a otra (−7,5%, −4,2% del
total) porque datos.gov.co retiró registros de la Gobernación.

Uso:
  python3 scripts/verificar_datos.py                 # contra git HEAD
  python3 scripts/verificar_datos.py --anterior X.json
"""
import argparse, json, os, subprocess, sys

UMBRAL_FUENTE = 0.15
UMBRAL_TOTAL = 0.10
NUEVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "meta.json")


def publicado(ruta):
    if ruta:
        return json.load(open(ruta, encoding="utf-8"))
    r = subprocess.run(["git", "show", "HEAD:public/data/meta.json"],
                       capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anterior", help="meta.json de referencia (por defecto, el de git HEAD)")
    a = ap.parse_args()

    nuevo = json.load(open(NUEVO, encoding="utf-8"))
    viejo = publicado(a.anterior)
    if viejo is None:
        print("Sin versión publicada para comparar: se acepta.")
        return

    problemas = []
    fuentes = sorted(set(viejo.get("por_fuente", {})) | set(nuevo.get("por_fuente", {})))
    print(f"{'fuente':<10} {'publicado':>10} {'nuevo':>10} {'cambio':>8}")
    for f in fuentes + ["TOTAL"]:
        v = viejo["contratos"] if f == "TOTAL" else viejo.get("por_fuente", {}).get(f, 0)
        n = nuevo["contratos"] if f == "TOTAL" else nuevo.get("por_fuente", {}).get(f, 0)
        cambio = (n - v) / v if v else 0
        print(f"{f:<10} {v:>10,} {n:>10,} {cambio:>+8.1%}".replace(",", "."))
        if f == "TOTAL":
            if cambio < -UMBRAL_TOTAL:
                problemas.append(f"el total cayó {-cambio:.1%} (máximo admitido {UMBRAL_TOTAL:.0%})")
        elif v and n == 0:
            problemas.append(f"{f} quedó en cero: su descarga falló o no devolvió filas")
        elif cambio < -UMBRAL_FUENTE:
            problemas.append(f"{f} cayó {-cambio:.1%} (máximo admitido {UMBRAL_FUENTE:.0%})")

    if problemas:
        print("\nNO SE PUBLICA:")
        for p in problemas:
            print(f"  - {p}")
        print("El sitio conserva los datos publicados. Revisar la corrida antes de forzar nada.")
        sys.exit(1)
    print("\nOK: los datos nuevos pueden publicarse.")


if __name__ == "__main__":
    main()
