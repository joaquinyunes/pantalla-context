import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { HttpError } from "../src/validate.js";

const IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const CONTEXT = {
  category: "casino",
  title: "Jugando Sweet Bonanza",
  summary: "Ronda de giros gratis.",
  activity: "slot",
  entities: [{ label: "Juego", value: "Sweet Bonanza" }],
  chat_line: "Sweet Bonanza en giros gratis",
  changes: "",
  confidence: "high",
  uncertain: [],
};

let calls = [];
let nextOutcome;
let server;
let base;

function listen(app) {
  return new Promise((resolve) => {
    const s = http.createServer(app).listen(0, "127.0.0.1", () => resolve(s));
  });
}

const post = (body, headers = {}) =>
  fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

before(async () => {
  const app = createApp({
    analyze: async (req) => {
      calls.push(req);
      if (nextOutcome instanceof Error) throw nextOutcome;
      return nextOutcome;
    },
    credentialsConfigured: true,
    model: "modelo-prueba",
    now: () => new Date("2026-01-01T00:00:00Z"),
  });
  server = await listen(app);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test("GET /api/config lista modos y modelo", async () => {
  const body = await (await fetch(`${base}/api/config`)).json();
  assert.equal(body.model, "modelo-prueba");
  assert.equal(body.credentialsConfigured, true);
  assert.ok(body.modes.some((m) => m.id === "casino"));
  assert.deepEqual(body.languages, ["es", "en"]);
});

test("sirve la página principal, el overlay y los scripts con cabeceras de seguridad", async () => {
  for (const [path, type] of [["/", "text/html"], ["/overlay", "text/html"], ["/app.js", "text/javascript"], ["/capture.js", "text/javascript"], ["/styles.css", "text/css"]]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, path);
    assert.ok(res.headers.get("content-type").startsWith(type), path);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  }
});

test("no sirve rutas fuera de public/", async () => {
  for (const path of ["/../package.json", "/%2e%2e/package.json", "/package.json", "/src/app.js", "/.env"]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 404, path);
  }
});

test("POST /api/analyze devuelve el contexto y publica el último", async () => {
  calls = [];
  nextOutcome = { refused: false, result: CONTEXT, model: "modelo-prueba", usage: { input_tokens: 10, output_tokens: 5 } };
  const res = await post({ image: IMG, mode: "casino", note: "stake" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.refused, false);
  assert.equal(body.context.title, "Jugando Sweet Bonanza");
  assert.equal(body.meta.usage.output_tokens, 5);
  assert.equal(calls[0].mode, "casino");
  assert.equal(calls[0].note, "stake");

  const { latest } = await (await fetch(`${base}/api/latest`)).json();
  assert.equal(latest.title, "Jugando Sweet Bonanza");
  assert.equal(latest.at, "2026-01-01T00:00:00.000Z");
  assert.equal(latest.mode, "casino");
});

test("publish:false no cambia el último contexto publicado", async () => {
  nextOutcome = { refused: false, result: { ...CONTEXT, title: "Otro" }, model: "m", usage: { input_tokens: 1, output_tokens: 1 } };
  await post({ image: IMG, publish: false });
  const { latest } = await (await fetch(`${base}/api/latest`)).json();
  assert.equal(latest.title, "Jugando Sweet Bonanza");
});

test("una negativa del modelo se devuelve con refused:true y no se publica", async () => {
  nextOutcome = { refused: true, reason: "cyber", model: "m" };
  const body = await (await post({ image: IMG })).json();
  assert.equal(body.refused, true);
  assert.equal(body.reason, "cyber");
  const { latest } = await (await fetch(`${base}/api/latest`)).json();
  assert.equal(latest.title, "Jugando Sweet Bonanza");
});

test("valida entrada: JSON roto, content-type, imagen y tamaño", async () => {
  assert.equal((await post("{no json")).status, 400);
  const wrongType = await fetch(`${base}/api/analyze`, { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify({ image: IMG }) });
  assert.equal(wrongType.status, 415);
  assert.equal((await post({ image: "nada" })).status, 400);
  const huge = await post(JSON.stringify({ image: IMG, note: "x".repeat(7 * 1024 * 1024) }));
  assert.equal(huge.status, 413);
});

test("los errores del analizador se traducen a su estado HTTP", async () => {
  nextOutcome = new HttpError(429, "rate_limited", "Demasiadas peticiones");
  const res = await post({ image: IMG });
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: "rate_limited", message: "Demasiadas peticiones" });
});

test("un error inesperado devuelve 500 sin filtrar detalles", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    nextOutcome = new Error("secreto interno");
    const res = await post({ image: IMG });
    assert.equal(res.status, 500);
    assert.doesNotMatch(JSON.stringify(await res.json()), /secreto/);
  } finally {
    console.error = original;
  }
});

test("rechaza un Host que no es localhost (DNS rebinding)", async () => {
  const status = await new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path: "/api/latest", headers: { host: "evil.example" } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal(status, 403);
});

test("sin credenciales responde 503 y no llama al analizador", async () => {
  calls = [];
  const s = await listen(createApp({ analyze: async () => assert.fail("no debe llamarse"), credentialsConfigured: false, model: "m" }));
  try {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: IMG }),
    });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, "missing_api_key");
  } finally {
    s.close();
  }
});
