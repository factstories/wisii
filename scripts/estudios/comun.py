"""Utilidades compartidas por los estudios de datos.

Todo estudio trabaja sobre la lista de contratos decodificada que devuelve
`cargar()`, con los mismos campos que usa el sitio (ver lib/types.ts). Las
reglas de agrupación replican las del sitio para que las cifras coincidan con
lo que cualquiera puede comprobar en el explorador.
"""
import json, os, re, unicodedata
from collections import defaultdict
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTRATOS = os.path.join(RAIZ, "public", "data", "contratos.json")
SALIDA = os.path.join(RAIZ, "data", "estudios")

GOBERNACION = "Gobernación del Archipiélago"

# ---------------------------------------------------------------- lectura

def cargar(ruta=CONTRATOS):
    """Payload codificado del sitio, lista JSON o {"contratos": [...]}."""
    d = json.load(open(ruta, encoding="utf-8"))
    if isinstance(d, list):
        return d
    if isinstance(d.get("contratos"), list):
        return d["contratos"]
    campos, dic = d["campos"], d["dic"]
    pref, pref_e = d.get("pref", {}), d.get("prefEnlace", {})
    out = []
    for f in d["filas"]:
        r = {}
        for i, c in enumerate(campos):
            v = f[i]
            if c in dic and isinstance(v, int) and c not in ("valor", "pagado"):
                v = dic[c][v] if v >= 0 else None
            r[c] = v
        r["id"] = pref.get(r.get("fuente"), "") + r["id"]
        if r.get("enlace"):
            r["enlace"] = pref_e.get(r.get("fuente"), "") + r["enlace"]
        out.append(r)
    return out


def normalizar(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip()


def doc_valido(d):
    """Misma regla que lib/linea.ts: al menos 5 dígitos y no «No Definido»."""
    return bool(re.search(r"\d{5,}", d or "")) and "no definido" not in (d or "").lower()


def clave(c):
    """Clave de contratista: documento válido, o nombre normalizado."""
    return c["documento"].strip() if doc_valido(c.get("documento")) else "n:" + normalizar(c["proveedor"])


def fecha(s):
    try:
        return date.fromisoformat((s or "")[:10])
    except ValueError:
        return None

# ---------------------------------------------------------------- familias
# SECOP I y II nombran distinto las mismas cosas: se agrupan en familias.

def familia_modalidad(m):
    m = normalizar(m)
    if "directa" in m:
        return "Contratación directa"
    if "minima" in m:
        return "Mínima cuantía"
    if "abreviada" in m or "subasta" in m:
        return "Selección abreviada"
    if "licitacion" in m:
        return "Licitación pública"
    if "concurso" in m:
        return "Concurso de méritos"
    if "especial" in m:
        return "Régimen especial"
    return "Otras"


def familia_tipo(t):
    t = normalizar(t)
    if "prestacion de servicios" in t:
        return "Prestación de servicios"
    if t.startswith("suministro"):
        return "Suministro"
    if t == "obra":
        return "Obra"
    if "consultoria" in t or "interventoria" in t:
        return "Consultoría e interventoría"
    if "compraventa" in t or "venta" in t:
        return "Compraventa"
    if "arrendamiento" in t:
        return "Arrendamiento"
    return "Otros"


COMPETITIVAS = {"Licitación pública", "Selección abreviada", "Concurso de méritos", "Mínima cuantía"}

# ---------------------------------------------------------------- calendario
# Períodos de gobierno departamental (iguales a lib/gobiernos.ts).
PERIODOS = [
    ("2012-2015", "2012-01-01", "2015-12-31"),
    ("2016-2019", "2016-01-01", "2019-12-31"),
    ("2020-2023", "2020-01-01", "2023-12-31"),
    ("2024-2027", "2024-01-01", "2027-12-31"),
]


def periodo(f):
    for pid, a, b in PERIODOS:
        if a <= f <= b:
            return pid
    return None


# Ley 996 de 2005 (Ley de Garantías). Art. 33: desde cuatro meses antes de la
# elección presidencial y hasta la segunda vuelta, ninguna entidad puede
# contratar de forma directa (con excepciones: defensa, salud, emergencias…).
# Art. 38 parágrafo: en los cuatro meses previos a elecciones territoriales,
# gobernadores y alcaldes no pueden celebrar convenios interadministrativos.
GARANTIAS_PRESIDENCIALES = [
    ("2018", "2018-01-27", "2018-06-17"),
    ("2022", "2022-01-29", "2022-06-19"),
    ("2026", "2026-01-31", "2026-06-21"),
]
GARANTIAS_TERRITORIALES = [
    ("2015", "2015-06-25", "2015-10-25"),
    ("2019", "2019-06-27", "2019-10-27"),
    ("2023", "2023-06-29", "2023-10-29"),
]

# Salario mínimo mensual legal vigente por año (decretos anuales del Gobierno).
# Los topes de contratación se expresan en SMMLV. Agregar el año nuevo cada enero.
SMMLV = {
    2014: 616_000, 2015: 644_350, 2016: 689_455, 2017: 737_717, 2018: 781_242,
    2019: 828_116, 2020: 877_803, 2021: 908_526, 2022: 1_000_000, 2023: 1_160_000,
    2024: 1_300_000, 2025: 1_423_500, 2026: 1_750_905,
}


def en_smmlv(c):
    """Valor del contrato expresado en salarios mínimos del año de firma."""
    m = SMMLV.get(int(c["firma"][:4]))
    return c["valor"] / m if m else None


# Topes de menor cuantía según el presupuesto anual de la entidad (Ley 1150 de
# 2007, art. 2 num. 2 lit. b), en SMMLV. La mínima cuantía es el 10% del tope.
TOPES_MENOR_CUANTIA = [28, 280, 450, 650, 1000]

# ---------------------------------------------------------------- salida

def millones(v):
    return f"${v / 1e6:,.1f} M".replace(",", "X").replace(".", ",").replace("X", ".")


def mmm(v):
    return f"${v / 1e9:,.1f} MMM".replace(",", "X").replace(".", ",").replace("X", ".")


def pct(x, d=1):
    return f"{x * 100:.{d}f}%".replace(".", ",")


def entero(n):
    return f"{n:,}".replace(",", ".")


def guardar(nombre, datos, markdown, salida=SALIDA):
    """Escribe <nombre>.json y <nombre>.md en la carpeta de salida."""
    os.makedirs(salida, exist_ok=True)
    with open(os.path.join(salida, nombre + ".json"), "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=1, default=str)
    with open(os.path.join(salida, nombre + ".md"), "w", encoding="utf-8") as f:
        f.write(markdown.rstrip() + "\n")
    return os.path.join(salida, nombre + ".md")


def tabla(encabezados, filas):
    """Tabla Markdown simple."""
    out = ["| " + " | ".join(encabezados) + " |", "|" + "---|" * len(encabezados)]
    out += ["| " + " | ".join(str(x) for x in f) + " |" for f in filas]
    return "\n".join(out)


def argumentos(descripcion):
    """Argumentos comunes: --contratos, --entidad, --salida."""
    import argparse
    p = argparse.ArgumentParser(description=descripcion)
    p.add_argument("--contratos", default=CONTRATOS, help="payload del sitio o lista JSON")
    p.add_argument("--entidad", default=GOBERNACION, help='entidad a estudiar ("" = todas)')
    p.add_argument("--salida", default=SALIDA, help="carpeta para los resultados")
    return p


def filtrar_entidad(cs, entidad):
    return [c for c in cs if not entidad or c["entidad"] == entidad]


def agrupar(cs, f):
    g = defaultdict(list)
    for c in cs:
        g[f(c)].append(c)
    return g
