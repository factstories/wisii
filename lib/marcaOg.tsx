/**
 * La marca de WiSii en JSX plano para next/og (apple-icon y la imagen al
 * compartir). Satori no lee variables CSS ni clipPath: colores fijos y el mar
 * recortado a mano dentro del hexágono.
 */
export function MarcaOg({ tamano }: { tamano: number }) {
  return (
    <svg viewBox="0 0 64 64" width={tamano} height={tamano}>
      <path d="M32 3 57.1 17.5 57.1 46.5 32 61 6.9 46.5 6.9 17.5Z" fill="#ffffff" />
      <path d="M6.9 43.6c5.7-2.8 11.4-2.4 17.1.4s16 5 24 0c3.2-2 6.1-2.6 9.1-2.2v4.7L32 61 6.9 46.5Z" fill="#344966" />
      <path d="M13 28Q32 9 51 28 32 47 13 28Z" fill="#ffffff" stroke="#0d1821" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="32" cy="28" r="8.5" fill="#ff7154" />
      <circle cx="32" cy="28" r="3.6" fill="#0d1821" />
      <circle cx="34.6" cy="25.4" r="1.4" fill="#ffffff" />
      <path d="M32 3 57.1 17.5 57.1 46.5 32 61 6.9 46.5 6.9 17.5Z" fill="none" stroke="#0d1821" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}
