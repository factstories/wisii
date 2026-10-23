import { ImageResponse } from "next/og";
import { MarcaOg } from "@/lib/marcaOg";

export const alt = "WiSii · Contratación pública del Archipiélago";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagenOg() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
                  justifyContent: "center", padding: "0 90px", background: "#0d1821", color: "#f1faff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <div style={{ display: "flex", background: "#f1faff", borderRadius: 40, padding: 18 }}>
          <MarcaOg tamano={170} />
        </div>
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -4 }}>WiSii</div>
      </div>
      <div style={{ marginTop: 44, fontSize: 46, lineHeight: 1.2, maxWidth: 960 }}>
        Cada peso que contrata el Archipiélago, a la vista de todos.
      </div>
      <div style={{ marginTop: 22, fontSize: 26, color: "#ff7154" }}>
        Veeduría ciudadana · San Andrés, Providencia y Santa Catalina
      </div>
    </div>,
    size,
  );
}
