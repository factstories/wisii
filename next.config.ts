import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Huella del contenido de public/data, calculada en el build. Las descargas de
 * datos llevan `?v=<huella>`: el código y los datos de un despliegue siempre
 * viajan juntos, y un navegador con una copia vieja en caché no puede
 * mezclarla con código nuevo. Como depende del contenido y no de la fecha, la
 * caché del visitante solo se invalida cuando los datos cambian de verdad.
 */
function huellaDatos(): string {
  const h = createHash("sha1");
  for (const f of ["contratos.json", "meta.json", "barrios.json", "islas.geojson"]) {
    try {
      h.update(readFileSync(path.join(process.cwd(), "public", "data", f)));
    } catch {
      h.update(f); // sin datos todavía: la huella sigue siendo determinista
    }
  }
  return h.digest("hex").slice(0, 12);
}

/**
 * En desarrollo corre el servidor de Next completo, con el editor de barrios y
 * su API, que escriben en disco. Todo build es una exportación estática (`out/`)
 * que se publica en Cloudflare Pages: sin servidor, así que el editor y su ruta
 * quedan fuera. La ruta vive en `route.dev.ts` y solo se reconoce en desarrollo.
 *
 * Los encabezados de caché de /data están en public/_headers: Cloudflare Pages
 * los lee de ahí, porque `headers()` no existe en una exportación.
 */
export default function config(fase: string): NextConfig {
  const desarrollo = fase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactStrictMode: true,
    output: desarrollo ? undefined : "export",
    // `next build` y `next dev` comparten .next y se pisan: un build mientras el
    // servidor de desarrollo corre lo deja sirviendo 500. Con esto, una
    // verificación puede escribir en otro directorio (ver `npm run check`).
    distDir: process.env.NEXT_DIST_DIR || ".next",
    pageExtensions: desarrollo ? ["tsx", "ts", "dev.ts", "dev.tsx"] : ["tsx", "ts"],
    env: {
      NEXT_PUBLIC_EDITOR_BARRIOS: desarrollo ? "1" : "0",
      NEXT_PUBLIC_DATOS_VERSION: huellaDatos(),
    },
  };
}
