// Funciones puras del lado del navegador (sin DOM) para poder probarlas con node --test.

export const MAX_SIDE = 1568; // por encima de esto la API reduce la imagen igualmente
export const MIN_REGION_PX = 32;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// Dos puntos normalizados (0..1) -> rectángulo {x, y, w, h} normalizado.
export function normalizeRect(a, b) {
  const x1 = clamp01(Math.min(a.x, b.x));
  const y1 = clamp01(Math.min(a.y, b.y));
  const x2 = clamp01(Math.max(a.x, b.x));
  const y2 = clamp01(Math.max(a.y, b.y));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// Rectángulo normalizado (o null = pantalla completa) -> píxeles del vídeo original.
export function toSourceRect(selection, videoWidth, videoHeight) {
  const s = selection ?? { x: 0, y: 0, w: 1, h: 1 };
  const x = Math.round(s.x * videoWidth);
  const y = Math.round(s.y * videoHeight);
  const w = Math.min(videoWidth - x, Math.round(s.w * videoWidth));
  const h = Math.min(videoHeight - y, Math.round(s.h * videoHeight));
  return { x, y, w, h };
}

export function isRegionTooSmall(rect) {
  return rect.w < MIN_REGION_PX || rect.h < MIN_REGION_PX;
}

// Tamaño de salida: conserva la proporción y limita el lado largo a MAX_SIDE (nunca amplía).
export function fitSize(w, h, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

// Luminancia de una miniatura RGBA (como la de ImageData.data) -> Uint8Array.
export function luminance(rgba) {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    out[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  }
  return out;
}

// Diferencia media entre dos miniaturas de luminancia, de 0 (iguales) a 1 (opuestas).
export function frameDifference(a, b) {
  if (!a || !b || a.length !== b.length) return 1;
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / (a.length * 255);
}
