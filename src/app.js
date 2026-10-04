import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, MODES } from "./modes.js";
import { HttpError, parseAnalyzeRequest } from "./validate.js";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

const PAGES = { "/": "index.html", "/overlay": "overlay.html" };

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
  "content-security-policy":
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; frame-ancestors 'none'",
};

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, "content-type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(JSON.stringify(body));
}

// Se corta la lectura de un cuerpo demasiado grande: hay que cerrar la conexión tras responder,
// porque el cliente aún puede estar enviando y ese socket no se puede reutilizar.
function bodyTooLarge() {
  const err = new HttpError(413, "body_too_large", "La petición es demasiado grande.");
  err.closeConnection = true;
  return err;
}

async function readJsonBody(req) {
  const type = req.headers["content-type"] ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Content-Type debe ser application/json.");
  }
  if (Number(req.headers["content-length"]) > MAX_BODY_BYTES) throw bodyTooLarge();
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw bodyTooLarge();
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "bad_json", "El cuerpo no es JSON válido.");
  }
}

// Construye el manejador HTTP. Todo lo externo llega inyectado para poder probarlo sin red:
//   analyze               función (petición validada) -> resultado de Claude
//   credentialsConfigured false -> /api/analyze responde 503 sin llamar a Claude
//   loopbackOnly          true -> solo acepta Host de localhost (evita DNS rebinding)
export function createApp({ analyze, credentialsConfigured, model, loopbackOnly = true, now = () => new Date() }) {
  let latest = null; // último contexto publicado, solo texto (lo lee el overlay de OBS)

  async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (loopbackOnly) {
      const hostname = (req.headers.host ?? "").replace(/:\d+$/, "").toLowerCase();
      if (!LOOPBACK_HOSTS.has(hostname)) throw new HttpError(403, "bad_host", "Host no permitido.");
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJson(res, 200, {
        model,
        credentialsConfigured,
        modes: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label })),
        languages: Object.keys(LANGUAGES),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/latest") {
      return sendJson(res, 200, { latest });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      if (!credentialsConfigured) {
        throw new HttpError(503, "missing_api_key", "Falta ANTHROPIC_API_KEY en el servidor.");
      }
      const request = parseAnalyzeRequest(await readJsonBody(req));
      const started = Date.now();
      const outcome = await analyze(request);
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

  return async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        const headers = err.closeConnection ? { connection: "close" } : {};
        return sendJson(res, err.status, { error: err.code, message: err.message }, headers);
      }
      console.error("Error inesperado:", err);
      sendJson(res, 500, { error: "internal", message: "Error interno del servidor." });
    }
  };
}
