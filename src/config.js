// Lee y valida las variables de entorno. Todo lo propio lleva prefijo PANTALLA_;
// solo se reutilizan los nombres estándar de cada proveedor (ANTHROPIC_API_KEY, GEMINI_API_KEY, OLLAMA_HOST).

export const BACKEND_NAMES = ["auto", "ollama", "gemini", "claude"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1"]);

// OLLAMA_HOST admite "127.0.0.1:11434", "0.0.0.0" o una URL completa.
export function normalizeOllamaHost(raw) {
  const text = (raw ?? "").trim() || "127.0.0.1";
  const hasScheme = /^https?:\/\//i.test(text);
  const url = new URL(hasScheme ? text : `http://${text}`);
  if (url.hostname === "0.0.0.0") url.hostname = "127.0.0.1";
  if (!hasScheme && !url.port) url.port = "11434";
  return url.origin;
}

function int(env, name, fallback, { min, max }) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max} (valor actual: "${raw}").`);
  }
  return n;
}

export function loadConfig(env = process.env) {
  const backend = env.PANTALLA_BACKEND || "auto";
  if (!BACKEND_NAMES.includes(backend)) {
    throw new Error(`PANTALLA_BACKEND inválido: "${backend}". Usa uno de: ${BACKEND_NAMES.join(", ")}.`);
  }

  const effort = env.PANTALLA_CLAUDE_EFFORT || "low";
  if (!EFFORTS.includes(effort)) {
    throw new Error(`PANTALLA_CLAUDE_EFFORT inválido: "${effort}". Usa uno de: ${EFFORTS.join(", ")}.`);
  }

  let analyzerUrl = null;
  if (env.PANTALLA_ANALYZER_URL) {
    try {
      const url = new URL(env.PANTALLA_ANALYZER_URL);
      if (!/^https?:$/.test(url.protocol)) throw new Error("protocolo");
      analyzerUrl = url.origin;
    } catch {
      throw new Error(`PANTALLA_ANALYZER_URL no es una URL http(s) válida: "${env.PANTALLA_ANALYZER_URL}".`);
    }
  }

  const host = env.HOST || "127.0.0.1";
  const analyzerHost = env.PANTALLA_ANALYZER_HOST || "127.0.0.1";
  const think = env.PANTALLA_OLLAMA_THINK;

  return {
    port: int(env, "PORT", 3000, { min: 1, max: 65535 }),
    host,
    loopbackOnly: LOOPBACK.has(host),
    backend,
    maxSide: int(env, "PANTALLA_MAX_SIDE", null, { min: 256, max: 4096 }),
    analyzerUrl,
    analyzer: {
      port: int(env, "PANTALLA_ANALYZER_PORT", 4000, { min: 1, max: 65535 }),
      host: analyzerHost,
      loopbackOnly: LOOPBACK.has(analyzerHost),
      token: env.PANTALLA_ANALYZER_TOKEN || null,
    },
    ollama: {
      host: normalizeOllamaHost(env.OLLAMA_HOST),
      model: env.PANTALLA_OLLAMA_MODEL || "qwen3-vl:2b",
      keepAlive: env.PANTALLA_OLLAMA_KEEP_ALIVE || "60s",
      threads: int(env, "PANTALLA_OLLAMA_THREADS", null, { min: 1, max: 256 }),
      think: think === "0" ? false : null, // solo se envía `think:false` si se pide explícitamente
      timeoutMs: int(env, "PANTALLA_OLLAMA_TIMEOUT_S", 180, { min: 10, max: 1800 }) * 1000,
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || null,
      model: env.PANTALLA_GEMINI_MODEL || "gemini-flash-lite-latest",
      timeoutMs: 60_000,
    },
    claude: {
      configured: Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_PROFILE),
      model: env.PANTALLA_CLAUDE_MODEL || "claude-opus-5-5",
      effort,
      fallbacks: env.PANTALLA_CLAUDE_FALLBACKS !== "0",
    },
  };
}
