import Link from "next/link";
import { leerDatos } from "@/lib/estaticos";
import { copCorto, fecha, numero } from "@/lib/format";
import { HALLAZGOS } from "@/lib/hallazgos";
import Articulo, { Cifra, Destacado, P, Seccion } from "@/components/hallazgos/Articulo";
import { BarrasCorte, CalorFin, SeriesDiarias, type FilaCorte, type SerieDiaria } from "@/components/hallazgos/Graficos";
import TablaRetirados from "@/components/hallazgos/TablaRetirados";
import { Nota } from "@/components/ui";

const SLUG = "2026-10-ley-de-garantias";
const EVIDENCIA = "hallazgos/2026-10-ley-de-garantias.json";
const nota = HALLAZGOS.find((h) => h.slug === SLUG)!;

export const metadata = { title: nota.titulo, description: nota.resumen };

interface Evidencia {
  generado: string; entidad: string; directa_min: number;
  restricciones: { eleccion: string; inicio: string; fin: string }[];
  corte: FilaCorte[];
  diarias: SerieDiaria[];
  dentro: { eleccion: string; n: number; valor: number; con_palabras_de_excepcion: number; dias: { fecha: string; n: number }[] }[];
  fin_por_mes: { anio: number; meses: number[] }[];
  dias_pico: { fecha: string; n: number; valor: number }[];
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
/** meses con votación presidencial (primera y segunda vuelta) o territorial */
const ELECCIONES: Record<number, number[]> = { 2018: [5, 6], 2019: [10], 2022: [5, 6], 2023: [10], 2026: [5, 6] };

export default async function NotaGarantias() {
  const d = await leerDatos<Evidencia>(EVIDENCIA);
  const anio = (a: number) => d.corte.find((c) => c.anio === a)!;
  const electorales = d.corte.filter((c) => c.electoral);
  const otros = d.corte.filter((c) => !c.electoral);
  const maxOtros = Math.max(...otros.map((c) => c.pct_n));
  const sinNinguno = otros.filter((c) => c.n === 0 && c.anio >= 2020).map((c) => c.anio);
  const pico = d.dias_pico[0];
  const d22 = d.dentro.find((x) => x.eleccion === "2022")!;
  const d26 = d.dentro.find((x) => x.eleccion === "2026")!;
  const d18 = d.dentro.find((x) => x.eleccion === "2018")!;
  const r22 = d.restricciones.find((r) => r.eleccion === "2022")!;
  const r26 = d.restricciones.find((r) => r.eleccion === "2026")!;
  const fin = (a: number, meses: number[]) =>
    meses.reduce((s, m) => s + (d.fin_por_mes.find((f) => f.anio === a)?.meses[m - 1] ?? 0), 0);
  const total = d.dentro.reduce((s, x) => s + x.n, 0);
  // últimos cinco días antes del corte de 2026, y las mismas fechas en el año de control
  const s26 = d.diarias.find((s) => s.anio === "2026")!;
  const ult26 = s26.dias.filter((x) => x.fecha < s26.corte).slice(-5);
  const control = d.diarias.find((s) => !s.electoral)!;
  const mismas = control.dias.filter((x) => ult26.some((u) => u.fecha.slice(5) === x.fecha.slice(5)));
  const enControl = mismas.reduce((a, x) => a + x.n, 0);

  return (
    <Articulo titulo={nota.titulo} fechaPub={nota.fecha} resumen={nota.resumen} etiquetas={nota.etiquetas}
      cifras={<>
        <Cifra i={4} valor={pct(anio(2026).pct_n)} etiqueta="de la contratación directa de 2026, firmada antes del 31 de enero"
               conteo={{ n: anio(2026).pct_n * 100, fmt: "pct" }} />
        <Cifra i={5} valor={`≤${pct(maxOtros)}`} etiqueta="lo usual en años sin elección presidencial" />
        <Cifra i={6} valor={numero(pico.n)} etiqueta={`contratos en un solo día: ${fecha(pico.fecha)}`}
               conteo={{ n: pico.n, fmt: "entero" }} />
        <Cifra i={7} valor={numero(d22.n)} etiqueta="contratos directos firmados con la restricción de 2022 vigente"
               conteo={{ n: d22.n, fmt: "entero" }} />
      </>}>

      <P>
        Cada cuatro años, antes de la elección presidencial, la Ley de Garantías prohíbe a todas las
        entidades públicas contratar de forma directa. En la Gobernación del Archipiélago, donde casi
        todos los contratos son directos, eso tiene un efecto visible en los datos: en los años de
        elección presidencial, buena parte de la contratación del año se firma en enero, en los días
        previos a la prohibición. En los demás años, enero es un mes casi vacío.
      </P>
      <P>
        El patrón se repite en las tres elecciones con datos —2018, 2022 y 2026—, bajo tres gobiernos
        departamentales distintos. Firmar antes de que empiece la restricción es legal. Lo que los datos
        también muestran, y no tiene una explicación evidente, es que en 2022 se siguieron firmando
        contratos directos cuando la prohibición ya regía.
      </P>

      <Seccion antetitulo="El contexto" titulo="Qué prohíbe la Ley de Garantías">
        <P>
          La Ley 996 de 2005 busca que quien gobierna no use la contratación pública a favor de una
          campaña. Su artículo 33 prohíbe la contratación directa en todas las entidades del Estado
          durante los cuatro meses anteriores a la elección presidencial y hasta la segunda vuelta. Hay
          excepciones: defensa y seguridad, crédito público, emergencias sanitarias, educativas o por
          desastres, reconstrucción de infraestructura y la contratación de hospitales.
        </P>
        <P>
          En 2022 la restricción fue del {fecha(r22.inicio)} al {fecha(r22.fin)}; en 2026, del{" "}
          {fecha(r26.inicio)} al {fecha(r26.fin)}. La contratación directa no desaparece en esos meses:
          se adelanta. Y como en la Gobernación más del {pct(Math.floor(d.directa_min * 100) / 100)} de los contratos de cada año son directos
          —sobre todo prestación de servicios con personas—, adelantarla significa adelantar casi todo.
        </P>
      </Seccion>

      <Seccion antetitulo="Tres elecciones, el mismo patrón" titulo="Lo que se firma antes del corte">
        <BarrasCorte filas={d.corte} />
        <P>
          En 2018 se firmó antes del corte el {pct(anio(2018).pct_n)} de los contratos directos de todo el
          año ({pct(anio(2018).pct_valor)} del valor). En 2022, el {pct(anio(2022).pct_n)}. En 2026, con el
          año todavía en curso, ya va en {pct(anio(2026).pct_n)}. En los años sin elección presidencial, en
          las mismas semanas de enero, la Gobernación no firmó más del {pct(maxOtros)}
          {sinNinguno.length > 0 && <>: en {sinNinguno.join(", ").replace(/, (\d+)$/, " y $1")}, ninguno</>}.
        </P>
        <Destacado cifra={`${electorales.length} de ${electorales.length}`}>
          elecciones presidenciales con datos muestran el mismo salto. No es la estacionalidad normal de
          enero: en los años sin elección ese mes está prácticamente vacío.
        </Destacado>
      </Seccion>

      <Seccion antetitulo="Día por día" titulo="La última semana antes de la prohibición">
        <SeriesDiarias series={d.diarias} />
        <P>
          La firma se concentra en los últimos días. El {fecha(pico.fecha)} —un día antes de que empezara la
          restricción de 2022— la Gobernación firmó {numero(pico.n)} contratos directos, el día con más
          firmas de todo el registro. En 2026, entre el {fecha(ult26[0].fecha).replace(/ \d{4}$/, "")} y el {fecha(ult26[ult26.length - 1].fecha)} se firmaron cada día entre{" "}
          {numero(Math.min(...ult26.map((x) => x.n)))} y {numero(Math.max(...ult26.map((x) => x.n)))} contratos.
          En el año de control, {control.anio}, en esas mismas fechas se firmaron{" "}
          {enControl ? numero(enControl) : "cero"}.
        </P>
      </Seccion>

      <Seccion antetitulo="La pregunta abierta" titulo="Contratos firmados con la restricción vigente">
        <P>
          Con la prohibición ya en vigor, los datos registran {numero(d22.n)} contratos directos de la
          Gobernación firmados en 2022 —{d22.dias.slice(0, 3).map((x) => `${numero(x.n)} el ${fecha(x.fecha)}`).join(", ")}—
          por {copCorto(d22.valor)}. En 2026 fueron {numero(d26.n)}, y en 2018, {numero(d18.n)}. Casi
          todos son de prestación de servicios con personas naturales.
        </P>
        <P>
          Solo {numero(d22.con_palabras_de_excepcion)} de los {numero(d22.n)} de 2022 mencionan en su objeto
          una emergencia, un desastre, la reconstrucción o la salud, que es donde caben las excepciones de
          la ley. Eso no basta para concluir que se violó la restricción: una excepción puede aplicar aunque
          el objeto no la nombre —Providencia seguía en situación de desastre tras el huracán Iota—, y la
          fecha que publica el SECOP II es la de la firma electrónica, que puede llegar días después de que
          el contrato se acordó. Es una pregunta que la Gobernación puede responder.
        </P>
        <div className="rv">
          <TablaRetirados archivo={`/data/${EVIDENCIA}`} clave="contratos_dentro" detalle="vigencia"
                          etiqueta={`Buscar entre los ${numero(total)} contratos firmados dentro de las restricciones`}
                          filtro={{ campo: "eleccion", todos: `Todas las restricciones (${numero(total)})`, prefijo: "Elección " }} />
        </div>
      </Seccion>

      <Seccion antetitulo="El otro extremo" titulo="Contratos que terminan cuando terminan las elecciones">
        <CalorFin filas={d.fin_por_mes} elecciones={ELECCIONES} />
        <P>
          Los contratos firmados de prisa en enero no cubren el año. En los años sin elecciones, los
          contratos de servicios terminan casi siempre entre octubre y diciembre. En los años electorales
          terminan alrededor de la votación: en 2018, el {pct(fin(2018, [6, 7]))} terminó en junio o julio;
          en 2022, el {pct(fin(2022, [6, 7]))}; en 2026, el {pct(fin(2026, [5, 6]))} en mayo o junio. En 2023,
          año de elecciones territoriales, el {pct(fin(2023, [11]))} terminó en noviembre, justo después de
          votar el 29 de octubre.
        </P>
        <P>
          Es decir, en los años electorales los contratos se firman justo antes de la restricción, cubren
          los meses de campaña y terminan con la votación. Los datos muestran la coincidencia con el
          calendario electoral; no dicen por qué ocurre.
        </P>
      </Seccion>

      <Seccion antetitulo="Límites" titulo="Lo que no sabemos">
        <ul className="rv list-disc space-y-2 pl-5 text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          <li>Si los contratos firmados con la restricción vigente están amparados por alguna excepción de la ley.</li>
          <li>Cuándo se acordó cada contrato: el SECOP II publica la fecha de la firma electrónica, no la de la decisión.</li>
          <li>Qué hicieron las personas contratadas ni si sus contratos tienen relación con alguna campaña. Los datos no permiten afirmarlo, y esta nota no lo afirma.</li>
          <li>Si otras entidades del departamento muestran el mismo patrón: esta nota mira solo la Gobernación.</li>
        </ul>
        <Nota>
          Adelantar la contratación antes de la Ley de Garantías es legal y es una práctica conocida en
          todo el país. Aparecer en la lista de contratos no implica ninguna irregularidad del contratista.
        </Nota>
      </Seccion>

      <Seccion antetitulo="Datos y método" titulo="Cómo lo medimos">
        <P>
          Usamos los contratos de la Gobernación publicados en SECOP II y SECOP I hasta el {fecha(d.generado)},
          los mismos que se pueden consultar en el <Link href="/contratos" className="underline underline-offset-2">explorador</Link>.
          Contamos como directos los contratos cuya modalidad es contratación directa. El corte es el día en
          que empieza la restricción en años de elección presidencial y el 28 de enero en los demás, para
          comparar las mismas semanas. La duración y el mes de terminación salen de las fechas de inicio y
          fin publicadas; se descartaron fechas imposibles.
        </P>
        <P>
          <a href={`/data/${EVIDENCIA}`} download className="font-semibold underline underline-offset-2">
            Descargar los datos de esta nota (JSON)
          </a>
          {" "}— incluye la serie diaria, las tablas y los {numero(total)} contratos firmados dentro de las
          restricciones, con su enlace al SECOP.
        </P>
      </Seccion>
    </Articulo>
  );
}
