import { buildIndex, findNamesInLine, mergeKnowledge, normalizeText } from "./knowledge.js";

// Convierte las líneas que lee el OCR en un contexto estructurado, SIN ningún modelo de IA: solo reglas.
// Reconoce importes, marcador, minuto, cuotas, nombres del catálogo y decide el tipo de contenido por puntuación.
// Es honesto sobre sus límites: no entiende imágenes, solo texto, y lo dice en `uncertain` cuando deduce algo.

const L = {
  es: {
    game: "Juego", provider: "Proveedor", site: "Sitio", league: "Competición", match: "Partido", score: "Marcador", clock: "Minuto",
    odds: "Cuotas", balance: "Saldo", bet: "Apuesta", win: "Ganancia", spins: "Giros gratis", multiplier: "Multiplicador",
    pair: "Par", price: "Precio", timeframe: "Temporalidad", round: "Ronda", platform: "Plataforma", app: "App", live: "En directo", viewers: "Espectadores",
    casino: "Casino", sports: "Apuestas deportivas", sportsLive: "Deporte", game_: "Videojuego", trading: "Trading", stream: "Streaming",
    video: "Vídeo", work: "Trabajo", social: "Redes sociales", other: "Pantalla", unknownGame: "juego sin identificar", detected: "Texto detectado",
    noText: "No se detectó texto legible en la zona.",
    onlyText: "Análisis solo por texto (OCR): no interpreta imágenes, solo lo que está escrito.",
    deduced: "El nombre se dedujo del texto más grande; no está en el catálogo.",
    lowOcr: "El OCR leyó con poca seguridad: puede haber errores.",
    before: "Antes",
    hint: "Pista",
    fromHint: "Algún nombre se tomó de tu pista, no de la pantalla.",
  },
  en: {
    game: "Game", provider: "Provider", site: "Site", league: "Competition", match: "Match", score: "Score", clock: "Minute",
    odds: "Odds", balance: "Balance", bet: "Bet", win: "Win", spins: "Free spins", multiplier: "Multiplier",
    pair: "Pair", price: "Price", timeframe: "Timeframe", round: "Round", platform: "Platform", app: "App", live: "Live", viewers: "Viewers",
    casino: "Casino", sports: "Sports betting", sportsLive: "Sports", game_: "Video game", trading: "Trading", stream: "Streaming",
    video: "Video", work: "Work", social: "Social media", other: "Screen", unknownGame: "unidentified game", detected: "Detected text",
    noText: "No readable text was detected in the area.",
    onlyText: "Text-only analysis (OCR): it does not interpret images, only what is written.",
    deduced: "The name was deduced from the largest text; it is not in the catalog.",
    lowOcr: "The OCR read with low confidence: there may be errors.",
    before: "Before",
    hint: "Hint",
    fromHint: "Some name was taken from your hint, not from the screen.",
  },
};

const MONEY = String.raw`(?:[€$£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|\$|£|USD|EUR|MXN|ARS|COP|CLP|PEN|BRL))`;
const LABELS = [
  { key: "balance", re: /\b(?:balance|saldo|credits?|creditos?)\b/i },
  { key: "bet", re: /\b(?:total bet|bet|apuesta total|apuesta|stake|wager)\b/i },
  { key: "win", re: /\b(?:total win|win|ganancia|ganancias|premio|payout|you won|has ganado)\b/i },
];

// Palabras que suman puntos a cada tipo de contenido (sobre texto normalizado, sin acentos).
const TERMS = {
  casino: /\b(?:balance|saldo|spin|spins|giros?|free spins|multiplier|multiplicador|jackpot|bonus|ruleta|roulette|blackjack|baccarat|slots?|casino|autoplay|buy feature|wild|scatter|payline|megaways|dealer|crupier)\b/g,
  sports_betting: /\b(?:cuotas?|odds|bet slip|boleto|cupon|apuesta simple|apuesta combinada|parlay|handicap|1x2|over under|mas de|menos de|mercado|market|cash out|moneyline|en vivo|live betting|apostar)\b/g,
  sports_live: /\b(?:half|tiempo|parte|periodo|period|quarter|cuarto|set|descanso|halftime|fulltime|prorroga|overtime|gol|goal|minuto)\b/g,
  video_game: /\b(?:hp|health|armor|ammo|kills?|deaths?|assists?|k d|round|level|nivel|xp|respawn|victory|victoria|defeat|derrota|mmr|rank|ranked|competitive|loadout|mission|quest|inventory|inventario|score|squad|lobby)\b/g,
  streaming: /\b(?:viewers|espectadores|followers|seguidores|subscribe|suscribirse|suscriptores|raid|clip|chat|stream|directo|streamer|donate|donar|bits)\b/g,
  trading: /\b(?:open|high|low|close|rsi|macd|ma|ema|sma|volume|vol|buy|sell|long|short|leverage|apalancamiento|pnl|order|orden|limit|market|candle|vela|bid|ask|spread|futures|perp)\b/g,
  video_media: /\b(?:play|pause|subtitulos|subtitles|episodio|episode|season|temporada|trailer|reproducir|skip intro|saltar intro|capitulo)\b/g,
  productivity: /\b(?:function|const|import|return|def|class|error|warning|commit|pull request|file|edit|view|terminal|debug|insert|formulas?|sheet|slide|document|documento|inbox|bandeja)\b/g,
  social: /\b(?:like|likes|retweet|reply|comments?|comentarios?|share|compartir|story|stories|reels|tiktok|instagram|facebook|followers|following|repost)\b/g,
};

const MODE_CATEGORY = {
  casino: "casino",
  sports: "sports",
  gaming: "video_game",
  stream: "streaming",
  trading: "trading",
  video: "video_media",
  work: "productivity",
};

const CATEGORY_LABEL_KEY = {
  casino: "casino",
  sports_betting: "sports",
  sports_live: "sportsLive",
  video_game: "game_",
  streaming: "stream",
  trading: "trading",
  video_media: "video",
  productivity: "work",
  social: "social",
  other: "other",
};

const MAX_TEXT = 2000;

// Enmascara lo que no debería viajar a otra IA aunque el usuario no lo haya pensado: correos y números largos
// (tarjetas, cuentas). Los importes normales (saldo, apuesta) NO se tocan: son justo el contexto que se busca.
export function redactSensitive(text) {
  return text
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[correo]")
    .replace(/\b(?:\d[ -]?){12,19}\b/g, "[número]");
}

function cleanLines(lines) {
  return lines
    .map((l) => ({ ...l, text: redactSensitive(l.text.replace(/\s+/g, " ").trim()) }))
    .filter((l) => {
      if (l.text.length < 2 || l.confidence < 35) return false;
      const alnum = (l.text.match(/[\p{L}\p{N}]/gu) ?? []).length;
      return alnum / l.text.length >= 0.55 && alnum >= 2; // descarta el ruido de iconos y dibujos
    })
    .map((l) => ({ ...l, height: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0, norm: normalizeText(l.text) }));
}

function count(re, haystack) {
  return (haystack.match(re) ?? []).length;
}

// Importes etiquetados («BALANCE €148.30», «Bet: 2.00 €»), en la misma línea.
function findLabeledAmounts(lines) {
  const found = {};
  for (const { text } of lines) {
    for (const { key, re } of LABELS) {
      if (found[key]) continue;
      // Admite un calificativo entre la etiqueta y el importe: «Apuesta simple €10.00», «Bet slip total 5.00».
      const m = new RegExp(`${re.source}(?:\\s+(?:simple|sencilla|combinada|acumulada|single|parlay|slip))?\\s*[:=]?\\s*(${MONEY}|\\d[\\d.,]*)`, "i").exec(text);
      if (m) found[key] = m[1].trim();
    }
  }
  return found;
}

function findSpins(text) {
  const m = /free spins?\s*:?\s*(\d+)|(\d+)\s*free spins?|giros gratis\s*:?\s*(\d+)|(\d+)\s*giros gratis/i.exec(text);
  return m ? (m[1] ?? m[2] ?? m[3] ?? m[4]) : null;
}

function findMultiplier(lines) {
  for (const { text } of lines) {
    const m = /\b(?:multiplier|multiplicador|mult)\b\s*:?\s*[x×]?\s*(\d+(?:[.,]\d+)?)\s*[x×]?/i.exec(text);
    if (m) return `x${m[1]}`;
  }
  return null;
}

// «Real Madrid 2 - 1 Manchester City» en una sola línea.
function findScoreLine(lines) {
  const re = /^(.{2,32}?)\s+(\d{1,3})\s*[-–:]\s*(\d{1,3})\s+(.{2,32})$/;
  for (const { text } of lines) {
    const m = re.exec(text);
    if (!m) continue;
    const [, home, hs, as, away] = m;
    const letters = (s) => (s.match(/\p{L}/gu) ?? []).length;
    if (letters(home) >= 3 && letters(away) >= 3) return { home: home.trim(), away: away.trim(), score: `${hs}-${as}` };
  }
  return null;
}

function findClock(lines) {
  for (const { text } of lines) {
    const minute = /(?:^|[^\d])(\d{1,3})\s?(?:'|’|′)(?!\d)/.exec(text);
    if (minute) return `${minute[1]}'`;
    const period = /\b(?:HT|FT|half ?time|descanso|final)\b/i.exec(text);
    if (period) return period[0].toUpperCase();
  }
  return null;
}

// Cuotas: líneas que son solo un decimal entre 1.01 y 99.99 y la etiqueta más cercana por encima (misma columna).
function findOdds(lines) {
  const isOdd = (t) => /^\d{1,2}[.,]\d{2}$/.test(t) && Number(t.replace(",", ".")) >= 1.01;
  const oddLines = lines.filter((l) => isOdd(l.text) && l.bbox);
  if (oddLines.length < 2) {
    // Todas en la misma línea: «1.45 4.20 6.75»
    const row = lines.map((l) => l.text.split(" ")).find((tokens) => tokens.length >= 2 && tokens.length <= 4 && tokens.every(isOdd));
    return row ? row.map((value) => ({ label: null, value })) : [];
  }
  return oddLines.map((odd) => {
    const cx = (odd.bbox.x0 + odd.bbox.x1) / 2;
    const above = lines
      .filter((l) => l.bbox && !isOdd(l.text) && l.bbox.y1 <= odd.bbox.y0 + 4 && odd.bbox.y0 - l.bbox.y1 < 160 && cx >= l.bbox.x0 - 20 && cx <= l.bbox.x1 + 20)
      .sort((a, b) => b.bbox.y1 - a.bbox.y1)[0];
    return { label: above?.text ?? null, value: odd.text };
  });
}

function findTradingPair(text) {
  const m = /\b([A-Z]{2,6})\s?[/\\I|-]\s?([A-Z]{3,6})\b/.exec(text);
  return m && /^(?:USDT|USDC|USD|EUR|BTC|ETH|JPY|GBP|BUSD)$/.test(m[2]) ? `${m[1]}/${m[2]}` : null;
}

function findTimeframe(text) {
  const m = /(?:^|\s)(1m|3m|5m|15m|30m|1h|2h|4h|1d|1w|1M)(?:\s|$)/.exec(text);
  return m ? m[1] : null;
}

function findPrice(lines) {
  for (const { text } of lines) {
    const m = /\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d{2,})\b\s*([+-]\d+(?:\.\d+)?%)?/.exec(text);
    if (m && /[+-]\d+(?:\.\d+)?%/.test(text)) return m[2] ? `${m[1]} (${m[2]})` : m[1];
  }
  return null;
}

function findHud(text) {
  const hud = [];
  for (const [label, re] of [["HP", /\bHP\s*:?\s*(\d{1,4})\b/i], ["Kills", /\bKills?\s*:?\s*(\d{1,4})\b/i], ["Deaths", /\bDeaths?\s*:?\s*(\d{1,4})\b/i], ["K/D", /\bK\s?[/I]\s?D\s*:?\s*(\d+(?:\.\d+)?)/i]]) {
    const m = re.exec(text);
    if (m) hud.push(`${label} ${m[1]}`);
  }
  return hud;
}

function best(matches, type) {
  const ofType = matches.filter((m) => m.type === type);
  // Primero lo que se lee en la pantalla (la pista del usuario solo completa), luego las exactas y las más específicas.
  return ofType.sort((a, b) => Number(Boolean(a.fromHint)) - Number(Boolean(b.fromHint)) || Number(b.exact) - Number(a.exact) || b.norm.length - a.norm.length)[0] ?? null;
}

function scoreCategories({ norm, matches, facts, mode }) {
  const scores = Object.fromEntries(Object.keys(TERMS).map((c) => [c, Math.min(count(TERMS[c], norm), 6)]));
  const add = (category, n) => (scores[category] += n);

  if (matches.some((m) => m.type === "slots" || m.type === "liveGames")) add("casino", 4);
  if (matches.some((m) => m.type === "providers")) add("casino", 3);
  if (facts.amounts.balance && facts.amounts.bet) add("casino", 2);
  if (facts.multiplier || facts.spins) add("casino", 2);

  if (matches.some((m) => m.type === "leagues")) add("sports_live", 2);
  if (matches.filter((m) => m.type === "teams").length >= 2) add("sports_live", 2);
  if (facts.scoreLine) add("sports_live", 3);
  if (facts.clock) add("sports_live", 2);
  if (facts.odds.length >= 2) add("sports_betting", 4);

  if (matches.some((m) => m.type === "games")) add("video_game", 4);
  if (facts.hud.length >= 2) add("video_game", 3);

  if (matches.some((m) => m.type === "platforms" && /twitch|kick|tiktok|facebook/.test(m.norm))) add("streaming", 3);
  if (facts.pair) add("trading", 4);
  if (matches.some((m) => m.type === "assets")) add("trading", 1);
  if (matches.some((m) => m.type === "apps")) add("productivity", 3);
  if (matches.some((m) => m.type === "platforms" && /netflix|disney|prime|hbo|spotify|youtube/.test(m.norm))) add("video_media", 2);

  // Partido en directo y casa de apuestas son una misma familia: compiten juntas con el resto de tipos
  // y, si ganan, la evidencia de apuestas decide la variante (ver `sportsVariant`).
  const betting = scores.sports_betting;
  scores.sports = scores.sports_live + betting;
  delete scores.sports_live;
  delete scores.sports_betting;

  if (MODE_CATEGORY[mode]) add(MODE_CATEGORY[mode], 3);
  return { scores, betting };
}

function pickCategory(scores) {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, topScore] = ranked[0];
  const margin = topScore - (ranked[1]?.[1] ?? 0);
  if (topScore < 3) return { category: "other", topScore, margin };
  return { category: top, topScore, margin };
}

// Con cuotas visibles o vocabulario de apuestas es «apuestas deportivas»; si no, «deporte en directo».
function sportsVariant({ betting, facts, matches }) {
  return facts.odds.length >= 2 || betting >= 3 || (betting >= 1 && matches.some((m) => m.type === "sites")) ? "sports_betting" : "sports_live";
}

function rank(topScore, margin, ocrConfidence) {
  let level = topScore >= 7 && margin >= 3 ? 2 : topScore >= 3 ? 1 : 0;
  if (ocrConfidence < 55) level = Math.max(0, level - 1);
  return ["low", "medium", "high"][level];
}

// Texto más grande de la pantalla que parezca un nombre (2–4 palabras): candidato cuando el catálogo no sabe el juego.
function headline(lines) {
  const isLabel = (norm) => LABELS.some(({ re }) => re.test(norm)) || /^(?:menu|home|inicio|play|settings|spin|auto|buy)\b/.test(norm);
  return (
    lines
      .filter((l) => l.confidence >= 70 && l.height > 0 && /^[\p{L}\p{N}' :&.-]+$/u.test(l.text) && l.text.split(" ").length >= 2 && l.text.split(" ").length <= 4 && !isLabel(l.norm))
      .sort((a, b) => b.height - a.height)[0] ?? null
  );
}

const join = (parts) => parts.filter(Boolean).join(" · ");

// Entrada: { lines: [{text, confidence, bbox}], confidence }, opciones: { language, mode, note, knowledge, history }
// `note` es la pista del usuario («estoy en Sweet Bonanza»): completa lo que la zona elegida no muestra.
// Salida: el mismo contrato que los motores con modelo, más `text` (texto leído, ya sin datos sensibles).
export function extractContext({ lines: rawLines, confidence = 0 }, { language = "es", mode = "auto", note = "", knowledge = mergeKnowledge(), history = [], index = buildIndex(knowledge) } = {}) {
  const t = L[language] ?? L.es;
  const lines = cleanLines(rawLines);
  const text = lines.map((l) => l.text).join("\n").slice(0, MAX_TEXT);
  const uncertain = [t.onlyText];

  if (lines.length === 0) {
    return { category: "other", title: t.other, summary: t.noText, activity: "", entities: [], chat_line: "", changes: "", confidence: "low", uncertain, text: "" };
  }

  const norm = lines.map((l) => l.norm).join(" \n ");
  // Las líneas se unen con «¶» para que ningún patrón (p. ej. «50 FREE SPINS») salte de una línea a otra.
  const joined = lines.map((l) => l.text).join(" ¶ ");
  const hint = redactSensitive(String(note ?? "").trim()).slice(0, 200);
  const matches = [
    ...lines.flatMap((l) => findNamesInLine(index, l.text)),
    ...(hint ? findNamesInLine(index, hint).map((m) => ({ ...m, fromHint: true })) : []),
  ];
  const facts = {
    amounts: findLabeledAmounts(lines),
    spins: findSpins(joined),
    multiplier: findMultiplier(lines),
    scoreLine: findScoreLine(lines),
    clock: findClock(lines),
    odds: findOdds(lines),
    pair: findTradingPair(joined),
    timeframe: findTimeframe(joined),
    price: findPrice(lines),
    hud: findHud(joined),
    live: /\b(?:live|en vivo|en directo)\b/i.test(joined),
  };

  const { scores, betting } = scoreCategories({ norm, matches, facts, mode });
  const picked = pickCategory(scores);
  const { topScore, margin } = picked;
  const category = picked.category === "sports" ? sportsVariant({ betting, facts, matches }) : picked.category;

  const slot = best(matches, "slots") ?? best(matches, "liveGames");
  const provider = best(matches, "providers");
  const site = best(matches, "sites");
  const league = best(matches, "leagues");
  const game = best(matches, "games");
  const platform = best(matches, "platforms");
  const app = best(matches, "apps");
  const teams = matches.filter((m) => m.type === "teams");

  const entities = [];
  const put = (label, value) => value && entities.push({ label, value: String(value) });
  let title = t[CATEGORY_LABEL_KEY[category]];
  let summary = "";
  let activity = "";
  let chat = "";

  if (category === "casino") {
    let name = slot?.name;
    if (!name) {
      const guess = headline(lines);
      if (guess) {
        name = guess.text;
        uncertain.push(t.deduced);
      }
    }
    put(t.game, name);
    put(t.provider, provider?.name);
    put(t.site, site?.name);
    put(t.bet, facts.amounts.bet);
    put(t.balance, facts.amounts.balance);
    put(t.win, facts.amounts.win);
    put(t.spins, facts.spins);
    put(t.multiplier, facts.multiplier);
    title = `${t.casino}: ${name ?? t.unknownGame}${provider ? ` (${provider.name})` : ""}`;
    const bits = [
      facts.amounts.bet && `${t.bet.toLowerCase()} ${facts.amounts.bet}`,
      facts.amounts.balance && `${t.balance.toLowerCase()} ${facts.amounts.balance}`,
      facts.amounts.win && `${t.win.toLowerCase()} ${facts.amounts.win}`,
      facts.spins && `${t.spins.toLowerCase()} ${facts.spins}`,
      facts.multiplier && `${t.multiplier.toLowerCase()} ${facts.multiplier}`,
    ].filter(Boolean);
    const sentence = bits.join(", ");
    summary = bits.length
      ? name ? `${name}: ${sentence}.` : `${sentence[0].toUpperCase()}${sentence.slice(1)}.`
      : `${t.detected}: ${lines.slice(0, 3).map((l) => l.text).join(" · ")}`;
    activity = facts.spins ? t.spins.toLowerCase() : "";
    chat = join([name, facts.spins && `${t.spins.toLowerCase()} ${facts.spins}`, facts.multiplier]);
  } else if (category === "sports_betting" || category === "sports_live") {
    const home = facts.scoreLine?.home ?? teams[0]?.name;
    const away = facts.scoreLine?.away ?? teams[1]?.name;
    const matchName = home && away ? `${home} vs ${away}` : null;
    put(t.match, matchName);
    put(t.score, facts.scoreLine?.score);
    put(t.clock, facts.clock);
    put(t.league, league?.name);
    put(t.site, site?.name);
    const odds = facts.odds.map((o) => (o.label ? `${o.label} ${o.value}` : o.value));
    put(t.odds, odds.join(" · "));
    put(t.bet, facts.amounts.bet);
    const live = facts.live || Boolean(facts.clock);
    activity = live ? t.live.toLowerCase() : "";
    title = facts.scoreLine
      ? `${home} ${facts.scoreLine.score} ${away}`
      : matchName ?? `${category === "sports_betting" ? t.sports : t.sportsLive}${league ? `: ${league.name}` : ""}`;
    summary = join([
      live ? `${t.live}${facts.clock ? ` (${facts.clock})` : ""}` : null,
      league?.name,
      site?.name,
      odds.length ? `${t.odds.toLowerCase()} ${odds.join(", ")}` : null,
    ]) || `${t.detected}: ${lines.slice(0, 3).map((l) => l.text).join(" · ")}`;
    chat = join([facts.scoreLine ? `${home} ${facts.scoreLine.score} ${away}` : matchName, facts.clock, league?.name]);
  } else if (category === "video_game") {
    put(t.game, game?.name);
    for (const h of facts.hud) put(h.split(" ")[0], h.split(" ").slice(1).join(" "));
    const round = /ROUND\s*(\d+)/i.exec(joined);
    put(t.round, round?.[1]);
    title = `${t.game_}: ${game?.name ?? headline(lines)?.text ?? t.unknownGame}`;
    summary = join([game?.name, round && `${t.round} ${round[1]}`, facts.hud.join(", ")]) || `${t.detected}: ${lines.slice(0, 3).map((l) => l.text).join(" · ")}`;
    chat = join([game?.name, round && `${t.round} ${round[1]}`]);
  } else if (category === "trading") {
    put(t.pair, facts.pair);
    put(t.timeframe, facts.timeframe);
    put(t.price, facts.price);
    put(t.site, site?.name ?? platform?.name);
    const indicators = ["RSI", "MACD", "MA(50)"].map((k) => new RegExp(`${k.replace(/[()]/g, "\\$&")}\\s*:?\\s*(-?\\d[\\d.,]*)`, "i").exec(joined)).filter(Boolean);
    for (const m of indicators) put(m[0].split(/\s+/)[0].toUpperCase(), m[1]);
    title = `${t.trading}: ${join([facts.pair ?? "", facts.timeframe ?? ""]) || t.unknownGame}`.replace(" · ", " ");
    summary = join([facts.pair, facts.price && `${t.price.toLowerCase()} ${facts.price}`, facts.timeframe]) || `${t.detected}: ${lines.slice(0, 3).map((l) => l.text).join(" · ")}`;
    chat = join([facts.pair, facts.price]);
  } else {
    put(t.platform, platform?.name);
    put(t.app, app?.name);
    put(t.site, site?.name);
    put(t.viewers, /(\d[\d.,]*)\s*(?:viewers|espectadores)/i.exec(joined)?.[1]);
    const head = headline(lines) ?? lines[0];
    title = category === "other" ? head.text : `${t[CATEGORY_LABEL_KEY[category]]}: ${platform?.name ?? app?.name ?? head.text}`;
    summary = `${t.detected}: ${lines.slice(0, 4).map((l) => l.text).join(" · ")}`;
    chat = head.text;
  }

  if (hint) put(t.hint, hint);
  if (matches.some((m) => m.fromHint && [slot, provider, site, league, game, platform, app, ...teams].includes(m))) uncertain.push(t.fromHint);
  if (confidence < 55) uncertain.push(t.lowOcr);
  const previous = history.at(-1);
  return {
    category,
    title: title.slice(0, 120),
    summary: summary.slice(0, 500),
    activity,
    entities: entities.slice(0, 8),
    chat_line: (chat || title).slice(0, 240),
    changes: previous && previous.title !== title ? `${t.before}: ${previous.title}` : "",
    confidence: rank(topScore, margin, confidence),
    uncertain,
    text,
  };
}
