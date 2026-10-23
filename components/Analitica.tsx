"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GOATCOUNTER } from "@/lib/analitica";

/**
 * Conteo de visitas con GoatCounter: sin cookies ni datos personales.
 *
 * El script de GoatCounter solo cuenta la carga inicial, y aquí casi toda la
 * navegación ocurre sin recargar; por eso se apaga su conteo automático y se
 * registra cada cambio de ruta. Solo se envía la ruta: nunca la búsqueda ni los
 * filtros de la URL, que podrían decir qué persona o contrato se consultó.
 *
 * Sin `NEXT_PUBLIC_GOATCOUNTER` (por ejemplo, en local) no se carga nada.
 */

type Gc = { count: (o: { path: string }) => void };

export function ScriptAnalitica() {
  if (!GOATCOUNTER) return null;
  return (
    <script data-goatcounter={GOATCOUNTER} data-goatcounter-settings='{"no_onload": true}'
            async src="https://gc.zgo.at/count.js" />
  );
}

export function ContarVisitas() {
  const ruta = usePathname();
  useEffect(() => {
    if (!GOATCOUNTER) return;
    // el script carga async: se espera hasta 10 s a que aparezca
    let intentos = 0;
    const id = setInterval(() => {
      const gc = (window as unknown as { goatcounter?: Gc }).goatcounter;
      if (gc?.count) { gc.count({ path: ruta }); clearInterval(id); }
      else if (++intentos > 40) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [ruta]);
  return null;
}
