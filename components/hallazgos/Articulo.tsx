import { MarcaWisii } from "@/components/marca/Logos";
import Link from "next/link";
import type { ReactNode } from "react";
import { fecha } from "@/lib/format";
import TemaToggle from "@/components/TemaToggle";
import IconoIslas from "@/components/IconoIslas";
import { MARCA } from "@/lib/legal";
import Movimiento from "./Movimiento";

/** Envoltorio común de las notas de Hallazgos: portada, ancho de lectura y movimiento. */
export default function Articulo({ titulo, fechaPub, resumen, etiquetas, cifras, children }: {
  titulo: string; fechaPub: string; resumen: string; etiquetas: string[];
  /** cifras destacadas de la portada */
  cifras?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main>
      <Movimiento />
      <header className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-3 text-xs font-medium" style={{ color: "var(--muted)" }}>
            <Link href="/" className="inline-flex items-center gap-1.5 hover:opacity-70">← <MarcaWisii tamano={16} /> {MARCA}</Link>
            <span aria-hidden>/</span>
            <Link href="/hallazgos" className="hover:opacity-70">Hallazgos</Link>
          </nav>
          <TemaToggle />
        </div>
      </header>

      {/* portada */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--line)" }}>
        <div aria-hidden className="deriva pointer-events-none absolute -right-16 -top-10 opacity-[0.06] sm:right-4"
             style={{ color: "var(--ink)" }}>
          <IconoIslas tamano={420} />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
          <p className="rv text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--cta)" }}>
            Hallazgo · {fecha(fechaPub)}
          </p>
          <h1 className="rv rv-h mt-4 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl" data-i="1">
            {titulo}
          </h1>
          <p className="rv mt-5 text-lg leading-relaxed" style={{ color: "var(--ink-soft)" }} data-i="2">{resumen}</p>
          <div className="rv mt-5 flex flex-wrap gap-1.5" data-i="3">
            {etiquetas.map((e) => (
              <span key={e} className="rounded-full border px-2.5 py-0.5 text-[11px]"
                    style={{ borderColor: "var(--line)", color: "var(--muted)" }}>{e}</span>
            ))}
          </div>
          {cifras && <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">{cifras}</div>}
        </div>
      </section>

      <article className="mx-auto max-w-3xl space-y-8 px-4 pb-20 pt-10 sm:px-6">{children}</article>
    </main>
  );
}

export function Seccion({ titulo, antetitulo, children }: { titulo: string; antetitulo?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 pt-6">
      {antetitulo && (
        <p className="rv text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--cta)" }}>{antetitulo}</p>
      )}
      <h2 className="rv rv-h text-2xl font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="rv text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{children}</p>;
}

/**
 * Cifra destacada. Llega con su valor final (se lee sin JavaScript) y, si se
 * pasa `conteo`, cuenta desde cero al entrar en pantalla.
 */
export function Cifra({ valor, etiqueta, conteo, i = 0 }: {
  valor: string; etiqueta: string; conteo?: { n: number; fmt: "entero" | "pct" | "mmm" }; i?: number;
}) {
  return (
    <div className="rv tarjeta rounded-xl border px-4 py-3.5" data-i={i}
         style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {/* nunca se parte: "$68,0 MMM" en dos líneas desalinea la fila */}
      <div className="num whitespace-nowrap font-semibold leading-none"
           style={{ fontSize: "clamp(1.25rem, 2.4vw, 1.875rem)" }}
           data-count={conteo?.n} data-fmt={conteo?.fmt}>{valor}</div>
      <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{etiqueta}</div>
    </div>
  );
}

/** Dato llamativo en grande, para cortar el texto. */
export function Destacado({ cifra, children }: { cifra: ReactNode; children: ReactNode }) {
  return (
    <div className="rv tarjeta grid gap-3 rounded-2xl border p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6 sm:p-6"
         style={{ borderColor: "var(--line)", background: "var(--raised)" }}>
      <div className="num text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{cifra}</div>
      <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{children}</p>
    </div>
  );
}
