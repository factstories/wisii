"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Contrato } from "@/lib/types";
import { cop, copCorto, fecha, numero } from "@/lib/format";
import {
  buscarProveedores, dia, indexarProveedores, repartirEnCarriles, tramosSolapados,
  type Barra, type Proveedor,
} from "@/lib/linea";
import { ELECCIONES, type Eleccion } from "@/lib/gobiernos";
import { MAX_PROVEEDORES } from "@/lib/urlEstado";
import { Nota } from "./ui";

// --- geometría ---
const COL = 184;             // columna fija con el nombre de cada proveedor
const M_IZQ = 14, M_DER = 28, EJE = 30;
const CARRIL = 46;           // alto de cada carril
const SEP = 12;              // aire entre el bloque de un proveedor y el siguiente
const Y_ETIQ_ARRIBA = 13;    // valor sobre la barra
const Y_BARRA = 18, ALTO_BARRA = 12;
const Y_ETIQ_ABAJO = 42;     // valor bajo la barra, si arriba choca con el vecino
const PX_POR_CARACTER = 6;
const ZOOMS = [1, 2, 4, 8];

/** Proveedor 1 coral, 2 azul, 3 verde: tokens definidos en globals.css. */
const SERIES = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)"];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const isoDeDia = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);

interface Grupo {
  p: Proveedor;
  /** contratos del proveedor que pasan los filtros, y su valor */
  visibles: Contrato[];
  valor: number;
  /** posición del proveedor: fija su color */
  i: number;
  barras: Barra[];
  carriles: number;
  maxSimultaneos: number;
  /** desplazamiento vertical del bloque bajo el eje */
  top: number;
}

export default function Timeline({ contratos, filtrados, claves, onCambiarClaves, onAbrirContrato }: {
  /** todos los contratos: definen la identidad y el total de cada proveedor */
  contratos: Contrato[];
  /** los que pasan los filtros de la barra: son los que se dibujan */
  filtrados: Contrato[];
  /** proveedores seleccionados, en orden; viven en la URL para poder compartir */
  claves: string[];
  onCambiarClaves: (claves: string[]) => void;
  onAbrirContrato: (c: Contrato) => void;
}) {
  const indice = useMemo(() => indexarProveedores(contratos), [contratos]);
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [zoom, setZoom] = useState(0);
  /** elección cuya tarjeta está abierta; se abre al tocar, porque en el móvil no hay hover */
  const [eleccionSel, setEleccionSel] = useState<Eleccion | null>(null);

  const provs = useMemo(
    () => claves.map((k) => indice.get(k)).filter((p): p is Proveedor => Boolean(p)),
    [claves, indice]);
  const noEncontrados = claves.filter((k) => !indice.has(k));
  const lleno = provs.length >= MAX_PROVEEDORES;

  const resultados = useMemo(
    () => buscarProveedores(indice, q, 12).filter((p) => !claves.includes(p.clave)),
    [indice, q, claves]);
  const destacados = useMemo(
    () => [...indice.values()].sort((a, b) => b.contratos.length - a.contratos.length).slice(0, 8),
    [indice]);

  function agregar(p: Proveedor) {
    if (!claves.includes(p.clave) && claves.length < MAX_PROVEEDORES) {
      onCambiarClaves([...claves, p.clave]);
    }
    setQ("");
    setAbierto(false);
  }
  const quitar = (k: string) => onCambiarClaves(claves.filter((x) => x !== k));

  // --- ancho disponible para la línea (descontando la columna fija) ---
  const caja = useRef<HTMLDivElement>(null);
  const [anchoCaja, setAnchoCaja] = useState(900);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAnchoCaja(el.clientWidth));
    ro.observe(el);
    setAnchoCaja(el.clientWidth);
    return () => ro.disconnect();
  }, [provs.length > 0]);

  const idsVisibles = useMemo(() => new Set(filtrados.map((c) => c.i)), [filtrados]);

  const modelo = useMemo(() => {
    if (!provs.length) return null;
    let acumulado = 0;
    const grupos: Grupo[] = provs.map((p, i) => {
      const visibles = p.contratos.filter((c) => idsVisibles.has(c.i));
      const { barras, carriles } = repartirEnCarriles(visibles);
      const tramos = tramosSolapados(barras);
      // un proveedor sin contratos tras filtrar conserva su fila, para que se
      // note que los filtros lo dejaron vacío en vez de que desaparezca
      const alto = Math.max(1, carriles);
      const g = {
        p, i, visibles, barras, carriles: alto, top: acumulado,
        valor: visibles.reduce((s, c) => s + c.valor, 0),
        maxSimultaneos: barras.length ? Math.max(1, ...tramos.map((t) => t.simultaneos)) : 0,
      };
      acumulado += alto * CARRIL + SEP;
      return g;
    });
    const todas = grupos.flatMap((g) => g.barras);
    if (!todas.length) return { grupos, vacio: true as const };
    // una sola escala para todos: sin eso comparar proveedores no tendría sentido
    const min = Math.min(...todas.map((b) => b.desde));
    // hasta hoy siempre, aunque ningún contrato siga vigente: así se ve cuánto
    // tiempo pasó desde el último contrato
    const hoy = Math.floor(Date.now() / 86_400_000);
    const max = Math.max(hoy, ...todas.map((b) => b.hasta));
    const margen = Math.max(15, Math.round((max - min) * 0.03));
    return { grupos, vacio: false as const, altoFilas: acumulado - SEP,
             d0: min - margen, d1: max + margen + 1 };
  }, [provs, idsVisibles]);

  // al cambiar la selección: zoom base y scroll al final, que es lo más reciente
  useEffect(() => { setEleccionSel(null); }, [zoom]);

  useEffect(() => {
    setZoom(0);
    setEleccionSel(null);
    requestAnimationFrame(() => caja.current?.scrollTo({ left: caja.current.scrollWidth }));
  }, [claves.join("|")]);

  // --- escala ---
  const geo = useMemo(() => {
    if (!modelo || modelo.vacio) return null;
    const dias = modelo.d1 - modelo.d0;
    const ancho = Math.round(Math.max(anchoCaja - COL, 300) * ZOOMS[zoom]);
    const x = (d: number) => M_IZQ + ((d - modelo.d0) / dias) * (ancho - M_IZQ - M_DER);
    const alto = EJE + modelo.altoFilas + 8;

    const anioIni = Number(isoDeDia(modelo.d0).slice(0, 4));
    const anioFin = Number(isoDeDia(modelo.d1).slice(0, 4));
    const pxPorMes = (ancho / dias) * 30.4;
    const marcas: { x: number; texto: string; mayor: boolean }[] = [];
    for (let a = anioIni; a <= anioFin + 1; a++) {
      for (let m = 0; m < 12; m++) {
        const d = Math.floor(Date.UTC(a, m, 1) / 86_400_000);
        if (d < modelo.d0 || d > modelo.d1) continue;
        if (m === 0) marcas.push({ x: x(d), texto: String(a), mayor: true });
        else if (pxPorMes >= 34) marcas.push({ x: x(d), texto: MESES[m], mayor: false });
      }
    }
    const elecciones = ELECCIONES
      .map((e) => ({ e, d: dia(e.fecha) }))
      .filter(({ d }) => d >= modelo.d0 && d <= modelo.d1)
      .map(({ e, d }) => ({ e, x: x(d) }));
    return { ancho, alto, x, marcas, elecciones };
  }, [modelo, anchoCaja, zoom]);

  /**
   * Etiqueta de valor: arriba de la barra; si choca con la del vecino de
   * carril, abajo; si tampoco cabe, se omite —texto encimado no se lee— y un
   * aviso indica cuántas revela el zoom. El valor sigue en el tooltip y la ficha.
   */
  const etiquetas = useMemo(() => {
    const m = new Map<Barra, "arriba" | "abajo" | null>();
    if (!modelo || modelo.vacio || !geo) return m;
    for (const g of modelo.grupos) {
      const finArriba: number[] = [], finAbajo: number[] = [];
      for (const b of [...g.barras].sort((p, o) => p.desde - o.desde)) {
        const x0 = geo.x(b.desde);
        const w = copCorto(b.c.valor).length * PX_POR_CARACTER;
        let lado: "arriba" | "abajo" | null = null;
        if (x0 > (finArriba[b.carril] ?? -Infinity) + 4) lado = "arriba";
        else if (x0 > (finAbajo[b.carril] ?? -Infinity) + 4) lado = "abajo";
        m.set(b, lado);
        if (lado === "arriba") finArriba[b.carril] = x0 + w;
        if (lado === "abajo") finAbajo[b.carril] = x0 + w;
      }
    }
    return m;
  }, [modelo, geo]);

  const ocultas = useMemo(() => [...etiquetas.values()].filter((v) => v === null).length, [etiquetas]);
  const hoy = Math.floor(Date.now() / 86_400_000);

  return (
    <div className="flex flex-col gap-4">
      {/* selección */}
      <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        {provs.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {provs.map((p, i) => (
              <span key={p.clave}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border py-1 pl-2.5 pr-1.5 text-xs"
                    style={{ borderColor: SERIES[i] }}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[i] }} />
                <span className="truncate font-medium">{p.nombre}</span>
                <button onClick={() => quitar(p.clave)} aria-label={`Quitar ${p.nombre}`}
                        className="rounded-full px-1.5 leading-none" style={{ color: "var(--muted)" }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            value={q} disabled={lleno}
            onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            placeholder={lleno
              ? `Máximo ${MAX_PROVEEDORES} proveedores: quitá uno para agregar otro`
              : provs.length
                ? `Agregar otro proveedor para comparar (${provs.length} de ${MAX_PROVEEDORES})…`
                : "Buscar proveedor por nombre o documento…"}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none disabled:opacity-60"
            style={{ borderColor: "var(--line)", background: "var(--raised)", color: "var(--ink)" }}
          />
          {abierto && q.trim() && !lleno && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border shadow-lg"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              {resultados.length === 0 ? (
                <li className="px-3 py-2.5 text-xs" style={{ color: "var(--muted)" }}>
                  Ningún proveedor coincide con «{q}».
                </li>
              ) : resultados.map((p) => (
                <li key={p.clave}>
                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(p)}
                          className="flex w-full items-baseline justify-between gap-3 border-b px-3 py-2 text-left text-xs transition hover:bg-[var(--raised)]"
                          style={{ borderColor: "var(--line-soft)" }}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.nombre}</span>
                      <span className="num text-[10px]" style={{ color: "var(--muted)" }}>
                        {p.documento || "sin documento"}
                      </span>
                    </span>
                    <span className="num shrink-0 text-right" style={{ color: "var(--muted)" }}>
                      {numero(p.contratos.length)} contratos · {copCorto(p.valor)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
          Hasta {MAX_PROVEEDORES} proveedores sobre la misma escala de tiempo. Se agrupa por
          documento: un mismo proveedor escrito de varias formas se junta; un documento mal
          digitado en el SECOP aparece aparte.
        </p>
      </div>

      {noEncontrados.length > 0 && (
        <Nota>
          {noEncontrados.length === 1 ? "Un proveedor del enlace no está" : "Algunos proveedores del enlace no están"}{" "}
          en los datos publicados: <code>{noEncontrados.join(", ")}</code>.
        </Nota>
      )}

      {modelo?.vacio ? (
        <div className="rounded-xl border p-5 text-sm"
             style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink-soft)" }}>
          Ningún contrato de {provs.length === 1 ? "este proveedor" : "estos proveedores"} cumple
          los filtros aplicados. Probá quitando alguno.
        </div>
      ) : !modelo || !geo ? (
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Buscá un proveedor para ver sus contratos en el tiempo, y sumá hasta dos más para comparar.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Proveedores con más contratos
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {destacados.map((p) => (
              <button key={p.clave} onClick={() => agregar(p)}
                      className="rounded-full border px-3 py-1 text-xs transition hover:bg-[var(--raised)]"
                      style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {p.nombre} <span className="num" style={{ color: "var(--muted)" }}>· {p.contratos.length}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* resumen por proveedor */}
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 text-right font-medium">Contratos</th>
                  <th className="px-3 py-2 text-right font-medium">Valor total</th>
                  <th className="px-3 py-2 font-medium">Período</th>
                  <th className="px-3 py-2 text-right font-medium">Máx. simultáneos</th>
                  <th className="px-3 py-2 text-right font-medium">Entidades</th>
                </tr>
              </thead>
              <tbody>
                {modelo.grupos.map((g) => {
                  const filtrado = g.visibles.length !== g.p.contratos.length;
                  const desde = g.barras.length ? Math.min(...g.barras.map((b) => b.desde)) : 0;
                  const hasta = g.barras.length ? Math.max(...g.barras.map((b) => b.hasta)) : 0;
                  return (
                    <tr key={g.p.clave} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES[g.i] }} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{g.p.nombre}</span>
                            <span className="num text-[10px]" style={{ color: "var(--muted)" }}>
                              {g.p.documento || "sin documento"}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="num px-3 py-2 text-right">
                        {numero(g.visibles.length)}
                        {filtrado && (
                          <span style={{ color: "var(--muted)" }}> de {numero(g.p.contratos.length)}</span>
                        )}
                      </td>
                      <td className="num px-3 py-2 text-right">{g.visibles.length ? copCorto(g.valor) : "—"}</td>
                      <td className="num px-3 py-2">
                        {g.barras.length ? `${fecha(isoDeDia(desde))} – ${fecha(isoDeDia(hasta))}` : "—"}
                      </td>
                      <td className="num px-3 py-2 text-right">{g.maxSimultaneos || "—"}</td>
                      <td className="num px-3 py-2 text-right">
                        {g.visibles.length ? new Set(g.visibles.map((c) => c.entidad)).size : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* zoom */}
          <div className="flex flex-wrap items-center justify-end gap-2 px-1 text-xs">
            {ocultas > 0 && (
              <span className="mr-2" style={{ color: "var(--sand)" }}>
                {numero(ocultas)} {ocultas === 1 ? "valor no cabe" : "valores no caben"} a este
                zoom{zoom < ZOOMS.length - 1 ? ": acercá con +" : ""}
              </span>
            )}
            <span style={{ color: "var(--muted)" }}>Zoom</span>
            <button onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0}
                    className="rounded-md border px-2 py-0.5 disabled:opacity-35"
                    style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>−</button>
            <span className="num w-7 text-center">{ZOOMS[zoom]}×</span>
            <button onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
                    disabled={zoom === ZOOMS.length - 1}
                    className="rounded-md border px-2 py-0.5 disabled:opacity-35"
                    style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>+</button>
          </div>

          {/* línea temporal: columna fija a la izquierda + gráfico con scroll */}
          <div ref={caja} className="overflow-x-auto rounded-xl border"
               style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="relative flex" style={{ width: COL + geo.ancho }}
                 onClick={() => setEleccionSel(null)}>
              {/* sticky dentro del contenedor de scroll: no se va al desplazarse */}
              <div className="sticky left-0 z-10 shrink-0 border-r"
                   style={{ width: COL, height: geo.alto, background: "var(--surface)", borderColor: "var(--line)",
                            position: "sticky" }}>
                <div className="flex items-end border-b px-3 pb-1.5 text-[10px] uppercase tracking-wider"
                     style={{ height: EJE, borderColor: "var(--line)", color: "var(--muted)" }}>
                  Proveedor
                </div>
                {modelo.grupos.map((g) => (
                  <div key={g.p.clave} className="absolute left-0 right-0 flex gap-2 py-2 pl-2 pr-1.5"
                       style={{ top: EJE + g.top, height: g.carriles * CARRIL }}>
                    <span className="w-1 shrink-0 rounded-full" style={{ background: SERIES[g.i] }} />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-xs font-semibold leading-tight">{g.p.nombre}</div>
                      <div className="num mt-0.5 text-[10px]" style={{ color: "var(--muted)" }}>
                        {g.visibles.length === 0
                          ? "sin contratos con estos filtros"
                          : g.visibles.length === g.p.contratos.length
                            ? `${numero(g.visibles.length)} contratos`
                            : `${numero(g.visibles.length)} de ${numero(g.p.contratos.length)} contratos`}
                        {g.carriles > 1 && <> · {g.carriles} carriles</>}
                      </div>
                    </div>
                    <button onClick={() => quitar(g.p.clave)} aria-label={`Quitar ${g.p.nombre}`}
                            className="h-5 shrink-0 rounded px-1 text-sm leading-none"
                            style={{ color: "var(--muted)" }}>×</button>
                  </div>
                ))}
              </div>

              <svg width={geo.ancho} height={geo.alto} role="img" style={{ display: "block", flexShrink: 0 }}
                   aria-label={`Línea temporal de ${modelo.grupos.map((g) => g.p.nombre).join(", ")}`}>
                {/* franja tenue del color del proveedor: ata cada fila a su columna */}
                {modelo.grupos.map((g) => (
                  <rect key={`f-${g.p.clave}`} x={0} y={EJE + g.top} width={geo.ancho}
                        height={g.carriles * CARRIL} style={{ fill: SERIES[g.i], opacity: 0.05 }} />
                ))}

                {/* eje */}
                {geo.marcas.map((m, k) => (
                  <g key={k}>
                    <line x1={m.x} x2={m.x} y1={m.mayor ? 6 : 18} y2={geo.alto}
                          style={{ stroke: "var(--line)", strokeWidth: m.mayor ? 1 : 0.5,
                                   strokeDasharray: m.mayor ? undefined : "2 3" }} />
                    <text x={m.x + 4} y={m.mayor ? 16 : 24}
                          style={{ fill: m.mayor ? "var(--ink-soft)" : "var(--muted)",
                                   fontSize: m.mayor ? 11 : 9, fontWeight: m.mayor ? 600 : 400 }}>
                      {m.texto}
                    </text>
                  </g>
                ))}
                <line x1={0} x2={geo.ancho} y1={EJE} y2={EJE} style={{ stroke: "var(--line)" }} />

                {/* separación entre proveedores */}
                {modelo.grupos.slice(1).map((g) => (
                  <line key={`s-${g.p.clave}`} x1={0} x2={geo.ancho}
                        y1={EJE + g.top - SEP / 2} y2={EJE + g.top - SEP / 2}
                        style={{ stroke: "var(--line)" }} />
                ))}

                {/* hoy */}
                {hoy >= modelo.d0 && hoy <= modelo.d1 && (
                  <g>
                    <line x1={geo.x(hoy)} x2={geo.x(hoy)} y1={EJE - 6} y2={geo.alto}
                          style={{ stroke: "var(--ink-soft)", strokeDasharray: "4 3", opacity: 0.6 }} />
                    <text x={geo.x(hoy) - 4} y={EJE - 9} textAnchor="end"
                          style={{ fill: "var(--ink-soft)", fontSize: 9 }}>hoy</text>
                  </g>
                )}

                {/* elecciones de gobernador: marca sobre el eje y guía tenue hacia abajo */}
                {geo.elecciones.map(({ e, x }) => {
                  const activa = eleccionSel?.fecha === e.fecha;
                  const abrir = (ev: React.SyntheticEvent) => {
                    ev.stopPropagation();
                    setEleccionSel(activa ? null : e);
                  };
                  return (
                    <g key={e.fecha} role="button" tabIndex={0} className="cursor-pointer outline-none"
                       aria-label={`Elección de gobernador del ${fecha(e.fecha)}: ganó ${e.ganador}`}
                       onClick={abrir}
                       onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(ev); } }}>
                      <title>{`Elección ${e.tipo === "atípica" ? "atípica " : ""}de gobernador · ${fecha(e.fecha)}\nGanó ${e.ganador}`}</title>
                      <line x1={x} x2={x} y1={EJE + 6} y2={geo.alto}
                            style={{ stroke: "var(--ink)", strokeDasharray: "1 4",
                                     opacity: activa ? 0.55 : 0.22 }} />
                      <line x1={x} x2={x} y1={3} y2={EJE + 6}
                            style={{ stroke: "var(--ink)", strokeWidth: 2.5, strokeLinecap: "round" }} />
                      <path d={`M ${x} ${EJE - 4} l 4 4 l -4 4 l -4 -4 z`}
                            style={{ fill: activa ? "var(--cta)" : "var(--ink)" }} />
                      {/* área de toque generosa: el dedo no apunta a 2 px */}
                      <rect x={x - 11} y={0} width={22} height={EJE + 10} style={{ fill: "transparent" }} />
                    </g>
                  );
                })}

                {/* contratos */}
                {modelo.grupos.flatMap((g) => g.barras.map((b) => {
                  const top = EJE + g.top + b.carril * CARRIL;
                  const x0 = geo.x(b.desde);
                  const w = Math.max(4, geo.x(b.hasta + 1) - x0);
                  const color = SERIES[g.i];
                  const lado = etiquetas.get(b) ?? null;
                  const abrir = () => onAbrirContrato(b.c);
                  return (
                    <g key={`${g.p.clave}-${b.c.id}`} role="button" tabIndex={0}
                       className="cursor-pointer outline-none" onClick={abrir}
                       onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } }}>
                      <title>{[
                        g.p.nombre,
                        b.c.objeto.slice(0, 140) + (b.c.objeto.length > 140 ? "…" : ""),
                        `${b.c.entidad} · ${cop(b.c.valor)}`,
                        `${fecha(b.c.inicio)} → ${b.finDudoso ? "sin fecha de fin válida" : fecha(b.c.fin)}`,
                      ].join("\n")}</title>
                      {/* área de clic más alta que la barra, para no tener que apuntar fino */}
                      <rect x={x0 - 2} y={top + 2} width={w + 4} height={CARRIL - 4} style={{ fill: "transparent" }} />
                      {b.finDudoso ? (
                        <path d={`M ${x0} ${top + Y_BARRA - 2} l 7 8 l -7 8 l -7 -8 z`}
                              style={{ fill: "none", stroke: color, strokeWidth: 1.5 }} />
                      ) : (
                        <rect x={x0} y={top + Y_BARRA} width={w} height={ALTO_BARRA} rx={3}
                              className="transition-opacity hover:opacity-75"
                              style={{ fill: color, stroke: "var(--surface)", strokeWidth: 1 }} />
                      )}
                      {lado && (
                        <text x={x0} y={top + (lado === "arriba" ? Y_ETIQ_ARRIBA : Y_ETIQ_ABAJO)}
                              className="num" style={{ fill: "var(--ink-soft)", fontSize: 10, fontWeight: 600 }}>
                          {copCorto(b.c.valor)}
                        </text>
                      )}
                    </g>
                  );
                }))}
              </svg>

              {eleccionSel && (() => {
                const m = geo.elecciones.find(({ e }) => e.fecha === eleccionSel.fecha);
                if (!m) return null;
                const ANCHO = 248;
                // se ancla a la derecha de la marca, salvo que no quepa
                const izq = COL + m.x + ANCHO + 16 > COL + geo.ancho
                  ? COL + m.x - ANCHO - 8 : COL + m.x + 10;
                return (
                  <div role="dialog" aria-label="Detalle de la elección"
                       className="absolute z-20 rounded-lg border p-3 text-xs shadow-lg"
                       style={{ left: Math.max(COL + 4, izq), top: EJE + 6, width: ANCHO,
                                borderColor: "var(--line)", background: "var(--surface)" }}
                       onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                        Elección {eleccionSel.tipo === "atípica" ? "atípica " : ""}de gobernador
                      </div>
                      <button onClick={() => setEleccionSel(null)} aria-label="Cerrar"
                              className="-mr-1 -mt-1 rounded px-1 leading-none" style={{ color: "var(--muted)" }}>×</button>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{fecha(eleccionSel.fecha)}</div>
                    <div className="mt-2">
                      Ganó <strong>{eleccionSel.ganador}</strong>
                    </div>
                    <div className="mt-0.5" style={{ color: "var(--muted)" }}>
                      Período {eleccionSel.periodo}
                    </div>
                    {eleccionSel.nota && (
                      <p className="mt-2 leading-snug" style={{ color: "var(--ink-soft)" }}>{eleccionSel.nota}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <Nota>
            Cada barra va del <strong>inicio de ejecución</strong> a la <strong>fecha de fin</strong>{" "}
            publicadas; si el SECOP no trae inicio, se usa la firma. Los contratos de un mismo
            proveedor que comparten aunque sea un día quedan en carriles distintos, uno sobre
            otro. Los rombos sobre el eje marcan las <strong>elecciones de gobernador</strong>:
            tocalos para ver la fecha y quién ganó. La escala llega siempre hasta hoy.{" "}
            {modelo.grupos.some((g) => g.barras.some((b) => b.finDudoso)) && (
              <>Los rombos huecos en los carriles son contratos sin fecha de fin válida.</>
            )} Tocá una barra para ver el detalle.
          </Nota>
        </>
      )}
    </div>
  );
}
