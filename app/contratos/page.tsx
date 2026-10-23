"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FeatureCollection } from "geojson";
import type { Contrato, Meta } from "@/lib/types";
import { cargarTodo } from "@/lib/data";
import { fecha, numero } from "@/lib/format";
import { useFiltrado } from "@/lib/filtrado";
import { periodoPorId } from "@/lib/gobiernos";
import {
  escribirUrl, leerContrato, leerFiltros, leerProveedores, leerVista, MAX_PROVEEDORES,
  type Filtros, type Vista,
} from "@/lib/urlEstado";
import { claveProveedor, indexarProveedores, SERIES } from "@/lib/linea";
import { Cargando } from "@/components/ui";
import TemaToggle from "@/components/TemaToggle";
import BarraFiltros from "@/components/BarraFiltros";
import Listado from "@/components/Listado";
import NotaGobierno from "@/components/NotaGobierno";
import DetalleContrato from "@/components/DetalleContrato";
import IconoIslas from "@/components/IconoIslas";
import { MarcaWisii } from "@/components/marca/Logos";
import ListaBlog from "@/components/hallazgos/ListaBlog";

// maplibre toca window en el import: fuera del render del servidor
const MapaCalor = dynamic(() => import("@/components/MapaCalor"), {
  ssr: false, loading: () => <Cargando texto="Dibujando las islas…" />,
});
const EditorBarrios = dynamic(() => import("@/components/EditorBarrios"), {
  ssr: false, loading: () => <Cargando texto="Abriendo el editor…" />,
});
const Timeline = dynamic(() => import("@/components/Timeline"), {
  ssr: false, loading: () => <Cargando texto="Armando la línea de tiempo…" />,
});
const AsignadorBarrios = dynamic(() => import("@/components/AsignadorBarrios"), {
  ssr: false, loading: () => <Cargando texto="Cargando pendientes…" />,
});

/** Las herramientas de barrios escriben en disco: solo existen en local. */
const EDITOR_DISPONIBLE = process.env.NEXT_PUBLIC_EDITOR_BARRIOS !== "0";
const HERRAMIENTAS: Vista[] = ["editor", "asignador"];
/** vistas que no usan la barra de filtros */
const SIN_FILTROS: Vista[] = [...HERRAMIENTAS, "blog"];

/** Pestañas principales. El mapa de calor es secundario: va como ícono aparte. */
const VISTAS: [Vista, string][] = [
  ["contratos", "Contratos"],
  ["timeline", "Timeline"],
  ["blog", "Blog posts"],
  ...(EDITOR_DISPONIBLE
    ? ([["editor", "Editor de barrios"], ["asignador", "Asignador de barrios"]] as [Vista, string][])
    : []),
];

const SIN_CONTRATOS: Contrato[] = [];

interface Datos {
  contratos: Contrato[]; meta: Meta;
  islas: FeatureCollection; barrios: FeatureCollection;
}

export default function Page() {
  // useSearchParams necesita un límite de Suspense en una página prerenderizada
  return (
    <Suspense fallback={<Cargando texto="Cargando contratos…" />}>
      <Explorador />
    </Suspense>
  );
}

function Explorador() {
  const router = useRouter();
  const sp = useSearchParams();

  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El estado arranca desde la URL, así un enlace compartido abre exactamente
  // la misma búsqueda. Después vive en React y se refleja de vuelta con
  // replace(), para no llenar el historial con cada tecla del buscador.
  const [vista, setVista] = useState<Vista>(() => {
    const v = leerVista(new URLSearchParams(sp.toString()));
    // un enlace a una herramienta local en un despliegue cae al listado
    return HERRAMIENTAS.includes(v) && !EDITOR_DISPONIBLE ? "contratos" : v;
  });
  const [filtros, setFiltros] = useState<Filtros>(() => leerFiltros(new URLSearchParams(sp.toString())));
  const [abiertoId, setAbiertoId] = useState<string | null>(
    () => leerContrato(new URLSearchParams(sp.toString())));
  const [proveedores, setProveedores] = useState<string[]>(
    () => leerProveedores(new URLSearchParams(sp.toString())));

  useEffect(() => { cargarTodo().then(setD).catch((e) => setError(String(e.message ?? e))); }, []);

  const url = escribirUrl(vista, filtros, abiertoId, proveedores);
  useEffect(() => { router.replace(`/contratos${url}`, { scroll: false }); }, [url, router]);

  const contratos = useMemo(() => d?.contratos ?? [], [d]);
  // El mapa no tiene buscador de texto, pero comparte todos los demás filtros.
  // Filtrado de todo el departamento: lo usan el listado, el mapa y las
  // sugerencias del buscador. En el timeline, los contadores de la barra se
  // calculan aparte sobre los contratos de los proveedores elegidos, para que
  // "Cerrado (12)" quiera decir 12 de ellos. Esa segunda pasada recibe una lista
  // vacía fuera del timeline, así que no cuesta nada.
  // Los proveedores elegidos son un carrito global: acotan el listado y son
  // las líneas del timeline. El mapa los ignora.
  const enTimeline = vista === "timeline";
  const conCarrito = (vista === "contratos" || vista === "timeline") && proveedores.length > 0;
  const elegidos = useMemo(() => new Set(proveedores), [proveedores]);
  const global = useFiltrado(contratos, filtros, vista !== "contratos");
  const deElegidos = useFiltrado(
    useMemo(() => (conCarrito
      ? contratos.filter((c) => elegidos.has(claveProveedor(c)))
      : SIN_CONTRATOS), [conCarrito, elegidos, contratos]),
    filtros, vista !== "contratos");
  const filtrado = conCarrito ? deElegidos : global;

  /** Sumar al carrito: si ya hay tres, el nuevo reemplaza la lista. */
  const elegirProveedor = (k: string) =>
    setProveedores((ps) => ps.includes(k) ? ps : ps.length < MAX_PROVEEDORES ? [...ps, k] : [k]);
  const quitarProveedor = (k: string) => setProveedores((ps) => ps.filter((x) => x !== k));
  const cambiarVista = setVista;

  const indiceTotal = useMemo(() => indexarProveedores(contratos), [contratos]);
  const nombreProveedor = (k: string) => indiceTotal.get(k)?.nombre ?? k;

  const abierto = useMemo(
    () => (d && abiertoId ? contratos.find((c) => c.id === abiertoId) ?? null : null),
    [d, abiertoId, contratos]);
  /** el enlace traía un id que no existe en los datos publicados */
  const noEncontrado = Boolean(d && abiertoId && !abierto);

  const periodoSel = filtros.gobierno ? periodoPorId(filtros.gobierno) : null;

  if (error) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold" style={{ color: "var(--coral)" }}>
          No se pudieron cargar los datos
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{error}</p>
        {/* la instrucción de desarrollo no le sirve a un visitante */}
        {EDITOR_DISPONIBLE ? (
          <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
            Genera los archivos con <code>npm run data:all</code>.
          </p>
        ) : (
          <button onClick={() => location.reload()}
                  className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ background: "var(--cta)", color: "var(--cta-ink)" }}>
            Recargar
          </button>
        )}
      </main>
    );
  }
  if (!d) return <Cargando texto="Cargando contratos…" />;

  const { meta, islas, barrios } = d;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
      <header>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium transition hover:opacity-70"
                style={{ color: "var(--muted)" }}>
            ← <MarcaWisii tamano={18} /> WiSii
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/hallazgos" className="text-xs font-medium hover:opacity-70"
                  style={{ color: "var(--ink-soft)" }}>Hallazgos</Link>
            <TemaToggle />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Contratación pública del Archipiélago
            </h1>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {numero(meta.contratos)} contratos de {meta.entidades} entidades del
              departamento, firmados entre {fecha(meta.desde)} y {fecha(meta.hasta)} ·{" "}
              {meta.fuente}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex items-center gap-1 rounded-lg border p-1 text-sm"
             style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {VISTAS.map(([v, l]) => (
              <button key={v} onClick={() => cambiarVista(v)}
                      className="shrink-0 rounded-md px-3 py-1.5 font-medium transition"
                      style={vista === v
                        ? { background: "var(--accent)", color: "var(--accent-ink)" }
                        : { color: "var(--muted)" }}>
                {l}
              </button>
            ))}
          </div>
          {/* el mapa de calor es secundario: un ícono con la silueta de las islas */}
          <button onClick={() => cambiarVista("mapa")} title="Mapa de calor" aria-label="Mapa de calor"
                  aria-pressed={vista === "mapa"}
                  className="shrink-0 rounded-md p-1.5 transition"
                  style={vista === "mapa"
                    ? { background: "var(--accent)", color: "var(--accent-ink)" }
                    : { color: "var(--muted)" }}>
            <IconoIslas />
          </button>
        </nav>
      </header>

      {/* La barra de filtros es la misma en contratos, timeline y mapa; solo el
          listado lleva buscador. */}
      {!SIN_FILTROS.includes(vista) && (
        <div className="mt-4">
          <BarraFiltros filtros={filtros} setFiltros={setFiltros}
                        opciones={filtrado.opciones} periodos={filtrado.periodos}
                        conteoPeriodos={filtrado.conteoPeriodos}
                        busqueda={vista === "contratos" ? "texto" : enTimeline ? "elegir" : null}
                        colores={enTimeline ? SERIES : undefined}
                        nota={enTimeline ? <>
                          Hasta {MAX_PROVEEDORES} proveedores sobre la misma escala de tiempo. Las
                          sugerencias cuentan los contratos con los filtros activos. Se agrupa por
                          documento: un mismo proveedor escrito de varias formas se junta; un documento
                          mal digitado en el SECOP aparece aparte.
                        </> : undefined}
                        sugeribles={global.paraProveedores}
                        nombreProveedor={nombreProveedor}
                        proveedores={proveedores} onElegirProveedor={elegirProveedor}
                        onQuitarProveedor={quitarProveedor} />
        </div>
      )}

      <section className="mt-4">
        {vista === "contratos" && (
          <Listado filtrados={filtrado.filtrados} total={filtrado.total}
                   universo={contratos.length} filtros={filtros} setFiltros={setFiltros}
                   urlCompartir={`/contratos${escribirUrl("contratos", filtros, null, proveedores)}`}
                   onAbrirContrato={(c) => setAbiertoId(c.id)} />
        )}
        {vista === "mapa" && (
          <MapaCalor contratos={filtrado.filtrados} islas={islas} barrios={barrios}
                     meta={meta} onAbrirContrato={(c) => setAbiertoId(c.id)} />
        )}
        {vista === "timeline" && (
          <Timeline contratos={contratos} filtrados={global.filtrados}
                    sugeribles={global.paraProveedores}
                    claves={proveedores} onCambiarClaves={setProveedores}
                    onAbrirContrato={(c) => setAbiertoId(c.id)} />
        )}
        {vista === "blog" && <ListaBlog />}
        {vista === "editor" && EDITOR_DISPONIBLE && <EditorBarrios meta={meta} />}
        {vista === "asignador" && EDITOR_DISPONIBLE && <AsignadorBarrios />}
      </section>

      {/* contexto de lectura, debajo de los resultados */}
      {periodoSel && !SIN_FILTROS.includes(vista) && (
        <div className="mt-5"><NotaGobierno periodo={periodoSel} /></div>
      )}

      <footer className="mt-8 border-t pt-4 text-[11px] leading-relaxed"
              style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
        Datos abiertos de datos.gov.co:{" "}
        <a href="https://www.datos.gov.co/d/jbjy-vk9h" target="_blank"
           rel="noopener noreferrer" className="underline">SECOP II</a>{" "}
        (2020-2026) y{" "}
        <a href="https://www.datos.gov.co/d/f789-7hwg" target="_blank"
           rel="noopener noreferrer" className="underline">SECOP I</a>{" "}
        (2015-2022), para las {meta.entidades} entidades públicas del departamento.
        Contorno de las islas © OpenStreetMap. El mapa ubica el{" "}
        <strong>domicilio del representante legal del contratista</strong>, no el lugar de
        ejecución: el SECOP registra todos los contratos en la misma dirección, y SECOP I
        ni siquiera publica ese campo. Se descartaron {numero(meta.duplicados_descartados)} registros
        que aparecían en ambos sistemas. El campo <code>valor_pagado</code> se omite porque
        solo {numero(meta.con_pago_reportado)} de {numero(meta.contratos)} contratos lo reportan.
      </footer>

      {noEncontrado && (
        <div role="status"
             className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 text-xs shadow-lg"
             style={{ borderColor: "var(--coral)", background: "var(--surface)", color: "var(--ink)" }}>
          El contrato <code>{abiertoId}</code> no está en los datos publicados.
          <button onClick={() => setAbiertoId(null)} className="ml-3 underline"
                  style={{ color: "var(--muted)" }}>cerrar</button>
        </div>
      )}

      {abierto && (
        <DetalleContrato c={abierto}
                         url={`/contratos${escribirUrl(vista, filtros, abierto.id, proveedores)}`}
                         onCerrar={() => setAbiertoId(null)}
                         onVerTimeline={vista === "timeline" ? undefined : () => {
                           elegirProveedor(claveProveedor(abierto));
                           setVista("timeline");
                           setAbiertoId(null);
                         }} />
      )}
    </main>
  );
}
