/**
 * Gráficos de las notas. Son componentes de servidor: el SVG o el HTML llega
 * completo y Movimiento.tsx lo anima al entrar en pantalla (.rv, .crece).
 * Una sola tinta (--dato); los valores van en tinta de texto, nunca en el
 * color de la serie.
 */
import { copCorto, fecha, numero } from "@/lib/format";

const pct1 = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;

function Figura({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <figure className="rv rounded-xl border p-4 sm:p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <figcaption className="text-sm font-semibold">{titulo}</figcaption>
      {nota && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{nota}</p>}
      {children}
    </figure>
  );
}

/** Contratos que salieron del conjunto de datos, semana por semana. */
export function GraficoSemanas({ semanas, detectado }: {
  semanas: { fecha: string; salieron: number; entraron: number }[]; detectado: string;
}) {
  const W = 640, H = 200, M = { t: 24, b: 30, l: 6, r: 6 };
  const max = Math.max(...semanas.map((s) => s.salieron), 1);
  const paso = (W - M.l - M.r) / semanas.length;
  const ancho = Math.min(46, paso * 0.5);
  const base = H - M.b;
  return (
    <Figura titulo="Contratos que salieron de los datos abiertos, por semana"
            nota="SECOP II, entidades del departamento. Una semana normal: cero o uno.">
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
           aria-label={semanas.map((s) => `${fecha(s.fecha)}: ${s.salieron}`).join(", ")}>
        <line x1={M.l} x2={W - M.r} y1={base} y2={base} style={{ stroke: "var(--line)" }} />
        {semanas.map((s, i) => {
          const cx = M.l + paso * i + paso / 2;
          const h = Math.max(s.salieron ? 3 : 0, (s.salieron / max) * (base - M.t));
          const pico = s.fecha === detectado;
          return (
            <g key={s.fecha}>
              <title>{`${fecha(s.fecha)}: salieron ${numero(s.salieron)}, entraron ${numero(s.entraron)}`}</title>
              {h > 0 && (
                <rect className="crece" data-i={i} x={cx - ancho / 2} y={base - h} width={ancho} height={h} rx={4}
                      style={{ fill: "var(--dato)" }} />
              )}
              <text x={cx} y={base - h - 7} textAnchor="middle" className="num"
                    style={{ fill: "var(--ink)", fontSize: pico ? 14 : 11, fontWeight: pico ? 700 : 500 }}>
                {numero(s.salieron)}
              </text>
              <text x={cx} y={H - 10} textAnchor="middle"
                    style={{ fill: pico ? "var(--ink)" : "var(--muted)", fontSize: 11, fontWeight: pico ? 600 : 400 }}>
                {fecha(s.fecha).replace(/ \d{4}$/, "")}
              </text>
            </g>
          );
        })}
      </svg>
    </Figura>
  );
}

/** Porcentaje retirado por año de firma (Gobernación). */
export function BarrasPorAnio({ filas }: { filas: { anio: number; publicados: number; retirados: number }[] }) {
  const W = 640, H = 220, M = { t: 26, r: 8, b: 28, l: 8 };
  const datos = filas.filter((f) => f.publicados > 0).map((f) => ({ ...f, pct: f.retirados / f.publicados }));
  const max = Math.max(...datos.map((d) => d.pct), 0.01);
  const paso = (W - M.l - M.r) / datos.length;
  const ancho = Math.min(44, paso * 0.56);
  const base = H - M.b;
  return (
    <Figura titulo="Contratos de la Gobernación retirados, por año de firma"
            nota="Porcentaje retirado sobre los contratos de cada año publicados en SECOP II el 5 de octubre de 2026">
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
           aria-label={datos.map((d) => `${d.anio}: ${pct1(d.pct)}`).join(", ")}>
        <line x1={M.l} x2={W - M.r} y1={base} y2={base} style={{ stroke: "var(--line)" }} />
        {datos.map((d, i) => {
          const cx = M.l + paso * i + paso / 2;
          const h = Math.max(2, (d.pct / max) * (base - M.t));
          return (
            <g key={d.anio}>
              <title>{`${d.anio}: ${numero(d.retirados)} retirados de ${numero(d.publicados)} (${pct1(d.pct)})`}</title>
              <rect className="crece" data-i={i} x={cx - ancho / 2} y={base - h} width={ancho} height={h} rx={4}
                    style={{ fill: "var(--dato)" }} />
              <text x={cx} y={base - h - 7} textAnchor="middle" className="num"
                    style={{ fill: "var(--ink)", fontSize: 12, fontWeight: 600 }}>{pct1(d.pct)}</text>
              <text x={cx} y={H - 8} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 11 }}>{d.anio}</text>
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer" style={{ color: "var(--muted)" }}>Ver como tabla</summary>
        <table className="num mt-2 w-full">
          <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
            <th className="py-1 font-medium">Año</th><th className="py-1 text-right font-medium">Publicados</th>
            <th className="py-1 text-right font-medium">Retirados</th><th className="py-1 text-right font-medium">%</th>
          </tr></thead>
          <tbody>{datos.map((d) => (
            <tr key={d.anio} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
              <td className="py-1">{d.anio}</td><td className="py-1 text-right">{numero(d.publicados)}</td>
              <td className="py-1 text-right">{numero(d.retirados)}</td><td className="py-1 text-right">{pct1(d.pct)}</td>
            </tr>))}
          </tbody>
        </table>
      </details>
    </Figura>
  );
}

export interface TipoPeriodo { tipo: string; n: number; valor: number; marcados_n: number; marcados_valor: number }

/**
 * Cada tipo de contrato en dos columnas: su parte del número de contratos y su
 * parte del dinero. La diferencia entre las dos es la historia.
 */
export function RepartoPorTipo({ tipos, total, totalValor }: { tipos: TipoPeriodo[]; total: number; totalValor: number }) {
  const PRINCIPALES = 6;
  const filas = [...tipos.slice(0, PRINCIPALES)];
  const resto = tipos.slice(PRINCIPALES);
  if (resto.length) {
    filas.push(resto.reduce((a, t) => ({ ...a, n: a.n + t.n, valor: a.valor + t.valor,
      marcados_n: a.marcados_n + t.marcados_n, marcados_valor: a.marcados_valor + t.marcados_valor }),
      { tipo: `Otros ${resto.length} tipos`, n: 0, valor: 0, marcados_n: 0, marcados_valor: 0 }));
  }
  return (
    <Figura titulo="Cómo se repartió la contratación de la Gobernación, 2024–2026"
            nota={`${numero(total)} contratos por ${copCorto(totalValor)}. Firmados desde enero de 2024, según la copia del 5 de octubre de 2026.`}>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              <th className="pb-2 pr-3 font-medium">Tipo</th>
              <th className="w-[30%] pb-2 pr-3 font-medium">Parte de los contratos</th>
              <th className="w-[30%] pb-2 pr-3 font-medium">Parte del dinero</th>
              <th className="pb-2 text-right font-medium">Retirado del SECOP</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((t, i) => {
              const pn = t.n / total, pv = t.valor / totalValor;
              return (
                <tr key={t.tipo} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-2.5 pr-3 font-medium">{t.tipo}
                    <div className="num text-[10px] font-normal" style={{ color: "var(--muted)" }}>
                      {numero(t.n)} · {copCorto(t.valor)}
                    </div>
                  </td>
                  {[pn, pv].map((p, k) => (
                    <td key={k} className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--line-soft)" }}>
                          <div className="crece-h h-full rounded-full" data-i={i}
                               style={{ width: `${Math.max(p * 100, 0.6)}%`, background: "var(--dato)" }} />
                        </div>
                        <span className="num w-11 text-right">{pct1(p)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="num py-2.5 text-right">
                    {t.marcados_n ? (
                      <span><strong>{pct1(t.marcados_valor / t.valor)}</strong> del valor
                        <span className="block text-[10px]" style={{ color: "var(--muted)" }}>{numero(t.marcados_n)} contratos</span>
                      </span>
                    ) : <span style={{ color: "var(--muted)" }}>nada</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Figura>
  );
}

export interface FilaRanking { nombre: string; documento: string; n: number; valor: number; tipo_principal: string; marcados: number }

/** Ranking de contratistas con barra proporcional a la métrica elegida. */
export function Ranking({ titulo, nota, filas, por }: { titulo: string; nota?: string; filas: FilaRanking[]; por: "valor" | "n" }) {
  const max = Math.max(...filas.map((f) => (por === "valor" ? f.valor : f.n)), 1);
  return (
    <Figura titulo={titulo} nota={nota}>
      <ol className="mt-4 space-y-3">
        {filas.map((f, i) => {
          const m = por === "valor" ? f.valor : f.n;
          return (
            <li key={`${f.nombre}-${i}`} className="grid grid-cols-[1.5rem_1fr] gap-x-2">
              <span className="num pt-0.5 text-xs" style={{ color: "var(--muted)" }}>{i + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="truncate text-sm font-medium">{f.nombre}</span>
                  <span className="num shrink-0 text-sm font-semibold">
                    {por === "valor" ? copCorto(f.valor) : `${numero(f.n)} contratos`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--line-soft)" }}>
                  <div className="crece-h h-full rounded-full" data-i={i}
                       style={{ width: `${(m / max) * 100}%`, background: "var(--dato)" }} />
                </div>
                <div className="num mt-1 flex flex-wrap gap-x-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <span>{f.tipo_principal}</span><span>·</span>
                  <span>{por === "valor" ? `${numero(f.n)} contratos` : copCorto(f.valor)}</span>
                  {f.marcados > 0 && (<><span>·</span>
                    <span style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{numero(f.marcados)} retirados del SECOP</span></>)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Figura>
  );
}

/* ---------------------------------------------------------------- Ley de Garantías */

/** Leyenda de dos marcas: años con elección presidencial y años sin ella. */
function LeyendaElectoral() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--muted)" }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--dato)" }} /> Año de elección presidencial
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ink-soft)", opacity: 0.35 }} /> Año sin elección presidencial
      </span>
    </div>
  );
}

export interface FilaCorte { anio: number; electoral: boolean; corte: string; n: number; n_anio: number; pct_n: number; pct_valor: number; anio_completo: boolean }

/** Parte de la contratación directa del año firmada antes del corte de enero. */
export function BarrasCorte({ filas }: { filas: FilaCorte[] }) {
  const W = 640, H = 230, M = { t: 26, r: 8, b: 40, l: 8 };
  const paso = (W - M.l - M.r) / filas.length;
  const ancho = Math.min(40, paso * 0.58);
  const base = H - M.b;
  return (
    <Figura titulo="Contratación directa del año firmada antes del corte de enero"
            nota="Gobernación. Corte: el día en que empieza la Ley de Garantías en años de elección presidencial; el 28 de enero en los demás.">
      <LeyendaElectoral />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
           aria-label={filas.map((f) => `${f.anio}: ${pct1(f.pct_n)}`).join(", ")}>
        <line x1={M.l} x2={W - M.r} y1={base} y2={base} style={{ stroke: "var(--line)" }} />
        {filas.map((f, i) => {
          const cx = M.l + paso * i + paso / 2;
          const h = Math.max(2, f.pct_n * (base - M.t));
          return (
            <g key={f.anio}>
              <title>{`${f.anio}: ${numero(f.n)} de ${numero(f.n_anio)} contratos directos (${pct1(f.pct_n)}) firmados antes del ${fecha(f.corte)}`}</title>
              <rect className="crece" data-i={i} x={cx - ancho / 2} y={base - h} width={ancho} height={h} rx={4}
                    style={f.electoral ? { fill: "var(--dato)" } : { fill: "var(--ink-soft)", opacity: 0.35 }} />
              <text x={cx} y={base - h - 7} textAnchor="middle" className="num"
                    style={{ fill: "var(--ink)", fontSize: f.electoral ? 13 : 11, fontWeight: f.electoral ? 700 : 500 }}>
                {pct1(f.pct_n)}
              </text>
              <text x={cx} y={base + 16} textAnchor="middle" style={{ fill: "var(--ink-soft)", fontSize: 11 }}>{f.anio}</text>
              {!f.anio_completo && (
                <text x={cx} y={base + 30} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 9 }}>en curso</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer" style={{ color: "var(--muted)" }}>Ver como tabla</summary>
        <table className="num mt-2 w-full">
          <thead><tr className="text-left" style={{ color: "var(--muted)" }}>
            <th className="py-1 font-medium">Año</th><th className="py-1 font-medium">Corte</th>
            <th className="py-1 text-right font-medium">Antes del corte</th><th className="py-1 text-right font-medium">Del año</th>
            <th className="py-1 text-right font-medium">% contratos</th><th className="py-1 text-right font-medium">% valor</th>
          </tr></thead>
          <tbody>{filas.map((f) => (
            <tr key={f.anio} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
              <td className="py-1">{f.anio}{f.electoral ? " · elección" : ""}</td><td className="py-1">{fecha(f.corte)}</td>
              <td className="py-1 text-right">{numero(f.n)}</td><td className="py-1 text-right">{numero(f.n_anio)}</td>
              <td className="py-1 text-right">{pct1(f.pct_n)}</td><td className="py-1 text-right">{pct1(f.pct_valor)}</td>
            </tr>))}
          </tbody>
        </table>
      </details>
    </Figura>
  );
}

export interface SerieDiaria { anio: string; corte: string; electoral: boolean; dias: { fecha: string; n: number }[] }

/**
 * Contratos directos firmados por día alrededor del corte, un panel por año y
 * todos con la misma escala vertical, para que se puedan comparar a ojo.
 */
export function SeriesDiarias({ series }: { series: SerieDiaria[] }) {
  const W = 460, H = 110, M = { t: 18, r: 6, b: 18, l: 6 };
  const max = Math.max(...series.flatMap((s) => s.dias.map((d) => d.n)), 1);
  return (
    <Figura titulo="Contratos directos firmados cada día, del 15 de diciembre al 28 de febrero"
            nota={`Gobernación. Misma escala en todos los paneles (máximo: ${numero(max)} contratos en un día). La línea marca el corte; el total cuenta desde el 15 de diciembre.`}>
      <div className="mt-3 space-y-4">
        {series.map((s, k) => {
          const paso = (W - M.l - M.r) / s.dias.length;
          const base = H - M.b;
          const iCorte = s.dias.findIndex((d) => d.fecha >= s.corte);
          const xCorte = M.l + paso * iCorte;
          const pico = s.dias.reduce((a, d) => (d.n > a.n ? d : a), s.dias[0]);
          const iPico = s.dias.indexOf(pico);
          const meses = s.dias.map((d, i) => ({ d, i })).filter(({ d }) => d.fecha.endsWith("-01"));
          return (
            <div key={s.anio}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                <span className="font-semibold">{s.anio} · {s.electoral ? "elección presidencial" : "sin elección (control)"}</span>
                <span className="num" style={{ color: "var(--muted)" }}>
                  {numero(s.dias.filter((d) => d.fecha < s.corte).reduce((a, d) => a + d.n, 0))} antes del corte
                </span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
                   aria-label={`${s.anio}: máximo de ${numero(pico.n)} contratos el ${fecha(pico.fecha)}`}>
                <line x1={M.l} x2={W - M.r} y1={base} y2={base} style={{ stroke: "var(--line)" }} />
                {s.dias.map((d, i) => {
                  const h = d.n ? Math.max(1.5, (d.n / max) * (base - M.t)) : 0;
                  return h > 0 && (
                    <rect key={d.fecha} className="crece" data-i={k} x={M.l + paso * i + 0.5} y={base - h}
                          width={Math.max(1, paso - 1)} height={h} rx={1}
                          style={s.electoral ? { fill: "var(--dato)" } : { fill: "var(--ink-soft)", opacity: 0.35 }}>
                      <title>{`${fecha(d.fecha)}: ${numero(d.n)} contratos`}</title>
                    </rect>
                  );
                })}
                <line x1={xCorte} x2={xCorte} y1={M.t - 8} y2={base} strokeDasharray="3 3" style={{ stroke: "var(--ink)" }} />
                <text x={xCorte + 4} y={M.t - 2} style={{ fill: "var(--ink)", fontSize: 10 }}>
                  {s.electoral ? `Ley de Garantías · ${fecha(s.corte).replace(/ \d{4}$/, "")}` : "28 ene"}
                </text>
                {pico.n > 0 && s.electoral && (
                  <text x={M.l + paso * iPico - 3} y={base - (pico.n / max) * (base - M.t) + 3} textAnchor="end"
                        className="num" style={{ fill: "var(--ink)", fontSize: 10, fontWeight: 600 }}>
                    {numero(pico.n)}
                  </text>
                )}
                {meses.map(({ d, i }) => (
                  <text key={d.fecha} x={M.l + paso * i} y={H - 5} style={{ fill: "var(--muted)", fontSize: 10 }}>
                    {["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(d.fecha.slice(5, 7)) - 1]}
                  </text>
                ))}
              </svg>
            </div>
          );
        })}
      </div>
    </Figura>
  );
}

/**
 * Mes en que terminan los contratos de servicios, año por año. Celda más
 * intensa = más contratos terminan ese mes. Una sola tinta, de claro a oscuro.
 */
export function CalorFin({ filas, elecciones }: {
  filas: { anio: number; meses: number[] }[];
  /** año → meses (1-12) con votación, para marcarlos */
  elecciones: Record<number, number[]>;
}) {
  const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const max = Math.max(...filas.flatMap((f) => f.meses), 0.01);
  return (
    <Figura titulo="¿En qué mes terminan los contratos de servicios?"
            nota="Gobernación, contratación directa. Cada fila suma 100%. El borde marca los meses con elecciones.">
      <div className="mt-4 overflow-x-auto">
        <table className="num w-full table-fixed border-separate text-[10px] sm:text-[11px]" style={{ borderSpacing: 2 }}>
          <thead><tr>
            <th className="w-12 sm:w-16" />
            {MESES.map((m, i) => <th key={i} className="font-medium" style={{ color: "var(--muted)" }}>{m}</th>)}
          </tr></thead>
          <tbody>{filas.map((f, k) => (
            <tr key={f.anio} className="rv" data-i={k}>
              <th className="whitespace-nowrap pr-1 text-left font-medium" style={{ color: "var(--ink-soft)" }}>
                {f.anio}{elecciones[f.anio] ? " •" : ""}
              </th>
              {f.meses.map((p, i) => {
                const voto = elecciones[f.anio]?.includes(i + 1);
                return (
                  <td key={i} title={`${f.anio}, mes ${i + 1}: ${pct1(p)}`}
                      className="h-7 rounded text-center align-middle sm:h-8 sm:rounded-md"
                      style={{ background: `color-mix(in srgb, var(--dato) ${Math.round((p / max) * 100)}%, var(--line-soft))`,
                               color: p / max > 0.55 ? "#fff" : "var(--ink-soft)",
                               outline: voto ? "2px solid var(--ink)" : undefined, outlineOffset: -2 }}>
                    {p >= 0.1 ? Math.round(p * 100) : ""}
                  </td>
                );
              })}
            </tr>))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
        Números en las celdas con 10% o más. • = año con elección presidencial o territorial.
      </p>
    </Figura>
  );
}
