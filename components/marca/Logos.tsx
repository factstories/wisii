/**
 * Marcas de WiSii y de Factstories, la organización que lo publica.
 *
 * Las dos comparten el hexágono de punta arriba: Factstories es el hexágono
 * negro con la F calada; WiSii, su rama, lo usa como contorno y pone adentro
 * un ojo —la vigilancia del gasto público— sobre el mar del Archipiélago.
 * Los colores salen de los tokens del tema, así se ven bien en claro y oscuro.
 */

/** Hexágono de punta arriba centrado en (32,32), radio 29. */
const HEXAGONO = "M32 3 57.1 17.5 57.1 46.5 32 61 6.9 46.5 6.9 17.5Z";

export function MarcaWisii({ tamano = 32, animada = false, className = "" }: {
  tamano?: number; animada?: boolean; className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" width={tamano} height={tamano} aria-hidden
         className={`${animada ? "marca-viva" : ""} ${className}`}>
      <defs>
        <clipPath id="wisii-hex"><path d={HEXAGONO} /></clipPath>
      </defs>
      <path d={HEXAGONO} fill="var(--surface)" />
      {/* el mar: más ancho que el hexágono para poder derivar sin cortes */}
      <g clipPath="url(#wisii-hex)">
        <path className="marca-mar" fill="var(--marca-mar)"
              d="M-32 43c8-5 16-5 24 0s16 5 24 0 16-5 24 0 16 5 24 0 16-5 24 0 16 5 24 0V70H-32Z" />
      </g>
      <g className="marca-ojo">
        <path d="M14 28Q32 11 50 28 32 45 14 28Z" fill="var(--surface)"
              stroke="var(--marca-tinta)" strokeWidth="3.2" strokeLinejoin="round" />
        <g className="marca-iris">
          <circle cx="32" cy="28" r="7.6" fill="var(--cta)" />
          <circle cx="32" cy="28" r="3.1" fill="#0d1821" />
          <circle cx="34.4" cy="25.6" r="1.3" fill="#fff" />
        </g>
      </g>
      <path d={HEXAGONO} fill="none" stroke="var(--marca-tinta)" strokeWidth="3.6"
            strokeLinejoin="round" />
    </svg>
  );
}

/** Logotipo completo: el ojo y "WiSii" con los puntos de las íes en coral. */
export function LogoWisii({ tamano = 28, animada = false }: { tamano?: number; animada?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <MarcaWisii tamano={tamano} animada={animada} />
      <span className="font-semibold tracking-tight" style={{ fontSize: tamano * 0.62 }}>WiSii</span>
    </span>
  );
}

export function MarcaFactstories({ tamano = 20, className = "" }: { tamano?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={tamano} height={tamano} aria-hidden className={className}>
      <path d={HEXAGONO} fill="var(--marca-fs)" />
      <path d="M24 17h18v5.5H29.5v7H39v5.5h-9.5V47H24Z" fill="var(--marca-fs-ink)" />
    </svg>
  );
}
