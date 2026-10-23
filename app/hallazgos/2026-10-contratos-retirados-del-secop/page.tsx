import Link from "next/link";
import { leerDatos } from "@/lib/estaticos";
import { copCorto, fecha, numero, secopUrl } from "@/lib/format";
import { HALLAZGOS } from "@/lib/hallazgos";
import Articulo, { Cifra, Destacado, P, Seccion } from "@/components/hallazgos/Articulo";
import {
  BarrasPorAnio, GraficoSemanas, Ranking, RepartoPorTipo, type FilaRanking, type TipoPeriodo,
} from "@/components/hallazgos/Graficos";
import TablaRetirados from "@/components/hallazgos/TablaRetirados";
import { Nota } from "@/components/ui";

const SLUG = "2026-10-contratos-retirados-del-secop";
const EVIDENCIA = "hallazgos/2026-10-retiro-secop.json";
const PERIODO = "hallazgos/2026-10-retiro-secop-periodo.json";
const nota = HALLAZGOS.find((h) => h.slug === SLUG)!;

export const metadata = { title: nota.titulo, description: nota.resumen };

interface Evidencia {
  ultima_vez_visto: string; detectado: string; verificado: string; fuente: string;
  verificacion: {
    consultados_por_id: number; siguen_en_el_dataset: number;
    control: { consultados: number; encontrados: number; descripcion: string };
  };
  semanas: { fecha: string; publicados: number; entraron: number; salieron: number }[];
  gobernacion_por_anio: { anio: number; publicados: number; retirados: number }[];
  por_entidad: { entidad: string; retirados: number; publicados_antes: number; valor: number }[];
  contratos: { valor: number; firma: string; estado: string; tipo: string; modalidad: string;
               documento: string; entidad: string }[];
}

interface Periodo {
  desde: string; hasta: string; contratos: number; valor: number; contratistas: number;
  marcados: { n: number; valor: number };
  por_tipo: TipoPeriodo[];
  top_por_numero: FilaRanking[]; top_por_valor: FilaRanking[]; concentracion_top: number;
  sin_documento: { n: number; valor: number };
  obras: { id: string; proveedor: string; valor: number; firma: string; estado: string; objeto: string; enlace: string }[];
}

const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1).replace(".", ",")}%`;
const millones = (v: number) => `$${numero(Math.round(v / 1e6))} millones`;

export default async function Nota2026Oct() {
  const [d, per] = await Promise.all([leerDatos<Evidencia>(EVIDENCIA), leerDatos<Periodo>(PERIODO)]);
  const cs = d.contratos;
  const total = cs.reduce((s, c) => s + c.valor, 0);
  const gob = d.por_entidad.find((e) => e.entidad === "Gobernación del Archipiélago")!;
  const cor = d.por_entidad.find((e) => e.entidad === "CORALINA")!;
  const otras = d.por_entidad.filter((e) => e !== gob && e !== cor);
  const desde2024 = cs.filter((c) => c.firma >= "2024-01-01").length;
  const enEjecucion = cs.filter((c) => c.estado === "En ejecución").length;
  const cerradosOTerminados = cs.filter((c) => c.estado === "Cerrado" || c.estado === "terminado").length;
  const servicios = cs.filter((c) => c.tipo === "Prestación de servicios").length;
  const directa = cs.filter((c) => /directa/i.test(c.modalidad)).length;
  const porContratista = new Map<string, number>();
  for (const c of cs) porContratista.set(c.documento, (porContratista.get(c.documento) ?? 0) + 1);
  const corPorAnio = new Map<string, number>();
  for (const c of cs) if (c.entidad === "CORALINA") corPorAnio.set(c.firma.slice(0, 4), (corPorAnio.get(c.firma.slice(0, 4)) ?? 0) + 1);
  const gobReciente = d.gobernacion_por_anio.filter((g) => g.anio >= 2024);
  const v = d.verificacion;

  const tServ = per.por_tipo.find((t) => t.tipo === "Prestación de servicios")!;
  const tObra = per.por_tipo.find((t) => t.tipo === "Obra");
  const noServicios = per.por_tipo.filter((t) => t.tipo !== "Prestación de servicios");
  const retiradosNoServicios = noServicios.reduce((s, t) => s + t.marcados_n, 0);
  const topValorConRetiros = per.top_por_valor.filter((f) => f.marcados > 0).length;

  return (
    <Articulo titulo={nota.titulo} fechaPub={nota.fecha} resumen={nota.resumen} etiquetas={nota.etiquetas}
      cifras={<>
        <Cifra i={4} valor={numero(cs.length)} etiqueta="contratos retirados" conteo={{ n: cs.length, fmt: "entero" }} />
        <Cifra i={5} valor={copCorto(total)} etiqueta="valor contratado" conteo={{ n: total / 1e9, fmt: "mmm" }} />
        <Cifra i={6} valor={numero(gob.retirados)} etiqueta="de la Gobernación" conteo={{ n: gob.retirados, fmt: "entero" }} />
        <Cifra i={7} valor={pct(desde2024, cs.length)} etiqueta="firmados desde 2024"
               conteo={{ n: (desde2024 / cs.length) * 100, fmt: "pct" }} />
      </>}>

      <P>
        Los contratos estaban publicados en el conjunto de datos abiertos de SECOP II el{" "}
        {fecha(d.ultima_vez_visto)} y ya no estaban el {fecha(d.detectado)}. Suman{" "}
        <strong>{millones(total)}</strong>. De ellos, {numero(gob.retirados)} eran de la Gobernación
        del Archipiélago y {numero(cor.retirados)} de CORALINA; los{" "}
        {numero(otras.reduce((s, e) => s + e.retirados, 0))} restantes se reparten entre{" "}
        {otras.length} entidades. A la fecha de esta nota ({fecha(d.verificado)}) siguen sin aparecer.
      </P>

      <Seccion antetitulo="El hallazgo" titulo="Cómo lo detectamos">
        <P>
          WiSii descarga cada lunes la contratación del departamento desde datos.gov.co y guarda una
          copia. Al comparar una semana con la anterior se ve qué contratos entraron y cuáles
          salieron. En una semana normal no sale ninguno, o sale uno. El {fecha(d.detectado)}{" "}
          salieron {numero(cs.length)} de golpe.
        </P>
        <GraficoSemanas semanas={d.semanas} detectado={d.detectado} />
      </Seccion>

      <Seccion antetitulo="Los contratos retirados" titulo="Qué contratos eran">
        <P>
          Casi todos son del mismo tipo: {numero(servicios)} son de prestación de servicios y{" "}
          {numero(directa)} se adjudicaron por contratación directa. Pertenecen a{" "}
          {numero(porContratista.size)} contratistas distintos, y ninguno tiene más de{" "}
          {Math.max(...porContratista.values())} de esos contratos.
        </P>
        <P>
          Lo que más llama la atención es cuándo se firmaron. En la Gobernación se retiró cerca de uno
          de cada cinco contratos firmados en 2024, 2025 y 2026 (
          {gobReciente.map((g) => `${pct(g.retirados, g.publicados)} en ${g.anio}`).join(", ")}),
          mientras que entre 2020 y 2022 se retiró menos del 0,5% de cada año. Es decir, el retiro se
          concentra en contratos firmados dentro del{" "}
          <Link href="/contratos?gob=2024-2027&desde=2024-01-01&hasta=2027-12-31&entidad=Gobernaci%C3%B3n+del+Archipi%C3%A9lago"
                className="underline underline-offset-2">período constitucional 2024–2027</Link>.
          En CORALINA pasa algo parecido: {numero(corPorAnio.get("2024") ?? 0)} de sus{" "}
          {numero(cor.retirados)} contratos retirados se firmaron en 2024.
        </P>
        <BarrasPorAnio filas={d.gobernacion_por_anio} />
        <P>
          No eran solo contratos ya terminados. Al {fecha(d.ultima_vez_visto)},{" "}
          {numero(cerradosOTerminados)} figuraban como cerrados o terminados, pero{" "}
          {numero(enEjecucion)} seguían «En ejecución». Entre los retirados hay algo menos de contratos
          en ejecución que entre los del mismo período que siguen publicados, pero el retiro abarcó
          contratos en todos los estados.
        </P>
      </Seccion>

      <Seccion antetitulo="El período 2024–2026" titulo="En qué gastó la Gobernación">
        <P>
          Para entender qué parte de la contratación tocó el retiro, miramos todo lo que la
          Gobernación firmó desde enero de 2024 según la copia del {fecha(d.ultima_vez_visto)}:{" "}
          {numero(per.contratos)} contratos por {millones(per.valor)}, con{" "}
          {numero(per.contratistas)} contratistas distintos.
        </P>
        <Destacado cifra={pct(tServ.n, per.contratos)}>
          de los contratos del período son de <strong>prestación de servicios</strong>, pero se llevan
          solo el {pct(tServ.valor, per.valor)} del dinero. Son muchos contratos pequeños: la mitad de
          los retirados valía menos de {millones([...cs].sort((a, b) => a.valor - b.valor)[Math.floor(cs.length / 2)].valor)}.
        </Destacado>
        <RepartoPorTipo tipos={per.por_tipo} total={per.contratos} totalValor={per.valor} />
        {tObra && (
          <Destacado cifra={pct(tObra.valor, per.valor)}>
            del dinero se fue en apenas <strong>{numero(tObra.n)} contratos de obra</strong>, por{" "}
            {millones(tObra.valor)}. Ninguno de ellos se retiró del SECOP.
          </Destacado>
        )}
        <P>
          El retiro se concentró casi por completo en los contratos de servicios: se llevó el{" "}
          {pct(tServ.marcados_valor, tServ.valor)} de su valor. De todos los demás tipos —obras,
          suministros, compraventas, interventorías— salieron apenas {numero(retiradosNoServicios)}{" "}
          contratos.
        </P>
      </Seccion>

      {per.obras.length > 0 && (
        <Seccion antetitulo="El período 2024–2026" titulo="Las obras más grandes">
          <P>
            Las {numero(per.obras.length)} obras del período siguen publicadas. Estas son las de mayor valor.
          </P>
          <div className="grid gap-3 sm:grid-cols-2">
            {per.obras.slice(0, 6).map((o, i) => {
              const url = secopUrl("SECOP II", o.enlace);
              return (
                <div key={o.id} className="rv tarjeta flex flex-col rounded-xl border p-4" data-i={i}
                     style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                  <div className="num text-xl font-semibold">{copCorto(o.valor)}</div>
                  <div className="mt-1 text-sm font-medium">{o.proveedor}</div>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-snug" style={{ color: "var(--ink-soft)" }}>
                    {o.objeto}
                  </p>
                  <div className="num mt-3 flex flex-wrap gap-x-2 text-[11px]" style={{ color: "var(--muted)" }}>
                    <span>firmado {fecha(o.firma)}</span><span>·</span><span>{o.estado}</span>
                    {url && (<><span>·</span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">SECOP ↗</a></>)}
                  </div>
                </div>
              );
            })}
          </div>
        </Seccion>
      )}

      <Seccion antetitulo="El período 2024–2026" titulo="Los principales contratistas">
        <P>
          Los diez contratistas que más dinero recibieron concentran el {pct(per.concentracion_top, 1)}{" "}
          de lo contratado en el período.{" "}
          {topValorConRetiros === 0
            ? "Ninguno de ellos tuvo contratos retirados del SECOP."
            : `${topValorConRetiros} de ellos tuvo contratos retirados del SECOP.`}{" "}
          Las listas incluyen personas naturales: casi todos los contratos de la Gobernación son
          de prestación de servicios con personas, y el SECOP publica su nombre como información
          pública. Aparecer en ellas solo indica volumen de contratación, no una irregularidad.
        </P>
        <Ranking titulo="Por valor contratado" por="valor" filas={per.top_por_valor}
                 nota="Gobernación, contratos firmados desde enero de 2024" />
        <Ranking titulo="Por número de contratos" por="n" filas={per.top_por_numero}
                 nota="Gobernación, contratos firmados desde enero de 2024" />
        <P>
          Un dato de calidad: {numero(per.sin_documento.n)} contratos del período, por{" "}
          {millones(per.sin_documento.valor)}, figuran sin documento del contratista. Son en su
          mayoría consorcios y uniones temporales, que el SECOP publica sin un NIT propio. En estos
          rankings se agrupan por nombre.
        </P>
      </Seccion>

      <Seccion antetitulo="Verificación" titulo="Qué comprobamos">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { t: "Fueron retirados, no modificados",
              d: `Consultamos los ${numero(v.consultados_por_id)} contratos por su número, sin filtros: ${v.siguen_en_el_dataset === 0 ? "ninguno existe ya" : `solo ${numero(v.siguen_en_el_dataset)} existen`} en el conjunto de datos. Como control, ${v.control.descripcion} aparecieron ${v.control.encontrados} de ${v.control.consultados}.` },
            { t: "No son duplicados depurados",
              d: "Ninguno tiene un gemelo publicado con el mismo contratista, valor y fecha de firma, y ninguno tenía un registro idéntico antes del retiro." },
            { t: "SECOP I no se vio afectado",
              d: "La misma semana no salió ningún contrato del sistema anterior." },
            { t: "Las fichas originales no se pudieron revisar",
              d: "El portal del SECOP exige resolver un captcha. Cada contrato de la lista enlaza a su ficha para que cualquiera pueda comprobarlo." },
          ].map((x, i) => (
            <div key={x.t} className="rv tarjeta rounded-xl border p-4" data-i={i}
                 style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <h3 className="text-sm font-semibold">{x.t}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{x.d}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion antetitulo="Lo pendiente" titulo="Lo que no sabemos">
        <P>
          No sabemos por qué se retiraron. Los datos abiertos no registran cuándo ni por qué desaparece
          un registro. Hay explicaciones posibles —corrección de contratos cargados con errores,
          anulaciones, cambios en cómo el sistema publica la información o una falla técnica—, pero no
          encontramos evidencia de ninguna en particular.
        </P>
        <P>
          Quienes pueden explicarlo son las entidades contratantes y Colombia Compra Eficiente, que
          administra el SECOP. Cualquier persona puede preguntarles mediante un derecho de petición
          (Ley 1755 de 2015). Si alguna entidad da una explicación, la agregaremos a esta nota.
        </P>
        <div className="rv">
          <Nota>
            El explorador de WiSii reproduce los datos oficiales, así que en su próxima actualización
            dejará de mostrar estos contratos. Esta lista los conserva tal como estaban publicados el{" "}
            {fecha(d.ultima_vez_visto)}.
          </Nota>
        </div>
      </Seccion>

      <Seccion antetitulo="La evidencia" titulo={`Los ${numero(cs.length)} contratos`}>
        <div className="rv"><TablaRetirados archivo={`/data/${EVIDENCIA}`} /></div>
      </Seccion>

      <Seccion titulo="Datos y método">
        <P>
          Fuente: {d.fuente}. Se compararon las copias semanales que WiSii guarda del conjunto de datos,
          filtrado por el departamento de San Andrés, Providencia y Santa Catalina y por contratos con
          fecha de firma. Los nombres de entidad están unificados como en el resto del sitio, y los
          contratistas se agrupan por documento o, si no tienen uno válido, por nombre. Se pueden
          descargar <a href={`/data/${EVIDENCIA}`} className="underline underline-offset-2">la lista de
          contratos retirados</a> y <a href={`/data/${PERIODO}`} className="underline underline-offset-2">el
          análisis del período</a> en JSON.
        </P>
      </Seccion>
    </Articulo>
  );
}
