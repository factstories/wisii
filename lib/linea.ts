/**
 * Lógica del timeline: agrupar contratos por proveedor, repartirlos en
 * carriles para que los solapados queden uno sobre otro, y calcular los
 * tramos de tiempo en que hubo dos o más contratos activos a la vez.
 */
import type { Contrato } from "./types";
import { normalizar } from "./data";

export interface Proveedor {
  /** documento si es utilizable; si no, el nombre normalizado con prefijo "n:" */
  clave: string;
  nombre: string;
  documento: string;
  contratos: Contrato[];
  valor: number;
}

const docValido = (d: string) => /\d{5,}/.test(d) && !/no definido/i.test(d);

/**
 * La misma persona puede figurar con el nombre escrito de varias formas, pero
 * con un solo documento: se agrupa por documento cuando existe y se muestra
 * la variante de nombre más frecuente.
 */
export function claveProveedor(c: Contrato): string {
  return docValido(c.documento) ? c.documento.trim() : `n:${normalizar(c.proveedor).trim()}`;
}

export function indexarProveedores(contratos: Contrato[]): Map<string, Proveedor> {
  const grupos = new Map<string, Contrato[]>();
  for (const c of contratos) {
    const k = claveProveedor(c);
    const g = grupos.get(k);
    if (g) g.push(c); else grupos.set(k, [c]);
  }
  const out = new Map<string, Proveedor>();
  for (const [clave, cs] of grupos) {
    const nombres = new Map<string, number>();
    for (const c of cs) nombres.set(c.proveedor, (nombres.get(c.proveedor) ?? 0) + 1);
    const nombre = [...nombres.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.set(clave, {
      clave, nombre,
      documento: docValido(cs[0].documento) ? cs[0].documento.trim() : "",
      contratos: cs,
      valor: cs.reduce((s, c) => s + c.valor, 0),
    });
  }
  return out;
}

/** Búsqueda por nombre (todas las palabras) o por documento. */
export function buscarProveedores(
  indice: Map<string, Proveedor>, q: string, max = 12,
): Proveedor[] {
  const t = normalizar(q).split(/\s+/).filter(Boolean);
  if (!t.length) return [];
  const soloDigitos = /^\d+$/.test(q.trim());
  const out: Proveedor[] = [];
  for (const p of indice.values()) {
    if (soloDigitos) {
      if (p.documento.startsWith(q.trim())) out.push(p);
    } else {
      const n = normalizar(p.nombre);
      if (t.every((x) => n.includes(x))) out.push(p);
    }
  }
  return out.sort((a, b) => b.contratos.length - a.contratos.length).slice(0, max);
}

/** Días desde la época Unix, en UTC, para comparar y escalar fechas. */
export function dia(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface Barra {
  c: Contrato;
  desde: number;
  hasta: number;
  carril: number;
  /** se cruza en el tiempo con al menos otro contrato del mismo proveedor */
  solapado: boolean;
  /** la fecha de fin falta o es anterior al inicio: se dibuja como un punto */
  finDudoso: boolean;
}

/**
 * Asigna cada contrato al primer carril libre, en orden de inicio. Dos
 * contratos que comparten aunque sea un día quedan en carriles distintos:
 * ese día ambos estaban vigentes.
 */
export function repartirEnCarriles(cs: Contrato[]): { barras: Barra[]; carriles: number } {
  const base = cs.map((c) => {
    const desde = dia(c.inicio || c.firma);
    const fin = c.fin ? dia(c.fin) : NaN;
    const finDudoso = !Number.isFinite(fin) || fin < desde;
    return { c, desde, hasta: finDudoso ? desde : fin, finDudoso };
  }).sort((a, b) => a.desde - b.desde || b.hasta - a.hasta);

  const ultimoFin: number[] = [];
  const barras: Barra[] = base.map((b) => {
    let carril = ultimoFin.findIndex((f) => f < b.desde);
    if (carril === -1) { carril = ultimoFin.length; ultimoFin.push(b.hasta); }
    else ultimoFin[carril] = b.hasta;
    return { ...b, carril, solapado: false };
  });

  // Ordenadas por inicio, i y j (j > i) se solapan sii j empieza antes de
  // que termine i. El bucle interno se corta en cuanto deja de cumplirse.
  for (let i = 0; i < barras.length; i++) {
    for (let j = i + 1; j < barras.length && barras[j].desde <= barras[i].hasta; j++) {
      barras[i].solapado = true;
      barras[j].solapado = true;
    }
  }
  return { barras, carriles: ultimoFin.length };
}

export interface Tramo { desde: number; hasta: number; simultaneos: number }

/** Tramos con dos o más contratos vigentes a la vez. */
export function tramosSolapados(barras: Barra[]): Tramo[] {
  const ev: [number, number][] = [];
  for (const b of barras) { ev.push([b.desde, +1]); ev.push([b.hasta + 1, -1]); }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Tramo[] = [];
  let activos = 0, abierto: Tramo | null = null;
  for (let i = 0; i < ev.length; i++) {
    const [t, d] = ev[i];
    activos += d;
    // procesar todos los eventos del mismo día antes de decidir
    if (i + 1 < ev.length && ev[i + 1][0] === t) continue;
    if (activos >= 2) {
      if (!abierto) abierto = { desde: t, hasta: t, simultaneos: activos };
      abierto.simultaneos = Math.max(abierto.simultaneos, activos);
    } else if (abierto) {
      abierto.hasta = t - 1;
      out.push(abierto);
      abierto = null;
    }
  }
  return out;
}

/** Color de cada proveedor del timeline, por orden de elección. */
export const SERIES = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)"];
