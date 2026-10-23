"use client";

import { useEffect, useMemo, useState } from "react";
import { cop, copCorto, fecha, numero, secopUrl } from "@/lib/format";
import { normalizar } from "@/lib/data";

interface Retirado {
  id: string; entidad: string; proveedor: string; documento: string; valor: number;
  firma: string; fin: string; estado: string; tipo: string; modalidad: string;
  objeto: string; enlace: string;
}

const POR_PAGINA = 20;

/** Lista completa de los contratos retirados, tal como estaban publicados. */
export default function TablaRetirados({ archivo }: { archivo: string }) {
  const [filas, setFilas] = useState<Retirado[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [entidad, setEntidad] = useState("");
  const [orden, setOrden] = useState<"valor" | "firma">("valor");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(archivo).then((r) => r.json()).then((d) => setFilas(d.contratos)).catch(() => setError(true));
  }, [archivo]);

  const entidades = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of filas ?? []) m.set(f.entidad, (m.get(f.entidad) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filas]);

  const visibles = useMemo(() => {
    const t = normalizar(q).split(/\s+/).filter(Boolean);
    const out = (filas ?? []).filter((f) => {
      if (entidad && f.entidad !== entidad) return false;
      const texto = normalizar(`${f.proveedor} ${f.objeto} ${f.id} ${f.documento}`);
      return t.every((x) => texto.includes(x));
    });
    return out.sort(orden === "valor" ? (a, b) => b.valor - a.valor : (a, b) => b.firma.localeCompare(a.firma));
  }, [filas, q, entidad, orden]);

  useEffect(() => setPagina(1), [q, entidad, orden]);

  if (error) return <p className="text-sm" style={{ color: "var(--coral)" }}>No se pudo cargar la lista.</p>;
  if (!filas) return <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando la lista…</p>;

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const total = visibles.reduce((s, f) => s + f.valor, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Buscar por contratista, objeto o número de contrato…"
               className="rounded-lg border px-3 py-2 text-sm"
               style={{ borderColor: "var(--line)", background: "var(--raised)", color: "var(--ink)" }} />
        <select value={entidad} onChange={(e) => setEntidad(e.target.value)}
                className="rounded-lg border px-2 py-2 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
          <option value="">Todas las entidades</option>
          {entidades.map(([e, n]) => <option key={e} value={e}>{e} ({numero(n)})</option>)}
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
          const url = secopUrl("SECOP II", f.enlace);
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
                <span>{f.estado} al 5 oct 2026</span><span>·</span>
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
