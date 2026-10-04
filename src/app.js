import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllowedHost, readJsonBody, SECURITY_HEADERS, sendJson, withErrorHandling } from "./http.js";
import { LANGUAGES, MODES } from "./modes.js";
import { HttpError, parseAnalyzeRequest } from "./validate.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

const PAGES = { "/": "index.html", "/overlay": "overlay.html" };

// Servidor del visor: sirve la interfaz y el overlay, y reenvía las capturas al analizador.
//   backend      { info() -> {ready, name, model, cost, local, maxSide, hint}, analyze(req) }
//   loopbackOnly true -> solo acepta Host de localhost (evita DNS rebinding)
export function createApp({ backend, loopbackOnly = true, now = () => new Date() }) {
  let latest = null; // último contexto publicado, solo texto (lo lee el overlay de OBS)

  async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    assertAllowedHost(req, loopbackOnly);

    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJson(res, 200, {
        backend: await backend.info(),
        modes: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label })),
        languages: Object.keys(LANGUAGES),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/latest") {
      return sendJson(res, 200, { latest });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const info = await backend.info();
      if (!info.ready) throw new HttpError(503, "no_backend", info.hint ?? "No hay analizador disponible.");
      const request = parseAnalyzeRequest(await readJsonBody(req));
      const started = Date.now();
      const outcome = await backend.analyze(request);
      const elapsed_ms = Date.now() - started;
      if (outcome.refused) {
        return sendJson(res, 200, { refused: true, reason: outcome.reason, elapsed_ms });
      }
      if (request.publish) {
        latest = { ...outcome.result, mode: request.mode, at: now().toISOString() };
      }
      return sendJson(res, 200, {
        refused: false,
        context: outcome.result,
        meta: { model: outcome.model, usage: outcome.usage, elapsed_ms },
      });
    }

    if (req.method === "GET" || req.method === "HEAD") {
      const file = PAGES[url.pathname] ?? (/^\/[\w-]+\.(?:js|css|svg)$/.test(url.pathname) ? url.pathname.slice(1) : null);
      if (file) {
        let data;
        try {
          data = await readFile(path.join(PUBLIC_DIR, file));
        } catch (err) {
          if (err.code === "ENOENT") throw new HttpError(404, "not_found", "No encontrado.");
          throw err;
        }
        res.writeHead(200, { ...SECURITY_HEADERS, "content-type": CONTENT_TYPES[path.extname(file)] });
        return res.end(req.method === "HEAD" ? undefined : data);
      }
    }

    throw new HttpError(404, "not_found", "No encontrado.");
  }

  return withErrorHandling(handle);
}
