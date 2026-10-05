import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { normalizeResult } from "../src/validate.js";
import { GOOD_RESULT } from "./helpers.js";

const IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const published = [];
let clock = new Date("2026-01-01T00:00:00Z");
let title = "Jugando Sweet Bonanza";
let hookFails = false;
let server;
let base;

const backend = {
  info: async () => ({ ready: true, name: "ocr", model: "tesseract (eng)", cost: "free-local", local: true, maxSide: 1600 }),
  analyze: async () => ({ refused: false, result: normalizeResult({ ...GOOD_RESULT, title, text: "SWEET BONANZA\nBALANCE €10.00" }), model: "tesseract (eng)", usage: { input_tokens: 0, output_tokens: 0 } }),
};

before(async () => {
  const app = createApp({
    backend,
    now: () => clock,
    onContext: (entry) => {
      published.push(entry);
      if (hookFails) throw new Error("el webhook explotó");
    },
  });
  server = http.createServer(app).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const analyze = (body = {}) =>
  fetch(`${base}/api/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: IMG, ...body }) });

// Cliente mínimo de Server-Sent Events: acumula los eventos «context» que van llegando.
function listen() {
  return new Promise((resolve, reject) => {
    const events = [];
    let buffer = "";
    const waiters = [];
    const req = http.get(`${base}/api/events`, (res) => {
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buffer += chunk;
        for (let i = buffer.indexOf("\n\n"); i !== -1; i = buffer.indexOf("\n\n")) {
          const block = buffer.slice(0, i);
          buffer = buffer.slice(i + 2);
          const data = /^data: (.*)$/m.exec(block);
          if (/^event: context/m.test(block) && data) {
            events.push(JSON.parse(data[1]));
            waiters.splice(0).forEach((w) => w());
          }
        }
      });
      resolve({
        res,
        events,
        close: () => req.destroy(),
        next: (count) => new Promise((ok, no) => {
          const check = () => (events.length >= count ? ok(events) : waiters.push(check));
          setTimeout(() => no(new Error(`solo llegaron ${events.length} eventos`)), 3000).unref();
          check();
        }),
      });
    });
    req.on("error", reject);
  });
}

test("/api/context sin análisis: json con latest:null; text y prompt explican cómo conseguir uno", async () => {
  assert.deepEqual(await (await fetch(`${base}/api/context`)).json(), { latest: null, age_seconds: null });
  const text = await fetch(`${base}/api/context?format=text`);
  assert.equal(text.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.match(await text.text(), /No hay contexto todavía/);
  assert.match(await (await fetch(`${base}/api/context?format=prompt&lang=en`)).text(), /There is no context yet/);
});

test("/api/context devuelve el último análisis en json, texto y prompt, con su edad", async () => {
  assert.equal((await analyze({ language: "en", mode: "casino" })).status, 200);
  clock = new Date("2026-01-01T00:00:42Z");

  const json = await (await fetch(`${base}/api/context`)).json();
  assert.equal(json.age_seconds, 42);
  assert.deepEqual([json.latest.title, json.latest.language, json.latest.mode, json.latest.text], ["Jugando Sweet Bonanza", "en", "casino", "SWEET BONANZA\nBALANCE €10.00"]);

  const text = await (await fetch(`${base}/api/context?format=text`)).text();
  assert.match(text, /^SCREEN CONTEXT \(42 s ago\)\nType: Casino/, "usa el idioma del análisis por defecto");
  assert.match(text, /SWEET BONANZA\nBALANCE €10\.00/);
  assert.match(await (await fetch(`${base}/api/context?format=text&lang=es`)).text(), /^CONTEXTO DE PANTALLA \(hace 42 s\)/, "?lang= manda sobre el idioma del análisis");
  assert.match(await (await fetch(`${base}/api/context?format=prompt`)).text(), /^Below is the context[\s\S]*SCREEN CONTEXT/);
});

test("un formato desconocido es un 400", async () => {
  const res = await fetch(`${base}/api/context?format=xml`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "bad_format");
});

test("/api/latest sigue sirviendo el mismo contexto (lo usa el overlay)", async () => {
  assert.equal((await (await fetch(`${base}/api/latest`)).json()).latest.title, "Jugando Sweet Bonanza");
});

test("/api/events: un cliente nuevo recibe el último contexto y los siguientes en cuanto se publican", async () => {
  const a = await listen();
  try {
    assert.equal(a.res.headers["content-type"], "text/event-stream; charset=utf-8");
    await a.next(1);
    assert.equal(a.events[0].title, "Jugando Sweet Bonanza", "al conectar llega el estado actual");
    title = "Gates of Olympus";
    await analyze();
    await a.next(2);
    assert.equal(a.events[1].title, "Gates of Olympus");
  } finally {
    a.close();
  }
});

test("/api/events: varios clientes reciben lo mismo y un cliente que se va no afecta a los demás", async () => {
  const [a, b] = [await listen(), await listen()];
  try {
    await Promise.all([a.next(1), b.next(1)]);
    a.close();
    await new Promise((r) => setTimeout(r, 100));
    title = "Sugar Rush";
    assert.equal((await analyze()).status, 200, "publicar con un cliente desconectado no falla");
    await b.next(2);
    assert.equal(b.events[1].title, "Sugar Rush");
  } finally {
    a.close();
    b.close();
  }
});

test("onContext recibe cada publicación y sus fallos nunca rompen el análisis", async () => {
  published.length = 0;
  hookFails = true;
  title = "Big Bass Bonanza";
  const res = await analyze({ language: "es" });
  hookFails = false;
  assert.equal(res.status, 200);
  assert.equal(published.length, 1);
  assert.deepEqual([published[0].title, published[0].language, published[0].at], ["Big Bass Bonanza", "es", clock.toISOString()]);
});

test("con publish:false no se difunde ni se llama al webhook", async () => {
  published.length = 0;
  const l = await listen();
  try {
    await l.next(1);
    const before = l.events.length;
    title = "No publicar";
    await analyze({ publish: false });
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(l.events.length, before);
    assert.equal(published.length, 0);
  } finally {
    l.close();
  }
});
