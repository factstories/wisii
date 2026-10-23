"""Análisis de un período de contratación, para alimentar las notas de Hallazgos.

Calcula, para una entidad y un rango de fechas de firma:
  - totales, reparto por tipo de contrato (número y valor),
  - principales contratistas por número y por valor,
  - contratos sin documento del contratista,
  - las obras del período,
y, si se pasa un conjunto de contratos «marcados» (por ejemplo, los que se
retiraron del SECOP), cuántos de cada grupo pertenecen a ese conjunto.

Los contratistas se agrupan con la misma regla que el sitio (lib/linea.ts):
por documento si es válido; si no, por nombre normalizado. Un documento como
"No Definido" agruparía decenas de consorcios distintos como si fueran uno.

Uso:
  python3 scripts/analizar_periodo.py --contratos public/data/contratos.json \\
      --entidad "Gobernación del Archipiélago" --desde 2024-01-01 \\
      [--marcados ids.json] [--salida resultado.json]

--contratos acepta el payload codificado del sitio o una lista JSON de
contratos ya decodificados (como la que guarda una nota en public/data/hallazgos).
"""
import argparse, json, re, unicodedata
from collections import Counter, defaultdict


def normalizar(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if unicodedata.category(c) != "Mn")).strip()


def doc_valido(d):
    return bool(re.search(r"\d{5,}", d or "")) and "no definido" not in (d or "").lower()


def clave(c):
    return c["documento"].strip() if doc_valido(c.get("documento")) else "n:" + normalizar(c["proveedor"])


def cargar(ruta):
    d = json.load(open(ruta, encoding="utf-8"))
    if isinstance(d, list):
        return d
    if "contratos" in d and isinstance(d["contratos"], list):
        return d["contratos"]
    campos, dic = d["campos"], d["dic"]
    pref, pref_e = d.get("pref", {}), d.get("prefEnlace", {})
    out = []
    for f in d["filas"]:
        r = {}
        for i, c in enumerate(campos):
            v = f[i]
            r[c] = dic[c][v] if c in dic and isinstance(v, int) and c not in ("valor", "pagado") else v
            if c == "barrio" and isinstance(v, int) and v < 0:
                r[c] = None
        fu = r.get("fuente", "SECOP II")
        r["id"] = pref.get(fu, "") + r["id"]
        if r.get("enlace"):
            r["enlace"] = pref_e.get(fu, "") + r["enlace"]
        out.append(r)
    return out


def contratista(cs, marcados):
    nombres = Counter(c["proveedor"] for c in cs)
    tipos = Counter(c["tipo"] for c in cs)
    return {
        "nombre": nombres.most_common(1)[0][0],
        "documento": cs[0]["documento"] if doc_valido(cs[0].get("documento")) else "",
        "n": len(cs), "valor": sum(c["valor"] for c in cs),
        "tipo_principal": tipos.most_common(1)[0][0],
        "marcados": sum(1 for c in cs if c["id"] in marcados),
    }


def analizar(contratos, entidad, desde, hasta, marcados, top=10):
    per = [c for c in contratos
           if (not entidad or c["entidad"] == entidad)
           and c["firma"] >= desde and (not hasta or c["firma"] <= hasta)]
    tot_v = sum(c["valor"] for c in per)

    tipos = defaultdict(lambda: {"n": 0, "valor": 0, "marcados_n": 0, "marcados_valor": 0})
    for c in per:
        t = tipos[c["tipo"]]
        t["n"] += 1; t["valor"] += c["valor"]
        if c["id"] in marcados:
            t["marcados_n"] += 1; t["marcados_valor"] += c["valor"]

    grupos = defaultdict(list)
    for c in per:
        grupos[clave(c)].append(c)
    resumen = [contratista(cs, marcados) for cs in grupos.values()]
    por_valor = sorted(resumen, key=lambda r: -r["valor"])

    sin_doc = [c for c in per if not doc_valido(c.get("documento"))]
    obras = sorted((c for c in per if c["tipo"] == "Obra"), key=lambda c: -c["valor"])

    return {
        "entidad": entidad, "desde": desde, "hasta": hasta or max(c["firma"] for c in per),
        "contratos": len(per), "valor": tot_v, "contratistas": len(grupos),
        "marcados": {"n": sum(1 for c in per if c["id"] in marcados),
                     "valor": sum(c["valor"] for c in per if c["id"] in marcados)},
        "por_tipo": sorted(({"tipo": k, **v} for k, v in tipos.items()), key=lambda r: -r["valor"]),
        "top_por_numero": sorted(resumen, key=lambda r: (-r["n"], -r["valor"]))[:top],
        "top_por_valor": por_valor[:top],
        "concentracion_top": sum(r["valor"] for r in por_valor[:top]) / tot_v if tot_v else 0,
        "sin_documento": {"n": len(sin_doc), "valor": sum(c["valor"] for c in sin_doc)},
        "obras": [{k: c.get(k) for k in ("id", "proveedor", "valor", "firma", "estado", "objeto", "enlace")}
                  for c in obras],
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--contratos", required=True)
    ap.add_argument("--entidad", default="")
    ap.add_argument("--desde", default="0000-01-01")
    ap.add_argument("--hasta", default="")
    ap.add_argument("--marcados", help="JSON con una lista de ids, o de contratos con campo id")
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--salida")
    a = ap.parse_args()

    marcados = set()
    if a.marcados:
        m = json.load(open(a.marcados, encoding="utf-8"))
        m = m.get("contratos", m) if isinstance(m, dict) else m
        marcados = {x["id"] if isinstance(x, dict) else x for x in m}

    r = analizar(cargar(a.contratos), a.entidad, a.desde, a.hasta, marcados, a.top)
    if a.salida:
        json.dump(r, open(a.salida, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    mm = lambda v: f"${v/1e9:,.1f} MMM".replace(",", "X").replace(".", ",").replace("X", ".")
    print(f"{r['entidad'] or 'todas las entidades'} · {r['desde']} → {r['hasta']}")
    print(f"{r['contratos']:,} contratos · {mm(r['valor'])} · {r['contratistas']:,} contratistas".replace(",", "."))
    print("\npor tipo (valor):")
    for t in r["por_tipo"][:8]:
        print(f"  {t['n']:>6}  {mm(t['valor']):>13}  {t['valor']/r['valor']:>6.1%}  marcados {t['marcados_n']:>5}  {t['tipo']}")
    print(f"\ntop {a.top} por valor = {r['concentracion_top']:.1%} del total")
    for x in r["top_por_valor"]:
        print(f"  {x['n']:>4}  {mm(x['valor']):>13}  marcados {x['marcados']:>3}  {x['nombre'][:50]}")
    print(f"\nsin documento del contratista: {r['sin_documento']['n']} contratos, {mm(r['sin_documento']['valor'])}")


if __name__ == "__main__":
    main()
