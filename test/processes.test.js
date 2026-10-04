import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { after, test } from "node:test";
import { GOOD_RESULT, startMock } from "./helpers.js";

// Prueba de humo con los procesos reales: el visor (server.js) y el analizador (analyzer.js)
// hablando por HTTP, con un Ollama simulado detrás. Comprueba el cableado de los puntos de entrada.

const children = [];
after(() => children.forEach((c) => c.kill()));

async function freePort() {
  const s = http.createServer().listen(0, "127.0.0.1");
  await new Promise((r) => s.once("listening", r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}

function launch(script, env) {
  const child = spawn(process.execPath, [script], {
    cwd: new URL("..", import.meta.url).pathname,
    env: { PATH: process.env.PATH, ...env },
  });
  children.push(child);
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const started = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${script} no arrancó:\n${output}`)), 8000);
    const check = setInterval(() => {
      if (/en http:\/\//.test(output)) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 50);
    child.once("exit", (code) => {
      clearTimeout(timer);
      clearInterval(check);
      reject(new Error(`${script} terminó con código ${code}:\n${output}`));
    });
  });
  return { child, started, output: () => output };
}

const exitOf = (child) => new Promise((resolve) => child.once("exit", resolve));

test("visor -> analizador (con token) -> Ollama: la captura llega y vuelve el contexto", async () => {
  const ollama = await startMock((req) =>
    req.url === "/api/tags"
      ? { json: { models: [{ name: "qwen3-vl:2b" }] } }
      : { json: { message: { content: JSON.stringify(GOOD_RESULT) }, done: true, done_reason: "stop", prompt_eval_count: 600, eval_count: 80 } },
  );
  const [analyzerPort, viewerPort] = [await freePort(), await freePort()];
  const token = "token-de-prueba-largo";

  const analyzer = launch("analyzer.js", { PANTALLA_BACKEND: "ollama", OLLAMA_HOST: ollama.url, PANTALLA_ANALYZER_PORT: String(analyzerPort), PANTALLA_ANALYZER_TOKEN: token });
  await analyzer.started;
  const viewer = launch("server.js", { PORT: String(viewerPort), PANTALLA_ANALYZER_URL: `http://127.0.0.1:${analyzerPort}`, PANTALLA_ANALYZER_TOKEN: token });
  await viewer.started;

  try {
    const config = await (await fetch(`http://127.0.0.1:${viewerPort}/api/config`)).json();
    assert.deepEqual([config.backend.ready, config.backend.name, config.backend.cost], [true, "ollama (remoto)", "free-local"]);

    const res = await fetch(`http://127.0.0.1:${viewerPort}/api/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64,QUJDRA==", mode: "casino" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.context.title, "Jugando Sweet Bonanza");
    assert.deepEqual(body.meta.usage, { input_tokens: 600, output_tokens: 80 });

    const chat = ollama.requests.find((r) => r.path === "/api/chat");
    assert.deepEqual(chat.body.messages[1].images, ["QUJDRA=="]);

    // El analizador exige el token: sin él, 401.
    const direct = await fetch(`http://127.0.0.1:${analyzerPort}/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(direct.status, 401);

    // El visor publica el contexto para el overlay.
    const { latest } = await (await fetch(`http://127.0.0.1:${viewerPort}/api/latest`)).json();
    assert.equal(latest.title, "Jugando Sweet Bonanza");
  } finally {
    await ollama.close();
  }
});

test("el analizador se niega a escuchar fuera de localhost sin token", async () => {
  const analyzer = launch("analyzer.js", { PANTALLA_ANALYZER_HOST: "0.0.0.0", PANTALLA_ANALYZER_PORT: String(await freePort()) });
  analyzer.started.catch(() => {});
  assert.equal(await exitOf(analyzer.child), 1);
  assert.match(analyzer.output(), /PANTALLA_ANALYZER_TOKEN/);
});

test("un valor de configuración inválido detiene el arranque con un mensaje claro", async () => {
  const viewer = launch("server.js", { PANTALLA_BACKEND: "gpt", PORT: String(await freePort()) });
  viewer.started.catch(() => {});
  assert.equal(await exitOf(viewer.child), 1);
  assert.match(viewer.output(), /PANTALLA_BACKEND inválido/);
});

test("sin ningún motor disponible el visor arranca y explica las opciones", async () => {
  const dead = await startMock(() => ({}));
  const deadUrl = dead.url;
  await dead.close();
  const viewer = launch("server.js", { PORT: String(await freePort()), OLLAMA_HOST: deadUrl });
  await viewer.started;
  await new Promise((r) => setTimeout(r, 400));
  assert.match(viewer.output(), /AVISO: No hay analizador disponible/);
  assert.match(viewer.output(), /ollama pull qwen3-vl:2b/);
});
