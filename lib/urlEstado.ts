/**
 * Estado del explorador serializado en la URL, para que una búsqueda con
 * filtros —o un contrato puntual— se pueda compartir tal cual.
 *
 * Las claves son cortas a propósito: el enlace se pega en WhatsApp y se lee.
 * Los valores vacíos no se escriben, así una búsqueda sin filtros deja la URL
 * limpia.
 */

export type Orden = "firma-desc" | "firma-asc" | "valor-desc" | "valor-asc";
export type Vista = "contratos" | "timeline" | "hallazgos" | "mapa" | "editor" | "asignador";

export interface Filtros {
  q: string;
  gobierno: string;
  entidad: string;
  estado: string;
  tipo: string;
  modalidad: string;
  desde: string;
  hasta: string;
  minValor: string;
  orden: Orden;
}

export const FILTROS_VACIOS: Filtros = {
  q: "", gobierno: "", entidad: "", estado: "", tipo: "", modalidad: "",
  desde: "", hasta: "", minValor: "", orden: "firma-desc",
};

/** nombre del campo -> parámetro en la URL */
const CLAVES: Record<keyof Filtros, string> = {
  q: "q", gobierno: "gob", entidad: "entidad", estado: "estado", tipo: "tipo",
  modalidad: "modalidad", desde: "desde", hasta: "hasta",
  minValor: "min", orden: "orden",
};

const VISTAS: Vista[] = ["contratos", "timeline", "hallazgos", "mapa", "editor", "asignador"];
const ORDENES: Orden[] = ["firma-desc", "firma-asc", "valor-desc", "valor-asc"];

export function leerFiltros(sp: URLSearchParams): Filtros {
  const f = { ...FILTROS_VACIOS };
  for (const [campo, clave] of Object.entries(CLAVES) as [keyof Filtros, string][]) {
    const v = sp.get(clave);
    if (v) (f as Record<string, string>)[campo] = v;
  }
  if (!ORDENES.includes(f.orden)) f.orden = FILTROS_VACIOS.orden;
  return f;
}

/** El listado es la vista por defecto: /contratos abre la tabla. */
export function leerVista(sp: URLSearchParams): Vista {
  // "blog" era el nombre anterior de la pestaña: los enlaces viejos siguen sirviendo
  const v = (sp.get("v") === "blog" ? "hallazgos" : sp.get("v")) as Vista | null;
  return v && VISTAS.includes(v) ? v : "contratos";
}

export const leerContrato = (sp: URLSearchParams) => sp.get("c") ?? null;

/** Máximo de proveedores comparables en un mismo timeline. */
export const MAX_PROVEEDORES = 3;

/**
 * Proveedores elegidos (listado y timeline), en orden (el orden fija el color). Cada uno va en
 * su propio parámetro `p` —documento, o "n:NOMBRE" si no tiene— en vez de
 * separados por coma, porque un nombre puede contener comas.
 */
export const leerProveedores = (sp: URLSearchParams) =>
  [...new Set(sp.getAll("p").filter(Boolean))].slice(0, MAX_PROVEEDORES);

/** Construye el query string; omite lo que esté en su valor por defecto. */
export function escribirUrl(
  vista: Vista, filtros: Filtros, contrato: string | null, proveedores: string[] = [],
): string {
  const sp = new URLSearchParams();
  if (vista !== "contratos") sp.set("v", vista);
  // los hallazgos no usan filtros: su enlace queda limpio
  if (vista === "hallazgos") return "?v=hallazgos";
  for (const [campo, clave] of Object.entries(CLAVES) as [keyof Filtros, string][]) {
    // la búsqueda es del listado; las demás vistas no la aplican, así que
    // tampoco se arrastra a su URL
    if (vista !== "contratos" && campo === "q") continue;
    const v = filtros[campo];
    if (v && v !== FILTROS_VACIOS[campo]) sp.set(clave, v);
  }
  // los proveedores elegidos son un "carrito" compartido por listado y timeline
  if (vista === "contratos" || vista === "timeline") for (const p of proveedores) sp.append("p", p);
  if (contrato) sp.set("c", contrato);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const hayFiltros = (f: Filtros) =>
  (Object.keys(FILTROS_VACIOS) as (keyof Filtros)[])
    .some((k) => f[k] && f[k] !== FILTROS_VACIOS[k]);
