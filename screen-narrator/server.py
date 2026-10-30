"""Panel web local: sirve la página y una pequeña API JSON (solo en 127.0.0.1)."""
import hmac
import json
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from store import Store

WEB_DIR = Path(__file__).parent / "web"
ALLOWED_HOSTS = {"localhost", "127.0.0.1", "[::1]"}
SUMMARY_MIN_REFRESH_S = 20  # no regenerar el mismo resumen más seguido que esto
STATE_ENTRIES = 150

WINDOW_PROMPT = """\
Estos son los análisis de pantalla de {label} (una línea por análisis, más antiguo primero, \
con hora e importancia 1-5). Escribe en español un resumen de lo que pasó:
- Primero 1-3 frases: qué estuvo haciendo la persona y cómo evolucionó.
- Luego, solo si los hay, viñetas con "- " de los momentos destacados (con la hora).
Sé concreto y fiel a los datos; no inventes nada que no aparezca. Sin introducciones.

{history}
"""


def window_label(minutes: int) -> str:
    if not minutes:
        return "toda la sesión"
    return "el último minuto" if minutes == 1 else f"los últimos {minutes} minutos"


class SummaryService:
    """Genera (y cachea) resúmenes por ventana de tiempo usando el mismo proveedor de IA."""

    def __init__(self, store: Store, provider):
        self.store, self.provider = store, provider
        self._cache: dict[int, dict] = {}
        self._lock = threading.Lock()

    def get(self, minutes: int, force: bool = False) -> dict:
        entries = self.store.window(minutes)
        if not entries:
            return {"minutes": minutes, "count": 0, "summary": None, "generated_at": time.time()}
        last_id = entries[-1]["id"]
        with self._lock:
            hit = self._cache.get(minutes)
            if hit and not force:
                fresh = time.time() - hit["generated_at"] < SUMMARY_MIN_REFRESH_S
                if hit["last_id"] == last_id or fresh:
                    return hit
            history = "\n".join(
                f"[{e['hora']}] (imp {e['importancia']}) {e['actividad']} | {e['detalle']} | "
                f"{e.get('momento_destacado') or '-'}"
                for e in entries
            )
            try:
                text = self.provider.text(WINDOW_PROMPT.format(label=window_label(minutes), history=history))
            except Exception as e:
                err = {"error": f"{type(e).__name__}: {str(e)[:200]}"}
                return {**(hit or {"minutes": minutes, "count": len(entries), "summary": None}), **err}
            result = {
                "minutes": minutes,
                "count": len(entries),
                "summary": text.strip(),
                "last_id": last_id,
                "generated_at": time.time(),
            }
            self._cache[minutes] = result
            return result


def make_handler(store: Store, summaries: SummaryService, token: str = ""):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # silencio en consola
            pass

        def _send(self, code: int, body: bytes, ctype: str):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, data, code: int = 200):
            self._send(code, json.dumps(data, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8")

        def _host_ok(self) -> bool:
            # Evita que otras páginas web (DNS rebinding) lean tu pantalla a través de localhost.
            host = self.headers.get("Host", "")
            name = host.rsplit(":", 1)[0] if not host.endswith("]") else host
            return name in ALLOWED_HOSTS

        def _authorized(self) -> bool:
            if not token:  # sin token: solo se acepta tráfico local con Host válido
                return self._host_ok()
            supplied = ""
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                supplied = auth[7:].strip()
            if not supplied:
                cookie = SimpleCookie(self.headers.get("Cookie", ""))
                supplied = cookie["sn_token"].value if "sn_token" in cookie else ""
            return hmac.compare_digest(supplied.encode(), token.encode())

        def do_GET(self):
            url = urlparse(self.path)
            q = parse_qs(url.query)
            if token and url.path == "/" and q.get("token") and hmac.compare_digest(q["token"][0].encode(), token.encode()):
                # Abrir /?token=XXX deja una cookie y quita el token de la URL.
                self.send_response(302)
                self.send_header("Location", "/")
                self.send_header("Set-Cookie", f"sn_token={token}; HttpOnly; SameSite=Strict; Path=/")
                self.end_headers()
                return
            if not self._authorized():
                msg = "no autorizado: usa 'Authorization: Bearer <token>' o abre /?token=<token>" if token else "host no permitido"
                return self._json({"error": msg}, 401 if token else 403)
            if url.path == "/api/health":
                return self._json({"ok": True, "paused": store.paused.is_set(), "total": len(store.all())})
            if url.path == "/api/latest":
                entries = store.all()
                return self._json(entries[-1] if entries else None)
            if url.path == "/api/entries":
                # Para sondeo desde otro sistema: /api/entries?since_id=40&limit=100
                try:
                    since = int(q.get("since_id", ["0"])[0])
                    limit = max(1, min(1000, int(q.get("limit", ["200"])[0])))
                except ValueError:
                    return self._json({"error": "since_id/limit inválidos"}, 400)
                return self._json([e for e in store.all() if e["id"] > since][:limit])
            if url.path in ("/", "/index.html"):
                page = (WEB_DIR / "index.html").read_bytes()
                return self._send(200, page, "text/html; charset=utf-8")
            if url.path == "/api/state":
                entries = store.all()
                return self._json(
                    {
                        "now": time.time(),
                        "provider": store.provider_name,
                        "model": store.model,
                        "paused": store.paused.is_set(),
                        "started": store.started,
                        "total": len(entries),
                        "entries": entries[-STATE_ENTRIES:],
                    }
                )
            if url.path == "/api/summary":
                q = parse_qs(url.query)
                try:
                    minutes = max(0, min(1440, int(q.get("minutes", ["1"])[0])))
                except ValueError:
                    return self._json({"error": "minutes inválido"}, 400)
                force = q.get("force", ["0"])[0] == "1"
                return self._json(summaries.get(minutes, force))
            self._json({"error": "no encontrado"}, 404)

        def do_POST(self):
            if not self._authorized():
                return self._json({"error": "no autorizado"}, 401 if token else 403)
            path = urlparse(self.path).path
            if path == "/api/pause":
                store.paused.set()
            elif path == "/api/resume":
                store.paused.clear()
            else:
                return self._json({"error": "no encontrado"}, 404)
            self._json({"paused": store.paused.is_set()})

    return Handler


def start_server(store: Store, summaries: SummaryService, port: int, host: str = "127.0.0.1", token: str = "") -> str:
    """Arranca el servidor en un hilo y devuelve la URL. Lanza OSError si el puerto está ocupado.

    Fuera de 127.0.0.1 se exige token: la API expone lo que haces en tu pantalla.
    """
    if host not in ("127.0.0.1", "localhost", "::1") and not token:
        raise ValueError("Para escuchar fuera de localhost hace falta --api-token (o API_TOKEN en .env).")
    httpd = ThreadingHTTPServer((host, port), make_handler(store, summaries, token))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://{'localhost' if host == '127.0.0.1' else host}:{port}"
