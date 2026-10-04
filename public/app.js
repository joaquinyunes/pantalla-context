import {
  fitSize,
  frameDifference,
  isRegionTooSmall,
  luminance,
  normalizeRect,
  toSourceRect,
} from "/capture.js";

const $ = (id) => document.getElementById(id);

const CATEGORY_LABELS = {
  casino: "Casino",
  sports_betting: "Apuestas deportivas",
  sports_live: "Deporte en directo",
  video_game: "Videojuego",
  streaming: "Streaming",
  trading: "Trading",
  video_media: "Vídeo",
  productivity: "Trabajo",
  social: "Redes sociales",
  other: "Otro",
};
const CONFIDENCE_LABELS = { low: "confianza baja", medium: "confianza media", high: "confianza alta" };
// Errores tras los cuales seguir en automático no tiene sentido.
const FATAL_CODES = new Set(["missing_api_key", "upstream_auth", "upstream_bad_request", "bad_host"]);
const CHANGE_THRESHOLD = 0.02;
const MAX_HISTORY = 20;
const SETTINGS_KEY = "pantalla-contexto:settings";

const els = {
  banner: $("banner"),
  shareBtn: $("shareBtn"),
  selectBtn: $("selectBtn"),
  fullBtn: $("fullBtn"),
  selectionInfo: $("selectionInfo"),
  placeholder: $("placeholder"),
  frame: $("frame"),
  video: $("video"),
  canvas: $("selectionCanvas"),
  modeSelect: $("modeSelect"),
  languageSelect: $("languageSelect"),
  noteInput: $("noteInput"),
  analyzeBtn: $("analyzeBtn"),
  autoCheck: $("autoCheck"),
  intervalSelect: $("intervalSelect"),
  changesCheck: $("changesCheck"),
  publishCheck: $("publishCheck"),
  status: $("status"),
  card: $("card"),
  categoryBadge: $("categoryBadge"),
  confidence: $("confidence"),
  cardTitle: $("cardTitle"),
  cardSummary: $("cardSummary"),
  cardChanges: $("cardChanges"),
  entities: $("entities"),
  chatLine: $("chatLine"),
  copyChatBtn: $("copyChatBtn"),
  uncertainBox: $("uncertainBox"),
  uncertainList: $("uncertainList"),
  shot: $("shot"),
  meta: $("meta"),
  historyBox: $("historyBox"),
  historyList: $("historyList"),
  copyOverlayBtn: $("copyOverlayBtn"),
};

const state = {
  stream: null,
  selection: null, // rectángulo normalizado, o null = pantalla completa
  selecting: false,
  busy: false,
  autoTimer: null,
  lastThumb: null, // miniatura del último fotograma analizado, para detectar cambios
  promptHistory: [], // análisis previos que se mandan al modelo para el campo "changes"
  history: [], // lo que se muestra en el panel de historial
  selectedHistory: -1,
};

// ---------- ajustes ----------

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        mode: els.modeSelect.value,
        language: els.languageSelect.value,
        note: els.noteInput.value,
        interval: els.intervalSelect.value,
        onlyChanges: els.changesCheck.checked,
        publish: els.publishCheck.checked,
      }),
    );
  } catch {
    // Sin almacenamiento (modo privado, etc.): la app funciona igual.
  }
}

// ---------- estado y mensajes ----------

function setStatus(text, kind = "") {
  els.status.textContent = text;
  els.status.className = `status ${kind}`.trim();
}

function showBanner(text) {
  els.banner.textContent = text;
  els.banner.hidden = !text;
}

function syncControls() {
  const sharing = Boolean(state.stream);
  els.selectBtn.disabled = !sharing;
  els.fullBtn.disabled = !sharing || !state.selection;
  els.analyzeBtn.disabled = !sharing || state.busy;
  els.autoCheck.disabled = !sharing;
  els.shareBtn.textContent = sharing ? "Dejar de compartir" : "Compartir pantalla";
  els.shareBtn.classList.toggle("primary", !sharing);
  els.selectBtn.classList.toggle("active", state.selecting);
  els.frame.classList.toggle("selecting", state.selecting);
  els.placeholder.hidden = sharing;
  els.frame.hidden = !sharing;
  updateSelectionInfo();
}

function updateSelectionInfo() {
  if (!state.stream) {
    els.selectionInfo.textContent = "";
  } else if (state.selecting) {
    els.selectionInfo.textContent = "Arrastra sobre la imagen para elegir la zona.";
  } else if (state.selection) {
    const r = toSourceRect(state.selection, els.video.videoWidth, els.video.videoHeight);
    els.selectionInfo.textContent = `Zona elegida: ${r.w}×${r.h} px`;
  } else {
    els.selectionInfo.textContent = "Se analiza la pantalla completa.";
  }
}

// ---------- compartir pantalla ----------

async function startShare() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    setStatus("Este navegador no permite compartir pantalla. Usa Chrome, Edge o Firefox de escritorio.", "error");
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5 }, audio: false });
  } catch (err) {
    setStatus(
      err.name === "NotAllowedError" ? "Cancelaste el permiso para compartir pantalla." : `No se pudo capturar la pantalla: ${err.message}`,
      "error",
    );
    return;
  }
  state.stream = stream;
  stream.getVideoTracks()[0].addEventListener("ended", stopShare);
  els.video.srcObject = stream;
  await els.video.play().catch(() => {});
  resetSelection();
  setStatus("Pantalla compartida. Pulsa «Analizar ahora» o activa el modo automático.");
  syncControls();
  resizeCanvas();
}

function stopShare() {
  stopAuto();
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  els.video.srcObject = null;
  state.selecting = false;
  state.lastThumb = null;
  state.promptHistory = [];
  syncControls();
  if (!state.busy) setStatus("Dejaste de compartir la pantalla.");
}

// ---------- selección de zona ----------

const ctx2d = els.canvas.getContext("2d");
let draft = null; // {start, current} mientras se arrastra

function resizeCanvas() {
  els.canvas.width = els.canvas.clientWidth;
  els.canvas.height = els.canvas.clientHeight;
  drawSelection();
}

function drawSelection() {
  const { width: W, height: H } = els.canvas;
  ctx2d.clearRect(0, 0, W, H);
  const rect = draft ? normalizeRect(draft.start, draft.current) : state.selection;
  if (!rect) return;
  const x = rect.x * W;
  const y = rect.y * H;
  const w = rect.w * W;
  const h = rect.h * H;
  ctx2d.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx2d.fillRect(0, 0, W, H);
  ctx2d.clearRect(x, y, w, h);
  ctx2d.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#5eead4";
  ctx2d.lineWidth = 2;
  ctx2d.setLineDash([6, 4]);
  ctx2d.strokeRect(x, y, w, h);
}

function pointerToNormalized(e) {
  const box = els.canvas.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
    y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
  };
}

function resetSelection() {
  state.selection = null;
  state.selecting = false;
  state.lastThumb = null;
  state.promptHistory = [];
  drawSelection();
}

els.selectBtn.addEventListener("click", () => {
  state.selecting = !state.selecting;
  syncControls();
});

els.fullBtn.addEventListener("click", () => {
  resetSelection();
  syncControls();
});

els.canvas.addEventListener("pointerdown", (e) => {
  if (!state.selecting) return;
  els.canvas.setPointerCapture(e.pointerId);
  const p = pointerToNormalized(e);
  draft = { start: p, current: p };
  drawSelection();
});

els.canvas.addEventListener("pointermove", (e) => {
  if (!draft) return;
  draft.current = pointerToNormalized(e);
  drawSelection();
});

els.canvas.addEventListener("pointerup", (e) => {
  if (!draft) return;
  draft.current = pointerToNormalized(e);
  const rect = normalizeRect(draft.start, draft.current);
  draft = null;
  const source = toSourceRect(rect, els.video.videoWidth, els.video.videoHeight);
  if (isRegionTooSmall(source)) {
    setStatus("La zona es demasiado pequeña. Arrastra un rectángulo más grande.", "error");
  } else {
    state.selection = rect;
    state.selecting = false;
    state.lastThumb = null;
    state.promptHistory = [];
    setStatus("Zona elegida. Pulsa «Analizar ahora».");
  }
  drawSelection();
  syncControls();
});

els.canvas.addEventListener("pointercancel", () => {
  draft = null;
  drawSelection();
});

new ResizeObserver(resizeCanvas).observe(els.frame);
els.video.addEventListener("loadedmetadata", () => {
  resizeCanvas();
  updateSelectionInfo();
});

// ---------- captura ----------

function captureFrame() {
  const { videoWidth, videoHeight } = els.video;
  if (!videoWidth || !videoHeight) throw new Error("El vídeo todavía no está listo.");
  const src = toSourceRect(state.selection, videoWidth, videoHeight);
  if (isRegionTooSmall(src)) throw new Error("La zona elegida es demasiado pequeña.");

  const out = fitSize(src.w, src.h);
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext("2d").drawImage(els.video, src.x, src.y, src.w, src.h, 0, 0, out.width, out.height);

  const tiny = document.createElement("canvas");
  tiny.width = 32;
  tiny.height = 18;
  const tinyCtx = tiny.getContext("2d", { willReadFrequently: true });
  tinyCtx.drawImage(canvas, 0, 0, tiny.width, tiny.height);
  const thumb = luminance(tinyCtx.getImageData(0, 0, tiny.width, tiny.height).data);

  const preview = document.createElement("canvas");
  const previewSize = fitSize(src.w, src.h, 320);
  preview.width = previewSize.width;
  preview.height = previewSize.height;
  preview.getContext("2d").drawImage(canvas, 0, 0, preview.width, preview.height);

  return {
    image: canvas.toDataURL("image/jpeg", 0.85),
    thumb,
    preview: preview.toDataURL("image/jpeg", 0.7),
  };
}

// ---------- análisis ----------

async function analyze({ skipUnchanged }) {
  if (state.busy || !state.stream) return { ok: false };

  let frame;
  try {
    frame = captureFrame();
  } catch (err) {
    setStatus(err.message, "error");
    return { ok: false };
  }

  if (skipUnchanged && state.lastThumb && frameDifference(state.lastThumb, frame.thumb) < CHANGE_THRESHOLD) {
    setStatus("Sin cambios en la imagen; análisis omitido.");
    return { ok: true, skipped: true };
  }

  state.busy = true;
  syncControls();
  setStatus("Analizando…", "busy");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: frame.image,
        mode: els.modeSelect.value,
        language: els.languageSelect.value,
        note: els.noteInput.value.trim(),
        history: state.promptHistory,
        publish: els.publishCheck.checked,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message ?? `Error ${response.status}`);
      error.code = body.error;
      throw error;
    }
    if (body.refused) {
      setStatus("El modelo no pudo analizar esta captura (política de seguridad).", "error");
      return { ok: false };
    }

    state.lastThumb = frame.thumb;
    state.promptHistory = [...state.promptHistory, { title: body.context.title, summary: body.context.summary }].slice(-3);
    addToHistory({ context: body.context, meta: body.meta, preview: frame.preview, at: new Date() });
    setStatus(`Listo en ${(body.meta.elapsed_ms / 1000).toFixed(1)} s.`);
    return { ok: true };
  } catch (err) {
    setStatus(err.message, "error");
    return { ok: false, fatal: FATAL_CODES.has(err.code), code: err.code };
  } finally {
    state.busy = false;
    syncControls();
  }
}

// ---------- resultados e historial ----------

function render(entry) {
  const { context, meta, preview } = entry;
  els.card.hidden = false;
  els.categoryBadge.textContent = CATEGORY_LABELS[context.category] ?? context.category;
  els.confidence.textContent = CONFIDENCE_LABELS[context.confidence] ?? "";
  els.cardTitle.textContent = context.title;
  els.cardSummary.textContent = context.summary;
  els.cardChanges.hidden = !context.changes;
  els.cardChanges.textContent = context.changes ? `Novedad: ${context.changes}` : "";

  els.entities.replaceChildren(
    ...context.entities.flatMap((e) => {
      const dt = document.createElement("dt");
      dt.textContent = e.label;
      const dd = document.createElement("dd");
      dd.textContent = e.value;
      return [dt, dd];
    }),
  );

  els.chatLine.textContent = context.chat_line;
  els.uncertainBox.hidden = context.uncertain.length === 0;
  els.uncertainList.replaceChildren(
    ...context.uncertain.map((u) => {
      const li = document.createElement("li");
      li.textContent = u;
      return li;
    }),
  );

  els.shot.hidden = !preview;
  if (preview) els.shot.src = preview;
  els.meta.textContent = `${meta.model} · ${meta.usage.input_tokens} tokens de entrada / ${meta.usage.output_tokens} de salida`;
}

function addToHistory(entry) {
  state.history.push(entry);
  if (state.history.length > MAX_HISTORY) state.history.shift();
  state.selectedHistory = state.history.length - 1;
  render(entry);
  renderHistory();
}

function renderHistory() {
  els.historyBox.hidden = state.history.length === 0;
  els.historyList.replaceChildren(
    ...state.history
      .map((entry, index) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        if (index === state.selectedHistory) button.setAttribute("aria-current", "true");
        const time = document.createElement("time");
        time.textContent = entry.at.toLocaleTimeString();
        button.append(time, entry.context.title);
        button.addEventListener("click", () => {
          state.selectedHistory = index;
          render(entry);
          renderHistory();
        });
        li.append(button);
        return li;
      })
      .reverse(),
  );
}

// ---------- modo automático ----------

function stopAuto() {
  clearTimeout(state.autoTimer);
  state.autoTimer = null;
  els.autoCheck.checked = false;
}

function scheduleAuto(delayMs) {
  clearTimeout(state.autoTimer);
  state.autoTimer = setTimeout(runAuto, delayMs);
}

async function runAuto() {
  if (!els.autoCheck.checked || !state.stream) return;
  const intervalMs = Number(els.intervalSelect.value) * 1000;
  const result = await analyze({ skipUnchanged: els.changesCheck.checked });
  if (result.fatal) {
    stopAuto();
    return;
  }
  // Si la API limita las peticiones, damos un respiro extra antes de reintentar.
  scheduleAuto(result.code === "rate_limited" ? intervalMs + 30_000 : intervalMs);
}

els.autoCheck.addEventListener("change", () => {
  if (els.autoCheck.checked) runAuto();
  else stopAuto();
});

// ---------- eventos varios ----------

els.shareBtn.addEventListener("click", () => (state.stream ? stopShare() : startShare()));
els.analyzeBtn.addEventListener("click", () => analyze({ skipUnchanged: false }));

els.modeSelect.addEventListener("change", () => {
  state.promptHistory = [];
  saveSettings();
});
for (const el of [els.languageSelect, els.noteInput, els.intervalSelect, els.changesCheck, els.publishCheck]) {
  el.addEventListener("change", saveSettings);
}

async function copyText(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(okMessage);
  } catch {
    setStatus("No se pudo copiar al portapapeles.", "error");
  }
}

els.copyChatBtn.addEventListener("click", () => copyText(els.chatLine.textContent, "Frase copiada."));
els.copyOverlayBtn.addEventListener("click", () =>
  copyText(`${location.origin}/overlay`, "URL del overlay copiada. En OBS: Fuentes → Navegador → pega la URL."),
);

// ---------- arranque ----------

async function init() {
  const settings = loadSettings();
  els.noteInput.value = settings.note ?? "";
  els.languageSelect.value = settings.language ?? "es";
  els.intervalSelect.value = settings.interval ?? "10";
  els.changesCheck.checked = settings.onlyChanges ?? true;
  els.publishCheck.checked = settings.publish ?? true;

  try {
    const config = await (await fetch("/api/config")).json();
    els.modeSelect.replaceChildren(
      ...config.modes.map((m) => {
        const option = document.createElement("option");
        option.value = m.id;
        option.textContent = m.label;
        return option;
      }),
    );
    els.modeSelect.value = config.modes.some((m) => m.id === settings.mode) ? settings.mode : "auto";
    if (!config.credentialsConfigured) {
      showBanner("Falta la API key de Anthropic: define ANTHROPIC_API_KEY (ver .env.example) y reinicia el servidor.");
    }
  } catch {
    showBanner("No se pudo contactar con el servidor local.");
  }
  syncControls();
}

init();
