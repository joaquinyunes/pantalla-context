"""Envío de eventos (análisis y resúmenes) a otro sistema por HTTP POST (webhook)."""
import hashlib
import hmac
import json
import queue
import threading
import time
from urllib import error, request
from urllib.parse import urlparse

RETRY_DELAYS = (1, 3, 8)  # tras el primer intento: 3 reintentos


class Webhook:
    """Cola en segundo plano: el bucle principal nunca espera a que responda el destino."""

    def __init__(self, url: str, secret: str = "", min_importance: int = 1):
        if urlparse(url).scheme not in ("http", "https"):
            raise ValueError("El webhook debe empezar con http:// o https://")
        self.url, self.secret, self.min_importance = url, secret, min_importance
        self._q: queue.Queue = queue.Queue(maxsize=500)
        self._warned = False
        threading.Thread(target=self._run, daemon=True).start()

    def send(self, event: str, data: dict):
        if event == "analysis" and data.get("importancia", 1) < self.min_importance:
            return
        body = json.dumps(
            {"event": event, "sent_at": time.time(), "data": data}, ensure_ascii=False
        ).encode("utf-8")
        try:
            self._q.put_nowait((event, body))
        except queue.Full:
            print("⚠️  Webhook: cola llena, se descarta un evento (¿el destino no responde?)")

    def flush(self, timeout: float = 10.0):
        """Espera (hasta `timeout` s) a que se envíen los eventos pendientes, p. ej. al cerrar."""
        end = time.time() + timeout
        while self._q.unfinished_tasks and time.time() < end:
            time.sleep(0.1)

    def _headers(self, event: str, body: bytes) -> dict:
        h = {
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "screen-narrator/1.0",
            "X-Narrator-Event": event,
        }
        if self.secret:
            h["X-Narrator-Signature"] = "sha256=" + hmac.new(self.secret.encode(), body, hashlib.sha256).hexdigest()
        return h

    def _post(self, event: str, body: bytes):
        req = request.Request(self.url, data=body, headers=self._headers(event, body), method="POST")
        with request.urlopen(req, timeout=10) as r:
            if not 200 <= r.status < 300:
                raise error.HTTPError(self.url, r.status, "respuesta no 2xx", r.headers, None)

    def _run(self):
        while True:
            event, body = self._q.get()
            try:
                for delay in (0, *RETRY_DELAYS):
                    time.sleep(delay)
                    try:
                        self._post(event, body)
                        self._warned = False
                        break
                    except error.HTTPError as e:
                        if 400 <= e.code < 500 and e.code != 429:  # no tiene sentido reintentar
                            self._warn(f"el destino respondió {e.code}")
                            break
                        last = f"HTTP {e.code}"
                    except Exception as e:
                        last = type(e).__name__
                else:
                    self._warn(f"sin respuesta tras reintentos ({last})")
            finally:
                self._q.task_done()

    def _warn(self, why: str):
        if not self._warned:  # un aviso por racha de fallos, para no inundar la consola
            print(f"⚠️  Webhook: {why}. Los eventos siguen en historial.jsonl.")
            self._warned = True
