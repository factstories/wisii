"use client";

import { useEffect } from "react";

/**
 * Movimiento de las páginas de Hallazgos. El HTML llega completo y legible
 * desde el servidor, y este componente solo agrega la animación encima.
 *
 *  .rv            aparece con fundido y subida al entrar en pantalla
 *  data-i / --i   índice para escalonar hermanos (90 ms entre uno y otro)
 *  .crece         barras que crecen desde la base al revelarse su contenedor
 *  data-count     cifra que cuenta desde cero; data-fmt: entero | pct | mmm
 *  .tarjeta       se eleva al pasar el mouse, con un halo que sigue al cursor
 *
 * Con prefers-reduced-motion no se agrega la clase .anim y todo queda quieto.
 * Un MutationObserver descubre lo que se renderiza después (la lista cargada
 * por fetch, por ejemplo).
 */

const ES = new Intl.NumberFormat("es-CO");

function formatear(v: number, fmt: string | null): string {
  if (fmt === "pct") return `${v.toFixed(1).replace(".", ",")}%`;
  if (fmt === "mmm") return `$${v.toFixed(1).replace(".", ",")} MMM`;
  return ES.format(Math.round(v));
}

function contar(el: HTMLElement) {
  const fin = Number(el.dataset.count);
  if (!Number.isFinite(fin)) return;
  const fmt = el.dataset.fmt ?? null;
  const t0 = performance.now() + 150;
  const dur = 1500;
  // No se pone en cero aquí: si los cuadros no corren (pestaña en segundo
  // plano), la cifra debe seguir mostrando su valor real, no un 0.
  const tick = (ahora: number) => {
    const p = Math.min(1, Math.max(0, (ahora - t0) / dur));
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = formatear(p >= 1 ? fin : fin * e, fmt);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export default function Movimiento() {
  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raiz = document.documentElement;
    if (!reducido) raiz.classList.add("anim");

    const revelar = (el: Element) => {
      el.classList.add("is-in");
      if (el instanceof HTMLElement && el.dataset.count && !reducido) contar(el);
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
        if (!c.closest(".rv:not(.is-in)") && !reducido && !c.dataset.contado) {
          c.dataset.contado = "1";
          contar(c);
        }
      });
    };

    const pendientes = new Set<Element>();
    const disparar = (el: Element) => {
      if (!pendientes.delete(el)) return;
      io?.unobserve(el);
      revelar(el);
    };

    const io = reducido ? null : new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) disparar(e.target);
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });

    // El observer solo informa en cuadros pintados: si la pestaña no pinta o el
    // scroll es muy rápido, algo podría quedar invisible para siempre. Este
    // barrido revisa la geometría en cada scroll y revela todo lo que ya entró
    // o quedó arriba. El contenido nunca depende de la animación.
    const barrer = () => {
      const limite = window.innerHeight * 0.92;
      pendientes.forEach((el) => {
        if (!el.isConnected) { pendientes.delete(el); return; }
        if (el.getBoundingClientRect().top < limite) disparar(el);
      });
    };
    // Sin requestAnimationFrame: se pausa con la pestaña en segundo plano.
    // Un barrido cada 100 ms como máximo, más uno al final del scroll.
    let ultimo = 0, cola = 0;
    const alScroll = () => {
      const ahora = Date.now();
      if (ahora - ultimo > 100) { ultimo = ahora; barrer(); }
      clearTimeout(cola);
      clearInterval(red);
      cola = window.setTimeout(barrer, 120);
    };

    const vistos = new WeakSet<Element>();
    const escanear = () => {
      document.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => el.style.setProperty("--i", el.dataset.i!));
      document.querySelectorAll(".rv").forEach((el) => {
        if (vistos.has(el)) return;
        vistos.add(el);
        if (reducido) { el.classList.add("is-in"); return; }
        pendientes.add(el);
        io!.observe(el);
      });
      barrer();
    };
    escanear();
    const mo = new MutationObserver(escanear);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll, { passive: true });
    // última red: si un evento de scroll no llega, igual se revisa cada 700 ms
    // mientras quede algo por revelar
    const red = window.setInterval(() => { if (pendientes.size) barrer(); }, 700);

    // halo que sigue al cursor sobre las tarjetas (solo con mouse)
    const fino = window.matchMedia("(pointer: fine)").matches;
    const mover = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(".tarjeta") as HTMLElement | null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--cx", `${e.clientX - r.left}px`);
      t.style.setProperty("--cy", `${e.clientY - r.top}px`);
    };
    if (fino) document.addEventListener("pointermove", mover, { passive: true });

    return () => {
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
      clearTimeout(cola);
      clearInterval(red);
      document.removeEventListener("pointermove", mover);
      raiz.classList.remove("anim");
    };
  }, []);
  return null;
}
