import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { HttpError } from "../validate.js";

const require = createRequire(import.meta.url);

// Los idiomas vienen en paquetes npm (@tesseract.js-data/<código>), así que no se descarga nada en tiempo de ejecución.
// Tesseract admite un único directorio de idiomas: con varios se juntan en una carpeta temporal (copia única).
async function resolveLangPath(langs, override) {
  if (override) return override;
  const dirs = langs.map((code) => {
    try {
      return require(`@tesseract.js-data/${code}`).langPath;
    } catch {
      throw new Error(`Falta el idioma de OCR "${code}". Instálalo con: npm install @tesseract.js-data/${code} (o define PANTALLA_OCR_LANG_PATH).`);
    }
  });
  if (dirs.length === 1) return dirs[0];

  const merged = path.join(os.tmpdir(), "pantalla-contexto-tessdata");
  await fs.mkdir(merged, { recursive: true });
  for (const [i, code] of langs.entries()) {
    const from = path.join(dirs[i], `${code}.traineddata.gz`);
    const to = path.join(merged, `${code}.traineddata.gz`);
    const [a, b] = await Promise.all([fs.stat(from), fs.stat(to).catch(() => null)]);
    if (b?.size !== a.size) await fs.copyFile(from, to);
  }
  return merged;
}

// Motor de OCR (Tesseract compilado a WebAssembly, sin dependencias nativas).
//   - El trabajador (~160 MB de RAM) se crea al primer uso y se libera tras `keepAliveMs` sin actividad.
//   - Modo de segmentación 11 («texto disperso»): el que mejor lee interfaces, donde las etiquetas están sueltas.
export function createOcrEngine({ langs = ["eng"], langPath = null, keepAliveMs = 60_000, loadTesseract = () => import("tesseract.js") } = {}) {
  let workerPromise = null;
  let idleTimer = null;

  async function startWorker() {
    const dir = await resolveLangPath(langs, langPath);
    const mod = await loadTesseract();
    const createWorker = mod.createWorker ?? mod.default?.createWorker;
    const worker = await createWorker(langs, 1, { langPath: dir, gzip: true, cacheMethod: "none" });
    await worker.setParameters({ tessedit_pageseg_mode: "11", user_defined_dpi: "300" });
    return worker;
  }

  async function release() {
    clearTimeout(idleTimer);
    const pending = workerPromise;
    workerPromise = null;
    if (pending) await (await pending.catch(() => null))?.terminate();
  }

  return {
    langs,

    // Comprueba que Tesseract y los idiomas están instalados, sin arrancar el trabajador.
    async available() {
      try {
        await loadTesseract();
        await resolveLangPath(langs, langPath);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },

    // `image` es un Buffer JPEG/PNG. Devuelve el texto y las líneas con su caja y confianza.
    async recognize(image) {
      clearTimeout(idleTimer);
      workerPromise ??= startWorker();
      try {
        const worker = await workerPromise;
        const started = performance.now();
        const { data } = await worker.recognize(image, {}, { text: true, blocks: true });
        const lines = (data.blocks ?? [])
          .flatMap((block) => block.paragraphs.flatMap((p) => p.lines))
          .map((line) => ({ text: line.text.trim(), confidence: line.confidence, bbox: line.bbox }))
          .filter((line) => line.text);
        return { text: data.text.trim(), confidence: data.confidence, lines, ms: Math.round(performance.now() - started) };
      } catch (err) {
        workerPromise = null; // si el trabajador quedó en mal estado, se recrea en la siguiente captura
        throw new HttpError(502, "ocr_failed", `El OCR falló: ${err.message}`);
      } finally {
        idleTimer = setTimeout(release, keepAliveMs);
        idleTimer.unref?.();
      }
    },

    close: release,
  };
}
