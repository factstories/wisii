import { MarcaWisii } from "@/components/marca/Logos";
import Link from "next/link";
import ListaBlog from "@/components/hallazgos/ListaBlog";
import { MARCA } from "@/lib/legal";
import TemaToggle from "@/components/TemaToggle";

export const metadata = {
  title: "Hallazgos",
  description: "Eventos de la contratación pública del Archipiélago que vale la pena contar.",
};

export default function Hallazgos() {
  return (
    <main>
      <header className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-70" style={{ color: "var(--muted)" }}>
            ← <MarcaWisii tamano={18} /> {MARCA}
          </Link>
          <TemaToggle />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--cta)" }}>
          Hallazgos
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Lo que vemos en la contratación del Archipiélago
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Notas sobre eventos que aparecen al seguir los datos semana a semana: cambios en lo
          publicado, patrones que llaman la atención y hechos que merecen contexto. Cada nota
          explica cómo se llegó a cada cifra y qué queda sin responder.
        </p>

        <div className="mt-10"><ListaBlog /></div>
      </section>
    </main>
  );
}
