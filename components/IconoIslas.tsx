/**
 * Silueta de San Andrés, Providencia y Santa Catalina, derivada del contorno
 * real (data/islas.geojson) simplificado a unos 30 puntos por isla. Providencia
 * va desplazada junto a San Andrés, igual que en el mapa de calor.
 */
const SILUETA =
  "M4.1 7.0 L2.8 8.8 L3.3 10.2 L2.2 13.2 L2.5 13.8 L3.7 14.1 L3.2 14.3 L3.3 18.0 L2.3 20.3 L2.7 22.1 L3.2 22.5 L3.9 22.0 L5.8 18.0 L6.2 14.7 L7.4 13.0 L7.2 11.4 L8.0 10.9 L8.0 7.7 L7.3 7.3 L8.5 7.1 L8.6 6.7 L7.6 6.5 L7.3 5.7 L8.2 6.4 L8.6 6.1 L8.1 5.1 L9.2 4.3 L10.9 4.0 L8.8 2.9 L7.9 1.5 L7.3 1.6 L4.7 4.3Z " +
  "M13.7 10.8 L13.4 11.7 L14.0 12.0 L14.3 13.2 L14.0 14.0 L14.8 15.0 L17.1 14.3 L18.3 12.9 L20.0 12.5 L20.7 10.8 L20.4 9.0 L21.6 8.4 L21.8 7.9 L21.6 7.5 L20.9 7.7 L20.2 6.3 L20.2 5.7 L20.8 4.6 L19.6 4.3 L19.0 3.1 L18.7 3.1 L18.6 3.6 L18.0 4.0 L18.1 5.2 L17.6 5.9 L16.9 6.1 L16.0 5.6 L15.4 5.9 L14.1 8.0Z " +
  "M16.9 3.9 L17.6 3.6 L17.9 3.7 L18.2 3.1 L18.3 3.1 L18.1 2.8 L18.0 2.9 L17.8 2.8 L17.9 2.0 L18.2 1.6 L17.8 1.5 L17.6 1.7 L17.3 1.6 L17.0 1.8 L16.9 1.7 L16.6 2.0 L16.3 2.1 L16.2 2.6 L16.2 3.0 L16.1 3.1 L16.7 3.5Z";

export default function IconoIslas({ tamano = 20 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true">
      <path d={SILUETA} fill="currentColor" />
    </svg>
  );
}
