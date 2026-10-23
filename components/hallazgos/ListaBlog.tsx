"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fecha, numero } from "@/lib/format";
import { normalizar } from "@/lib/data";
import { HALLAZGOS } from "@/lib/hallazgos";
import Movimiento from "./Movimiento";

/** Las notas como tarjetas, de la más reciente a la más antigua, con búsqueda por título o contenido. */
export default function ListaBlog() {
  const [q, setQ] = useState("");

  const notas = useMemo(() => {
    const t = normalizar(q).split(/\s+/).filter(Boolean);
    if (!t.length) return HALLAZGOS;
    return HALLAZGOS.filter((h) => {
      const texto = normalizar(`${h.titulo} ${h.resumen} ${h.etiquetas.join(" ")} ${h.texto}`);
      return t.every((x) => texto.includes(x));
    });
  }, [q]);

  return (
    <div className="space-y-4">
      <Movimiento />
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Buscar en los títulos y el contenido de las notas…"
               className="w-full rounded-lg border px-3 py-2.5 pr-20 text-sm outline-none"
               style={{ borderColor: "var(--line)", background: "var(--raised)", color: "var(--ink)" }} />
        {q && (
          <button onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs"
                  style={{ color: "var(--muted)" }}>limpiar</button>
        )}
      </div>

      {q && (
        <p className="num text-xs" style={{ color: "var(--muted)" }}>
          {notas.length === 0 ? "Ninguna nota coincide." : `${numero(notas.length)} de ${numero(HALLAZGOS.length)} notas`}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {notas.map((h, i) => (
          <Link key={h.slug} href={`/hallazgos/${h.slug}`} data-i={i}
                className="rv tarjeta group flex flex-col rounded-xl border p-5"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="num text-xs" style={{ color: "var(--muted)" }}>{fecha(h.fecha)}</div>
            <h2 className="mt-2 text-lg font-semibold leading-snug">{h.titulo}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{h.resumen}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {h.etiquetas.map((e) => (
                  <span key={e} className="rounded-full border px-2 py-0.5 text-[10px]"
                        style={{ borderColor: "var(--line)", color: "var(--muted)" }}>{e}</span>
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--cta)" }}>Leer →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
