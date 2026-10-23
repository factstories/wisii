"use client";

import { useMemo, useState } from "react";
import type { Contrato } from "@/lib/types";
import { copCorto, numero } from "@/lib/format";
import { buscarProveedores, indexarProveedores, type Proveedor } from "@/lib/linea";

/**
 * Buscador con sugerencias de proveedores ordenadas por número de contratos.
 * Las cuentas salen de `sugeribles`, los contratos que pasan los filtros
 * activos: si se filtra por un gobierno, cada proveedor muestra cuántos
 * contratos tiene en ese período.
 *
 * Con `onTexto` el texto escrito además busca en todos los campos (listado);
 * sin él, solo sirve para elegir proveedores (timeline).
 */
export default function BuscadorProveedores({
  sugeribles, texto, onTexto, onElegir, excluir = [], placeholder, deshabilitado,
}: {
  sugeribles: Contrato[];
  texto?: string;
  onTexto?: (t: string) => void;
  onElegir: (p: Proveedor) => void;
  excluir?: string[];
  placeholder: string;
  deshabilitado?: boolean;
}) {
  const [local, setLocal] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const valor = onTexto ? (texto ?? "") : local;

  const indice = useMemo(() => indexarProveedores(sugeribles), [sugeribles]);
  const resultados = useMemo(
    () => buscarProveedores(indice, valor, 8).filter((p) => !excluir.includes(p.clave)),
    [indice, valor, excluir]);

  function cambiar(t: string) {
    if (onTexto) onTexto(t); else setLocal(t);
    setAbierto(true);
    setActivo(0);
  }
  function elegir(p: Proveedor) {
    // En modo texto, vaciar la búsqueda le toca a onElegir en la misma
    // actualización: llamar también a onTexto("") partiría de los filtros
    // viejos y borraría el proveedor recién elegido.
    onElegir(p);
    if (!onTexto) setLocal("");
    setAbierto(false);
  }

  const mostrar = abierto && valor.trim().length > 0 && !deshabilitado;

  return (
    <div className="relative">
      <input
        value={valor} disabled={deshabilitado}
        onChange={(e) => cambiar(e.target.value)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (!mostrar) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActivo((a) => Math.min(a + 1, resultados.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Escape") setAbierto(false);
          else if (e.key === "Enter") {
            // en el listado, Enter deja la búsqueda de texto tal cual; en el
            // timeline, elige la sugerencia marcada
            if (!onTexto && resultados[activo]) elegir(resultados[activo]);
            setAbierto(false);
          }
        }}
        placeholder={placeholder}
        role="combobox" aria-expanded={mostrar} aria-autocomplete="list"
        className="w-full rounded-lg border px-3 py-2.5 pr-20 text-sm outline-none disabled:opacity-60"
        style={{ borderColor: "var(--line)", background: "var(--raised)", color: "var(--ink)" }}
      />
      {valor && !deshabilitado && (
        <button onClick={() => cambiar("")} onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs"
                style={{ color: "var(--muted)" }}>limpiar</button>
      )}

      {mostrar && (
        <div role="listbox"
             className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-lg border shadow-lg"
             style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Proveedores · por número de contratos con los filtros activos
          </div>
          {resultados.length === 0 ? (
            <div className="px-3 py-2.5 text-xs" style={{ color: "var(--muted)" }}>
              Ningún proveedor coincide con «{valor}».
            </div>
          ) : resultados.map((p, i) => (
            <button key={p.clave} role="option" aria-selected={i === activo}
                    onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActivo(i)}
                    onClick={() => elegir(p)}
                    className="flex w-full items-baseline justify-between gap-3 border-t px-3 py-2 text-left text-xs"
                    style={{ borderColor: "var(--line-soft)", background: i === activo ? "var(--raised)" : undefined }}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.nombre}</span>
                <span className="num text-[10px]" style={{ color: "var(--muted)" }}>{p.documento || "sin documento"}</span>
              </span>
              <span className="num shrink-0 text-right" style={{ color: "var(--muted)" }}>
                {numero(p.contratos.length)} contratos · {copCorto(p.valor)}
              </span>
            </button>
          ))}
          {onTexto && (
            <div className="border-t px-3 py-2 text-[11px]" style={{ borderColor: "var(--line-soft)", color: "var(--muted)" }}>
              Elige un proveedor para ver solo sus contratos, o sigue escribiendo para buscar «{valor}»
              en el objeto, el documento, el barrio y el domicilio.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
