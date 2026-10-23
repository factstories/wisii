"use client";

import { useEffect, useMemo, useState } from "react";
import { cop, copCorto, fecha, numero, secopUrl } from "@/lib/format";
import { normalizar } from "@/lib/data";

interface Retirado {
  id: string; entidad: string; fuente?: string; inicio?: string; [campo: string]: unknown; proveedor: string; documento: string; valor: number;
  firma: string; fin: string; estado: string; tipo: string; modalidad: string;
  objeto: string; enlace: string;
}

const POR_PAGINA = 20;

/**
 * Lista de contratos de una nota, con búsqueda, un filtro y paginación. Nació
 * para los retirados del SECOP; `filtro` y `detalle` la adaptan a otras notas.
 */
export default function TablaRetirados({ archivo, etiqueta, clave = "contratos",
  filtro = { campo: "entidad", todos: "Todas las entidades" }, detalle = "estado" }: {
  archivo: string;
  /** texto del botón que despliega la lista, p. ej. «Buscar entre los 1.501 contratos» */
  etiqueta: string;
  /** lista dentro del JSON */
  clave?: string;
  /** campo por el que se filtra y texto de la opción "todos" */
  filtro?: { campo: string; todos: string; prefijo?: string };
  /** qué dato mostrar en cada fila: el estado al retirarse o la vigencia */
  detalle?: "estado" | "vigencia";
}) {
  // Plegada por defecto: la búsqueda y la lista ocupan mucho alto y casi nadie
  // la usa. Los datos se descargan recién al abrirla.
  const [abierta, setAbierta] = useState(false);
  const [filas, setFilas] = useState<Retirado[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [entidad, setEntidad] = useState("");
  const [orden, setOrden] = useState<"valor" | "firma">("valor");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (!abierta || filas) return;
    fetch(archivo).then((r) => r.json()).then((d) => setFilas(d[clave])).catch(() => setError(true));
  }, [abierta, filas, archivo, clave]);

  const entidades = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filas ?? []) m.set(String(f[filtro.campo]), (m.get(String(f[filtro.campo])) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas, filtro.campo]);

  const visibles = useMemo(() => {
    const t = normalizar(q).split(/\s+/).filter(Boolean);
    const out = (filas ?? []).filter((f) => {
      if (entidad && String(f[filtro.campo]) !== entidad) return false;
      const texto = normalizar(`${f.proveedor} ${f.objeto} ${f.id} ${f.documento}`);
      return t.every((x) => texto.includes(x));
    });
    return out.sort(orden === "valor" ? (a, b) => b.valor - a.valor : (a, b) => b.firma.localeCompare(a.firma));
  }, [filas, q, entidad, orden, filtro.campo]);

  useEffect(() => setPagina(1), [q, entidad, orden]);

  if (!abierta) {
    return (
      <button onClick={() => setAbierta(true)} aria-expanded={false}
              className="group inline-flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm transition hover:opacity-80"
              style={{ color: "var(--muted)" }}>
        <Lupa />
        <span className="underline decoration-dotted underline-offset-4 group-hover:decoration-solid">{etiqueta}</span>
      </button>
    );
  }
  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>No se pudo cargar la lista.</p>;
  if (!filas) return <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando la lista…</p>;

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const total = visibles.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="space-y-3">
      <button onClick={() => setAbierta(false)} aria-expanded
              className="inline-flex items-center gap-2 px-1 py-1 text-xs transition hover:opacity-80"
              style={{ color: "var(--muted)" }}>
        <Lupa /> Ocultar la búsqueda
      </button>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
               placeholder="Buscar por contratista, objeto o número de contrato…"
               className="rounded-lg border px-3 py-2 text-sm"
               style={{ borderColor: "var(--line)", background: "var(--raised)", color: "var(--ink)" }} />
        <select value={entidad} onChange={(e) => setEntidad(e.target.value)}
                className="rounded-lg border px-2 py-2 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
          <option value="">{filtro.todos}</option>
          {entidades.map(([e, n]) => <option key={e} value={e}>{filtro.prefijo ?? ""}{e} ({numero(n)})</option>)}
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value as "valor" | "firma")}
                className="rounded-lg border px-2 py-2 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
          <option value="valor">Mayor valor</option>
          <option value="firma">Más recientes</option>
        </select>
      </div>

      <p className="num text-xs" style={{ color: "var(--muted)" }}>
        {numero(visibles.length)} contratos · {copCorto(total)}
      </p>

      <ul className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        {pag.map((f) => {
          const url = secopUrl(f.fuente ?? "SECOP II", f.enlace);
          return (
            <li key={f.id} className="border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--line-soft)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium">{f.proveedor}</span>
                <span className="num text-sm font-semibold">{cop(f.valor)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: "var(--ink-soft)" }}>{f.objeto}</p>
              <div className="num mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]" style={{ color: "var(--muted)" }}>
                <span>{f.entidad}</span><span>·</span>
                <span>firmado {fecha(f.firma)}</span><span>·</span>
                {detalle === "estado"
                  ? <span>{f.estado} al 5 oct 2026</span>
                  : <span>vigente {fecha(f.inicio ?? f.firma)} → {fecha(f.fin)}</span>}
                <span>·</span>
                <span>{f.id}</span>
                {url && (<><span>·</span>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">ficha en el SECOP ↗</a></>)}
              </div>
            </li>
          );
        })}
      </ul>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1}
                  className="rounded-md border px-2.5 py-1 disabled:opacity-35"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>← Anterior</button>
          <span className="num" style={{ color: "var(--muted)" }}>{numero(pagina)} / {numero(paginas)}</span>
          <button onClick={() => setPagina((p) => Math.min(paginas, p + 1))} disabled={pagina === paginas}
                  className="rounded-md border px-2.5 py-1 disabled:opacity-35"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

function Lupa() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />
    </svg>
  );
}
