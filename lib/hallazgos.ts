/**
 * Hallazgos: notas sobre eventos de la contratación pública del Archipiélago
 * que vale la pena contar. Cada nota vive en app/hallazgos/<slug>/page.tsx y
 * se registra aquí para aparecer en la pestaña Hallazgos, el índice y la portada.
 *
 * `texto` es el cuerpo de la nota en texto plano: alimenta la búsqueda por
 * contenido de los hallazgos. Al agregar una nota, copiar ahí sus párrafos principales.
 * El orden no importa: se muestran de la más reciente a la más antigua.
 */
export interface Hallazgo {
  slug: string;
  titulo: string;
  /** fecha de publicación de la nota */
  fecha: string;
  resumen: string;
  etiquetas: string[];
  /** cuerpo en texto plano, solo para la búsqueda */
  texto: string;
}

const TODOS: Hallazgo[] = [
  {
    slug: "2026-10-ley-de-garantias",
    titulo: "En años de elección presidencial, la Gobernación firma la contratación del año antes de la Ley de Garantías",
    fecha: "2026-10-24",
    resumen:
      "En 2018, 2022 y 2026 la Gobernación firmó en pocos días de enero entre el 38% y el 72% de su " +
      "contratación directa del año, justo antes de que la ley la prohibiera. En los demás años, enero " +
      "está casi vacío. En 2022 siguió firmando con la restricción vigente.",
    etiquetas: ["Ley de Garantías", "Gobernación", "Contratación directa", "Elecciones"],
    texto:
      "La Ley 996 de 2005, Ley de Garantías, prohíbe la contratación directa en todas las entidades " +
      "públicas durante los cuatro meses anteriores a la elección presidencial y hasta la segunda vuelta. " +
      "En la Gobernación del Archipiélago casi todos los contratos son directos, sobre todo prestación de " +
      "servicios. En 2018 se firmó antes del corte el 55% de los contratos directos del año; en 2022, el " +
      "38%; en 2026, el 72%. En los años sin elección presidencial, en las mismas semanas de enero, no más " +
      "del 6%. El 28 de enero de 2022, un día antes de la restricción, se firmaron 1.013 contratos, el día " +
      "con más firmas del registro. Con la restricción vigente se firmaron 1.276 contratos directos en " +
      "2022, la mayoría el 2 de febrero; solo 31 mencionan emergencias, desastres o salud. Los contratos " +
      "terminan alrededor de las elecciones: en junio y julio en 2018 y 2022, en mayo y junio en 2026, y " +
      "en noviembre en 2023, tras las elecciones territoriales. Adelantar la contratación es legal; los " +
      "datos no permiten afirmar relación con campañas.",
  },
  {
    slug: "2026-10-contratos-retirados-del-secop",
    titulo: "3.158 contratos desaparecieron de los datos abiertos del SECOP en una semana",
    fecha: "2026-10-23",
    resumen:
      "Entre el 5 y el 12 de octubre de 2026 se retiraron del conjunto de datos de SECOP II " +
      "3.158 contratos de entidades del Archipiélago. Casi todos eran de la Gobernación y se " +
      "habían firmado desde 2024.",
    etiquetas: ["SECOP II", "Gobernación", "Datos abiertos"],
    texto:
      "Los contratos estaban publicados en el conjunto de datos abiertos de SECOP II el 5 de " +
      "octubre de 2026 y ya no estaban el 12 de octubre. Suman 68.026 millones de pesos. 2.962 " +
      "eran de la Gobernación del Archipiélago y 165 de CORALINA; el resto, de ICBF, SENA, " +
      "Contraloría Departamental, Policía y Armada. WiSii descarga cada lunes la contratación del " +
      "departamento y compara una semana con la anterior: en una semana normal sale uno o ninguno. " +
      "Casi todos eran contratos de prestación de servicios por contratación directa, de 2.166 " +
      "contratistas. En la Gobernación se retiró cerca de uno de cada cinco contratos firmados en " +
      "2024, 2025 y 2026, dentro del período constitucional 2024-2027, frente a menos del 0,5% en " +
      "años anteriores. 887 seguían en ejecución. Consultamos los 3.158 por su número: ninguno " +
      "existe ya en el conjunto de datos. No son duplicados depurados y SECOP I no se vio afectado. " +
      "No sabemos por qué se retiraron; pueden explicarlo las entidades y Colombia Compra Eficiente, " +
      "a las que se puede preguntar con un derecho de petición. La nota conserva la lista completa.",
  },
];

export const HALLAZGOS = [...TODOS].sort((a, b) => b.fecha.localeCompare(a.fecha));
