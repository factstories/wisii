# Estudios de datos

Scripts para buscar patrones en la contratación publicada y alimentar las notas de
**Hallazgos**. Leen el mismo `public/data/contratos.json` que el sitio, así que sus cifras
coinciden con lo que cualquiera puede comprobar en el explorador.

**Lo que encuentran son señales para revisar, no irregularidades probadas.** Antes de
publicar algo, verificar los contratos concretos en el SECOP y buscar explicaciones
legítimas (excepciones legales, emergencias, errores de digitación).

## Uso rápido

```bash
python3 scripts/estudios/estudiar.py          # corre todo
python3 scripts/estudios/calendario.py --entidad ""   # uno solo, todas las entidades
```

Los resultados quedan en `data/estudios/` (un `.json` y un `.md` por estudio, más un
índice `README.md`). Esa carpeta no se sube al repo: se regenera cuando haga falta.

Opciones comunes a todos los scripts:

| Opción | Por defecto | Para qué |
|---|---|---|
| `--contratos` | `public/data/contratos.json` | Otro archivo: el payload del sitio, una lista JSON o `{"contratos": [...]}` |
| `--entidad` | Gobernación (o todas, según el estudio) | Nombre exacto de la entidad; `""` = todas |
| `--salida` | `data/estudios/` | Carpeta de resultados |

## Estudios

| Script | Pregunta | Opciones propias |
|---|---|---|
| `modalidades.py` | ¿Cuánto se contrata de forma directa, por año y gobierno? ¿Cuáles son los directos más grandes? | `--top` |
| `calendario.py` | ¿Cuándo se firma? Cierres de diciembre, «carrera» antes de la Ley de Garantías con control de estacionalidad, firmas dentro de la restricción, mes de terminación de los contratos, arranque de cada gobierno | — |
| `fraccionamiento.py` | ¿Hay compras partidas en varios contratos parecidos con el mismo contratista? ¿Contratos de servicios iguales vigentes a la vez? | `--dias`, `--similitud`, `--top` |
| `simultaneidad.py` | ¿Quién llegó a tener muchos contratos de servicios al mismo tiempo, y en qué entidades? | `--minimo`, `--top` |
| `umbrales.py` | ¿Se amontonan los valores justo debajo de los topes de mínima y menor cuantía? | `--minimo` |
| `continuidad.py` | ¿Qué tan concentrado está el gasto en cada gobierno? ¿Quién contrata con todos? | `--top` |
| `calidad.py` | ¿Qué problemas tienen los datos (fechas, valores, duplicados, inicio antes de la firma)? | — |

## Datos de las notas

Algunas notas de Hallazgos leen un JSON propio en `public/data/hallazgos/` (ese sí se publica).
Se regeneran con datos nuevos sin tocar la página:

| Script | Nota | Archivo |
|---|---|---|
| `nota_garantias.py` | `app/hallazgos/2026-10-ley-de-garantias` | `public/data/hallazgos/2026-10-ley-de-garantias.json` |

`nota_garantias.py --control 2025` elige el año sin elección que se dibuja como control.

`comun.py` reúne la lectura de datos, las reglas de agrupación del sitio (`clave`,
`doc_valido`), las familias de modalidad y tipo, los períodos de gobierno, las fechas de
la Ley de Garantías, el salario mínimo por año y los topes de cuantía.

## Mantenimiento

- **Cada enero:** agregar el salario mínimo del año en `SMMLV` (`comun.py`).
- **Antes de cada elección:** agregar sus ventanas en `GARANTIAS_PRESIDENCIALES` o
  `GARANTIAS_TERRITORIALES` (cuatro meses antes de la elección hasta la última vuelta).
- **Nuevo gobierno:** agregar el período en `PERIODOS` (igual que en `lib/gobiernos.ts`).
- **Nuevo estudio:** un script con `estudiar(cs, …) -> dict` e `informe(r, entidad) -> str`,
  usando `argumentos()` y `guardar()` de `comun.py`, y registrarlo en `estudiar.py`.

`scripts/analizar_periodo.py` es anterior a esta carpeta: el estudio de un período que
alimentó la primera nota de Hallazgos.
