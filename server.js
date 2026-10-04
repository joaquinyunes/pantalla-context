// El visor: interfaz web, vigilancia de pantalla y overlay de OBS.
// El análisis lo hace un motor local o, si hay PANTALLA_ANALYZER_URL, otro proceso (analyzer.js).
import http from "node:http";
import { createApp } from "./src/app.js";
import { createBackend } from "./src/backends/index.js";
import { loadConfig } from "./src/config.js";

let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const backend = createBackend(config);
const shown = config.host === "::1" ? "[::1]" : config.host;

http.createServer(createApp({ backend, loopbackOnly: config.loopbackOnly })).listen(config.port, config.host, async () => {
  console.log(`Pantalla Contexto (visor) en http://${shown}:${config.port}`);
  console.log(`Overlay para OBS:           http://${shown}:${config.port}/overlay`);
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
