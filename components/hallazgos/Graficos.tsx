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
