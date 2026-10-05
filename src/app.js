import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contextToPrompt, contextToText } from "../public/context-format.js";
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
const HEARTBEAT_MS = 25_000;

// Servidor del visor: sirve la interfaz y el overlay, y reenvía las capturas al analizador.
//   backend      { info() -> {ready, name, model, cost, local, maxSide, hint}, analyze(req) }
//   loopbackOnly true -> solo acepta Host de localhost (evita DNS rebinding)
//   onContext    se llama con cada contexto publicado (el webhook se engancha aquí); sus fallos no afectan al visor
export function createApp({ backend, loopbackOnly = true, now = () => new Date(), onContext = () => {} }) {
  let latest = null; // último contexto publicado, solo texto (lo leen el overlay de OBS, la API, el flujo en vivo y el MCP)
  const listeners = new Set(); // clientes conectados a /api/events
  let heartbeat = null;

  const sseEvent = (entry) => `event: context\ndata: ${JSON.stringify(entry)}\n\n`;

  function publish(entry) {
    latest = entry;
    for (const res of listeners) res.write(sseEvent(entry));
    try {
      Promise.resolve(onContext(entry)).catch(() => {});
    } catch {
      // un fallo del webhook nunca debe romper un análisis
    }
  }

  function subscribe(req, res) {
    res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "text/event-stream; charset=utf-8", connection: "keep-alive" });
    res.write(": conectado\n\n");
    if (latest) res.write(sseEvent(latest));
    listeners.add(res);
    // Un único temporizador mientras haya clientes: mantiene viva la conexión y se apaga solo al quedarse sin ellos.
    heartbeat ??= setInterval(() => listeners.forEach((r) => r.write(": ping\n\n")), HEARTBEAT_MS);
    heartbeat.unref();
    req.on("close", () => {
      listeners.delete(res);
      if (listeners.size === 0) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
    });
  }

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

    // Para conectar otra IA o un bot: ?format=json (por defecto) | text | prompt, y ?lang=es|en.
    if (req.method === "GET" && url.pathname === "/api/context") {
      const format = url.searchParams.get("format") ?? "json";
      if (!["json", "text", "prompt"].includes(format)) {
        throw new HttpError(400, "bad_format", "format debe ser json, text o prompt.");
      }
      const ageSeconds = latest ? (now().getTime() - Date.parse(latest.at)) / 1000 : null;
      if (format === "json") {
        return sendJson(res, 200, { latest, age_seconds: ageSeconds === null ? null : Math.max(0, Math.round(ageSeconds)) });
      }
      const language = url.searchParams.get("lang") ?? latest?.language ?? "es";
      const body = (format === "prompt" ? contextToPrompt : contextToText)(latest, { language, ageSeconds });
      res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" });
      return res.end(body);
    }

    // Flujo en vivo (Server-Sent Events): cada análisis publicado llega como un evento «context».
    if (req.method === "GET" && url.pathname === "/api/events") {
      return subscribe(req, res);
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
        publish({ ...outcome.result, mode: request.mode, language: request.language, at: now().toISOString() });
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
