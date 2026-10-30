"""Narrador de pantalla en vivo: describe qué estás haciendo (juego, video, web, código...)."""
import argparse
import json
import os
import sys
import threading
import time
import webbrowser
from collections import deque
from datetime import datetime
from pathlib import Path

from capture import ScreenGrabber, change_score, list_monitors
from providers import PROVIDERS, SESSION_PROMPT, ProviderError, is_auth_error, make_provider
from server import SummaryService, start_server
from store import Store
from webhook import Webhook

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

HEARTBEAT_S = 60  # aunque la pantalla no cambie, re-analiza cada tanto


KEY_VARS = {"gemini": "GEMINI_API_KEY", "claude": "ANTHROPIC_API_KEY"}
AUTH_HINT = {
    "gemini": "Usa una clave de Gemini API de https://aistudio.google.com/apikey (las nuevas empiezan con AQ., las "
              "antiguas con AIza), pegada completa y una sola vez. Si sigue fallando, crea una clave nueva.",
    "claude": "Usa una clave de https://console.anthropic.com/ (empieza con sk-ant-).",
}


def ask_for_key(provider: str, force: bool = False):
    """Si falta la clave (o force=True) y hay una consola, la pide y la guarda en .env."""
    var = KEY_VARS[provider]
    if not sys.stdin.isatty():
        return
    if not force and (os.getenv(var) or (provider == "gemini" and os.getenv("GOOGLE_API_KEY"))):
        return
    if provider == "gemini":
        os.environ.pop("GOOGLE_API_KEY", None)
    # input() y no getpass: getpass en Windows no deja pegar (Ctrl+V / clic derecho).
    try:
        key = input(f"Pega tu {var} (clic derecho o Ctrl+V; se verá en pantalla) y pulsa Enter: ").strip().strip("\"'")
    except EOFError:
        return False
    if not key:
        return False
    os.environ[var] = key
    env_path = Path(__file__).parent / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    lines = [f"{var}={key}" if l.startswith(f"{var}=") else l for l in lines]
    if not any(l.startswith(f"{var}=") for l in lines):
        lines.append(f"{var}={key}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Clave guardada en .env (no se sube a ningún lado: está en .gitignore).")
    return True


def parse_args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--provider", choices=PROVIDERS, default=os.getenv("PROVIDER", "gemini"))
    p.add_argument("--model", help="Modelo del proveedor (por defecto el de .env o el recomendado)")
    p.add_argument("--interval", type=float, default=5.0, help="Segundos por ciclo de análisis (def. 5)")
    p.add_argument("--frames", type=int, default=3, help="Fotogramas por ciclo, 1-4 (def. 3)")
    p.add_argument("--monitor", type=int, default=1, help="Monitor a capturar (def. 1)")
    p.add_argument("--max-width", type=int, default=1280, help="Ancho máximo enviado a la IA (def. 1280)")
    p.add_argument("--threshold", type=float, default=2.0, help="Cambio mínimo de pantalla para analizar (def. 2.0)")
    p.add_argument("--memory", type=int, default=5, help="Resúmenes previos que se pasan como contexto (def. 5)")
    p.add_argument("--out", default="salida", help="Carpeta de salida (def. salida/)")
    p.add_argument("--context", default=os.getenv("CONTEXT", ""),
                   help='Qué estás haciendo, para afinar la precisión. Ej: "LoL, juego Jinx de ADC, rango Oro"')
    p.add_argument("--save-highlights", action="store_true",
                   help="Guarda en salida/destacados/ una captura de cada jugada con importancia >= 4 (para verificar)")
    p.add_argument("--webhook", default=os.getenv("WEBHOOK_URL", ""),
                   help="URL que recibe cada análisis y resumen por POST (JSON). Ver README")
    p.add_argument("--webhook-min-importance", type=int, default=int(os.getenv("WEBHOOK_MIN_IMPORTANCE", "1")),
                   help="Solo enviar análisis con importancia >= N (def. 1 = todos)")
    p.add_argument("--webhook-summary-every", type=float, default=float(os.getenv("WEBHOOK_SUMMARY_EVERY", "0")),
                   help="Enviar un resumen de los últimos N minutos cada N minutos (def. 0 = apagado)")
    p.add_argument("--host", default="127.0.0.1",
                   help="Dirección del panel/API. Fuera de 127.0.0.1 exige --api-token (def. 127.0.0.1)")
    p.add_argument("--api-token", default=os.getenv("API_TOKEN", ""),
                   help="Token para el panel/API (Authorization: Bearer <token>)")
    p.add_argument("--port", type=int, default=8765, help="Puerto del panel web (def. 8765)")
    p.add_argument("--no-web", action="store_true", help="No levantar el panel web")
    p.add_argument("--no-browser", action="store_true", help="No abrir el navegador automáticamente")
    p.add_argument("--list-monitors", action="store_true", help="Lista los monitores y sale")
    p.add_argument("--dry-run", action="store_true", help="Guarda una captura de prueba y sale; no llama a la IA")
    p.add_argument("--once", action="store_true", help="Analiza un solo ciclo y sale")
    return p.parse_args()


def parse_json(raw: str) -> dict:
    text = raw.strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            data = json.loads(text[start : end + 1])
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
    return {"actividad": "Sin clasificar", "detalle": text[:300], "momento_destacado": None, "importancia": 1}


def clamp_importance(value) -> int:
    try:
        return max(1, min(5, int(value)))
    except (TypeError, ValueError):
        return 1


def render(entry: dict) -> str:
    fire = "🔥 " if entry["importancia"] >= 4 else ""
    lines = [f"- {entry['actividad']}", f"- {entry['detalle']}"]
    if entry.get("momento_destacado"):
        doubt = " (poco seguro)" if entry.get("confianza") == "baja" else ""
        lines.append(f"- {fire}{entry['momento_destacado']}{doubt}")
    return "\n".join(lines)


def clean_confidence(value) -> str:
    value = str(value or "").strip().lower()
    return value if value in ("alta", "media", "baja") else "media"


def entry_payload(entry: dict, provider) -> dict:
    """Forma pública de un análisis, igual para el webhook y la API."""
    return {
        "id": entry["id"],
        "timestamp": datetime.fromtimestamp(entry["ts"]).astimezone().isoformat(timespec="seconds"),
        "actividad": entry["actividad"],
        "detalle": entry["detalle"],
        "momento_destacado": entry["momento_destacado"],
        "importancia": entry["importancia"],
        "confianza": entry["confianza"],
        "cambio_de_actividad": entry["cambio_de_actividad"],
        "provider": provider.name,
        "model": provider.model,
    }


def write_overlay(path: Path, text: str):
    """Escribe el archivo que OBS puede leer como fuente de texto."""
    tmp = path.with_suffix(".tmp")
    try:
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
    except OSError:  # OBS puede tener el archivo abierto en Windows
        path.write_text(text, encoding="utf-8")


def build_prompt(history: deque, n_frames: int, user_context: str = "") -> str:
    ctx = "\n".join(f"[{h['hora']}] {h['actividad']} | {h['detalle']} | {h.get('momento_destacado') or '-'}" for h in history)
    ctx = ctx or "(sin resúmenes previos: es el inicio de la sesión)"
    known = f"Contexto del usuario: {user_context}\n\n" if user_context else ""
    return f"{known}Resúmenes previos (más antiguo primero):\n{ctx}\n\nAnaliza ahora los {n_frames} fotograma(s) adjuntos."


def capture_burst(grabber: ScreenGrabber, n: int, interval: float):
    frames = []
    for i in range(n):
        frames.append(grabber.grab())
        if i < n - 1:
            time.sleep(interval / n)
    return frames


def session_summary(provider, entries: list[dict]) -> str:
    history = "\n".join(
        f"[{e['hora']}] (imp {e['importancia']}) {e['actividad']} | {e['detalle']} | {e.get('momento_destacado') or '-'}"
        for e in entries
    )
    return provider.text(SESSION_PROMPT.format(history=history))


def summary_pusher(store: Store, summaries: SummaryService, hook: Webhook, every_min: float):
    """Cada `every_min` minutos manda al webhook el resumen de ese mismo período."""
    window = max(1, round(every_min))
    while True:
        time.sleep(every_min * 60)
        if store.paused.is_set():
            continue
        result = summaries.get(window, force=True)
        if result.get("summary") and not result.get("error"):
            hook.send("summary", {
                "periodo_minutos": window,
                "analisis": result["count"],
                "resumen": result["summary"],
                "generado": datetime.fromtimestamp(result["generated_at"]).astimezone().isoformat(timespec="seconds"),
                "provider": store.provider_name,
                "model": store.model,
            })


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = parse_args()

    if args.list_monitors:
        print("\n".join(list_monitors()))
        return

    args.frames = max(1, min(4, args.frames))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    grabber = ScreenGrabber(args.monitor, args.max_width)

    if args.dry_run:
        path = out / "prueba_captura.jpg"
        path.write_bytes(grabber.to_jpeg(grabber.grab()))
        print(f"Captura guardada en {path}. Esto es exactamente lo que se enviaría a la IA.")
        return

    force = False
    for attempt in range(3):
        if not ask_for_key(args.provider, force) and force:
            sys.exit("No se ingresó una clave nueva. Corrígela en .env y vuelve a ejecutar.")
        try:
            provider = make_provider(args.provider, args.model)
        except ProviderError as e:
            sys.exit(f"ERROR: {e}")
        try:
            provider.check()
            break
        except Exception as e:
            if not is_auth_error(e):  # red caída, modelo retirado...: se avisa y se sigue
                print(f"Aviso al validar: {type(e).__name__}: {str(e)[:200]}")
                break
            print(f"\n❌ {args.provider} rechazó la clave ({type(e).__name__}).")
            print(f"   {AUTH_HINT[args.provider]}")
            if attempt == 2 or not sys.stdin.isatty():
                sys.exit("Corrige la clave en .env y vuelve a ejecutar.")
            force = True

    store = Store(provider.name, provider.model)
    summaries = SummaryService(store, provider)

    hook = None
    if args.webhook:
        try:
            hook = Webhook(args.webhook, os.getenv("WEBHOOK_SECRET", ""), args.webhook_min_importance)
        except ValueError as e:
            sys.exit(f"ERROR: {e}")
        print(f"Webhook activo: se envían los análisis (importancia >= {args.webhook_min_importance}) a {args.webhook}")
        if args.webhook_summary_every > 0:
            threading.Thread(target=summary_pusher, args=(store, summaries, hook, args.webhook_summary_every),
                             daemon=True).start()
            print(f"Webhook: resumen de los últimos {args.webhook_summary_every:g} min cada {args.webhook_summary_every:g} min")

    if not args.no_web:
        try:
            url = start_server(store, summaries, args.port, args.host, args.api_token)
        except ValueError as e:
            sys.exit(f"ERROR: {e}")
        except OSError as e:
            sys.exit(f"ERROR: no se pudo abrir el puerto {args.port} ({e}). Prueba con --port 8800.")
        print(f"Panel web: {url}" + ("  (protegido con token)" if args.api_token else ""))
        if not args.no_browser and not args.api_token:
            webbrowser.open(url)

    print(f"Narrador activo | {provider.name} ({provider.model}) | monitor {args.monitor} | "
          f"{args.frames} fotogramas cada {args.interval:g}s")
    print("AVISO: tu pantalla se envía a la API de IA. Cierra gestores de contraseñas, banca y chats privados.")
    print(f"Salida en {out}/  (actual.txt para OBS, historial.jsonl, resumen_sesion.md). Ctrl+C para terminar.")
    print("-" * 60)

    history: deque = deque(maxlen=max(0, args.memory))
    entries: list[dict] = []
    last_frame = None
    last_analysis = 0.0
    failures = 0

    try:
        with open(out / "historial.jsonl", "a", encoding="utf-8") as log:
            while True:
                if store.paused.is_set():  # pausado desde el panel: no se captura nada
                    last_frame = None
                    time.sleep(0.5)
                    continue
                frames = capture_burst(grabber, args.frames, args.interval)
                now = time.time()
                moved = last_frame is None or max(change_score(last_frame, f) for f in frames) >= args.threshold
                if not moved and now - last_analysis < HEARTBEAT_S:
                    last_frame = frames[-1]
                    continue

                try:
                    raw = provider.analyze(
                        [grabber.to_jpeg(f) for f in frames], build_prompt(history, len(frames), args.context)
                    )
                    data = parse_json(raw)
                    failures = 0
                except Exception as e:  # red, cuota, filtro de seguridad...
                    if is_auth_error(e):
                        sys.exit(f"\n❌ La API rechazó la clave durante la ejecución: {type(e).__name__}. Revisa .env.")
                    failures += 1
                    wait = min(30, 2**failures)
                    print(f"[{time.strftime('%H:%M:%S')}] ⚠️  {type(e).__name__}: {str(e)[:200]} (reintento en {wait}s)")
                    time.sleep(wait)
                    continue

                entry = {
                    "ts": time.time(),
                    "hora": time.strftime("%H:%M:%S"),
                    "actividad": str(data.get("actividad") or "Sin clasificar"),
                    "detalle": str(data.get("detalle") or ""),
                    "momento_destacado": data.get("momento_destacado") or None,
                    "importancia": clamp_importance(data.get("importancia")),
                    "confianza": clean_confidence(data.get("confianza")),
                    "cambio_de_actividad": bool(data.get("cambio_de_actividad")),
                }
                last_frame, last_analysis = frames[-1], now
                store.add(entry)
                history.append(entry)
                entries.append(entry)
                log.write(json.dumps(entry, ensure_ascii=False) + "\n")
                log.flush()

                if args.save_highlights and entry["importancia"] >= 4:
                    shots = out / "destacados"
                    shots.mkdir(exist_ok=True)
                    (shots / f"{entry['hora'].replace(':', '-')}_id{entry['id']}.jpg").write_bytes(
                        grabber.to_jpeg(frames[-1])
                    )
                if hook:
                    hook.send("analysis", entry_payload(entry, provider))

                text = render(entry)
                write_overlay(out / "actual.txt", text)
                print(f"\n[{entry['hora']}]\n{text}")

                if args.once:
                    break
    except KeyboardInterrupt:
        print("\nDeteniendo...")

    if entries:
        try:
            summary = session_summary(provider, entries)
            (out / "resumen_sesion.md").write_text(summary, encoding="utf-8")
            print("\n" + "=" * 60 + "\nRESUMEN DE LA SESIÓN\n" + "=" * 60 + "\n" + summary)
            if hook:
                hook.send("session_summary", {
                    "analisis": len(entries),
                    "resumen": summary,
                    "inicio": datetime.fromtimestamp(entries[0]["ts"]).astimezone().isoformat(timespec="seconds"),
                    "fin": datetime.fromtimestamp(entries[-1]["ts"]).astimezone().isoformat(timespec="seconds"),
                    "provider": provider.name,
                    "model": provider.model,
                })
        except Exception as e:
            print(f"No se pudo generar el resumen final ({type(e).__name__}); el detalle está en historial.jsonl")
    if hook:
        hook.flush()


if __name__ == "__main__":
    main()
