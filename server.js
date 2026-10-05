// El visor: interfaz web, vigilancia de pantalla y overlay de OBS.
// El análisis lo hace un motor local o, si hay PANTALLA_ANALYZER_URL, otro proceso (analyzer.js).
import http from "node:http";
import { createApp } from "./src/app.js";
import { createBackend } from "./src/backends/index.js";
import { loadConfig } from "./src/config.js";
import { createWebhook } from "./src/webhook.js";

let config;
let backend;
try {
  config = loadConfig(process.env);
  backend = createBackend(config);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const onContext = config.webhook ? createWebhook(config.webhook) : undefined;
const shown = config.host === "::1" ? "[::1]" : config.host;

http.createServer(createApp({ backend, loopbackOnly: config.loopbackOnly, onContext })).listen(config.port, config.host, async () => {
  console.log(`Pantalla Contexto (visor) en http://${shown}:${config.port}`);
  console.log(`Overlay para OBS:           http://${shown}:${config.port}/overlay`);
  console.log(`Contexto para otra IA:      http://${shown}:${config.port}/api/context?format=prompt`);
  if (config.webhook) console.log(`Webhook: cada contexto nuevo se envía a ${config.webhook.url}`);
  const info = await backend.info();
  if (info.ready) {
    console.log(`Analizador: ${info.name} · ${info.model} · ${info.cost}`);
  } else {
    console.warn(`AVISO: ${info.hint}`);
  }
  if (!config.loopbackOnly) {
    console.warn("AVISO: escuchando fuera de localhost. Cualquiera con acceso podrá usar tu analizador.");
  }
});
