/**
 * Hallazgos: notas sobre eventos de la contratación pública del Archipiélago
 * que vale la pena contar. Cada nota vive en app/hallazgos/<slug>/page.tsx y
 * se registra aquí para aparecer en el blog, el índice y la portada.
 *
 * `texto` es el cuerpo de la nota en texto plano: alimenta la búsqueda por
 * contenido del blog. Al agregar una nota, copiar ahí sus párrafos principales.
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
