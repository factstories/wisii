"use client";

import { numero } from "@/lib/format";
import { etiquetaPeriodo, periodoPorId, titular, type Periodo } from "@/lib/gobiernos";
import { FILTROS_VACIOS, hayFiltros, type Filtros } from "@/lib/urlEstado";
import type { Filtrado } from "@/lib/filtrado";
import type { Contrato } from "@/lib/types";
import { MAX_PROVEEDORES } from "@/lib/urlEstado";
import BuscadorProveedores from "./BuscadorProveedores";

function Selector({ etiqueta, valor, onChange, opciones, resaltado }: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  opciones: [string, number][]; resaltado?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {etiqueta}
      </span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}
        className="w-full truncate rounded-lg border px-2 py-1.5 text-xs"
        style={{ borderColor: resaltado && valor ? "var(--cta)" : "var(--line)",
                 background: "var(--surface)", color: "var(--ink)" }}>
        <option value="">Todos</option>
        {opciones.map(([v, n]) => (
          <option key={v} value={v}>{v} ({numero(n)})</option>
        ))}
      </select>
    </label>
  );
}

function Fecha({ etiqueta, valor, onChange }: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {etiqueta}
      </span>
      <input type="date" value={valor} onChange={(e) => onChange(e.target.value)}
             className="rounded-lg border px-2 py-1.5 text-xs"
             style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
    </label>
  );
}

export default function BarraFiltros({
  filtros, setFiltros, opciones, periodos, conteoPeriodos, busqueda, sugeribles, nombreProveedor,
  proveedores, onElegirProveedor, onQuitarProveedor, colores, nota,
}: {
  filtros: Filtros;
  setFiltros: (f: Filtros) => void;
  opciones: Filtrado["opciones"];
  periodos: Periodo[];
  conteoPeriodos: Map<string, number>;
  /**
   * Buscador arriba de los filtros: en el listado también busca texto; en el
   * timeline solo elige proveedores. El mapa no lleva.
   */
  busqueda: "texto" | "elegir" | null;
  /** color de cada proveedor elegido (el timeline los distingue por serie) */
  colores?: string[];
  /** aclaración que va debajo de los filtros */
  nota?: React.ReactNode;
  /** contratos que pasan los filtros salvo búsqueda y proveedor: alimentan las sugerencias */
  sugeribles: Contrato[];
  /** nombre a mostrar en los chips de proveedores elegidos */
  nombreProveedor: (clave: string) => string;
  /** carrito de proveedores, compartido con el timeline */
  proveedores: string[];
  onElegirProveedor: (clave: string) => void;
  onQuitarProveedor: (clave: string) => void;
}) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) =>
    setFiltros({ ...filtros, [k]: v });

  /** Elegir un gobierno fija las fechas a su período constitucional. */
  const elegirGobierno = (id: string) => {
    const p = id ? periodoPorId(id) : null;
    setFiltros({ ...filtros, gobierno: id, desde: p ? p.desde : "", hasta: p ? p.hasta : "" });
  };

  /** Editar una fecha a mano deja de corresponder a un período: se desmarca. */
  const setDesde = (v: string) => setFiltros({ ...filtros, gobierno: "", desde: v });
  const setHasta = (v: string) => setFiltros({ ...filtros, gobierno: "", hasta: v });

  const limpiar = () => setFiltros({ ...FILTROS_VACIOS, orden: filtros.orden });
  const activos = hayFiltros(filtros);

  return (
    <div className="rounded-xl border p-3"
         style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {busqueda && (
        <div className="mb-3 space-y-2">
          {busqueda === "texto" ? (
            <BuscadorProveedores
              sugeribles={sugeribles}
              texto={filtros.q}
              onTexto={(t) => set("q", t)}
              onElegir={(p) => { onElegirProveedor(p.clave); if (filtros.q) set("q", ""); }}
              placeholder="Buscar proveedor, o en objeto, documento, barrio o domicilio…"
            />
          ) : (
            <BuscadorProveedores
              sugeribles={sugeribles}
              onElegir={(p) => onElegirProveedor(p.clave)}
              excluir={proveedores}
              deshabilitado={proveedores.length >= MAX_PROVEEDORES}
              placeholder={proveedores.length >= MAX_PROVEEDORES
                ? `Máximo ${MAX_PROVEEDORES} proveedores: quita uno para agregar otro`
                : proveedores.length
                  ? `Agregar otro proveedor para comparar (${proveedores.length} de ${MAX_PROVEEDORES})…`
                  : "Buscar proveedor por nombre o documento…"}
            />
          )}
          {proveedores.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {proveedores.map((k, i) => (
                <span key={k} className="inline-flex max-w-full items-center gap-2 rounded-full border py-1 pl-2.5 pr-1.5 text-xs"
                      style={{ borderColor: colores?.[i] ?? "var(--cta)" }}>
                  {colores?.[i] && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colores[i] }} />
                  )}
                  <span className="truncate font-medium">{nombreProveedor(k)}</span>
                  <button onClick={() => onQuitarProveedor(k)} aria-label="Quitar proveedor"
                          className="rounded-full px-1.5 leading-none" style={{ color: "var(--muted)" }}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Una sola línea en pantallas anchas: 7 controles y el botón de limpiar. */}
      <div className="grid grid-cols-2 items-end gap-2 md:grid-cols-4 lg:grid-cols-9">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Gobierno
          </span>
          <select value={filtros.gobierno} onChange={(e) => elegirGobierno(e.target.value)}
                  className="w-full truncate rounded-lg border px-2 py-1.5 text-xs"
                  style={{ borderColor: filtros.gobierno ? "var(--cta)" : "var(--line)",
                           background: "var(--surface)", color: "var(--ink)" }}>
            <option value="">Todos los períodos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.id}>
                {etiquetaPeriodo(p)} · {titular(p)} ({numero(conteoPeriodos.get(p.id) ?? 0)})
              </option>
            ))}
          </select>
        </label>

        <Selector etiqueta="Entidad" valor={filtros.entidad} onChange={(v) => set("entidad", v)}
                  opciones={opciones.entidad} resaltado />
        <Selector etiqueta="Estado" valor={filtros.estado} onChange={(v) => set("estado", v)}
                  opciones={opciones.estado} resaltado />
        <Selector etiqueta="Tipo" valor={filtros.tipo} onChange={(v) => set("tipo", v)}
                  opciones={opciones.tipo} resaltado />
        <Selector etiqueta="Modalidad" valor={filtros.modalidad} onChange={(v) => set("modalidad", v)}
                  opciones={opciones.modalidad} resaltado />
        <Fecha etiqueta="Firmado desde" valor={filtros.desde} onChange={setDesde} />
        <Fecha etiqueta="Hasta" valor={filtros.hasta} onChange={setHasta} />

        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Valor mínimo
          </span>
          <input type="number" inputMode="numeric" value={filtros.minValor} placeholder="0"
                 onChange={(e) => set("minValor", e.target.value)}
                 className="num w-full rounded-lg border px-2 py-1.5 text-xs"
                 style={{ borderColor: filtros.minValor ? "var(--cta)" : "var(--line)",
                          background: "var(--surface)", color: "var(--ink)" }} />
        </label>

        <button onClick={limpiar} disabled={!activos}
                className="rounded-lg border px-2 py-1.5 text-xs transition disabled:opacity-35"
                style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
          Quitar filtros
        </button>
      </div>
      {nota && (
        <p className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>{nota}</p>
      )}
    </div>
  );
}
