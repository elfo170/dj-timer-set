/** "#RRGGBB" a partir de canais 0–255 inteiros; null se algum for inválido. */
export function rgbToHex(r: number, g: number, b: number): string | null {
  const valid = [r, g, b].every((v) => Number.isInteger(v) && v >= 0 && v <= 255);
  if (!valid) return null;
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

const DARK_TEXT = "#0B0E14";
const LIGHT_TEXT = "#FFFFFF";

/** Luminância relativa (WCAG) de "#RRGGBB". */
function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto (escuro ou claro) com o maior contraste sobre um fundo "#RRGGBB". */
export function readableTextColor(hex: string): string {
  const background = relativeLuminance(hex);
  if (background === null) return "#E8EDF5";
  const darkContrast = (background + 0.05) / ((relativeLuminance(DARK_TEXT) ?? 0) + 0.05);
  const lightContrast = 1.05 / (background + 0.05);
  return darkContrast >= lightContrast ? DARK_TEXT : LIGHT_TEXT;
}
