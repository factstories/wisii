import type { NextConfig } from "next";
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `next build` y `next dev` comparten .next y se pisan: un build mientras el
  // servidor de desarrollo corre lo deja sirviendo 500. Con esto, una
  // verificación puede escribir en otro directorio (ver `npm run check`).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: {
    // El editor de barrios escribe data/gazetteer.json en disco, algo imposible
    // en Vercel (filesystem de solo lectura). Se resuelve en tiempo de build:
    // en un despliegue la pestaña no se muestra ni se descarga su código.
    NEXT_PUBLIC_EDITOR_BARRIOS: process.env.VERCEL ? "0" : "1",
    NEXT_PUBLIC_DATOS_VERSION: huellaDatos(),
  },
  headers: async () => [
    {
      // Nada de stale-while-revalidate: con él, Safari servía la copia vieja
      // de contratos.json al código nuevo mientras revalidaba en segundo plano,
      // y el decodificador fallaba al no encontrar un campo nuevo. Con
      // must-revalidate el navegador consulta siempre; si nada cambió, el
      // servidor responde 304 por ETag y no se vuelve a bajar el archivo.
      source: "/data/:file*",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
  ],
};

export default nextConfig;
