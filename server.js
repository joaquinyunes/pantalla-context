import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { createApp } from "./src/app.js";
import { createAnalyzer, DEFAULT_MODEL } from "./src/analyzer.js";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const model = process.env.PANTALLA_MODEL || DEFAULT_MODEL;
const effort = process.env.PANTALLA_EFFORT || "low";
const fallbacks = process.env.PANTALLA_FALLBACKS !== "0";

if (!EFFORTS.includes(effort)) {
  console.error(`PANTALLA_EFFORT inválido: "${effort}". Usa uno de: ${EFFORTS.join(", ")}.`);
  process.exit(1);
}

const credentialsConfigured = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE,
);

const client = new Anthropic({ timeout: 60_000 });
const analyze = createAnalyzer({ client, model, effort, fallbacks });
const loopbackOnly = host === "127.0.0.1" || host === "localhost" || host === "::1";

http.createServer(createApp({ analyze, credentialsConfigured, model, loopbackOnly })).listen(port, host, () => {
  console.log(`Pantalla Contexto en http://${host === "::1" ? "[::1]" : host}:${port}`);
  console.log(`Overlay para OBS:   http://${host === "::1" ? "[::1]" : host}:${port}/overlay`);
  console.log(`Modelo: ${model} (esfuerzo: ${effort}, fallbacks: ${fallbacks ? "sí" : "no"})`);
  if (!credentialsConfigured) {
    console.warn("AVISO: no hay ANTHROPIC_API_KEY. Copia .env.example a .env y ponla, o exporta la variable.");
  }
  if (!loopbackOnly) {
    console.warn("AVISO: escuchando fuera de localhost. Cualquiera con acceso podrá gastar tu API key.");
  }
});
