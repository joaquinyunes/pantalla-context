"""Estado compartido entre el bucle del narrador y el servidor web."""
import threading
import time


class Store:
    def __init__(self, provider_name: str, model: str):
        self.provider_name = provider_name
        self.model = model
        self.started = time.time()
        self.paused = threading.Event()  # activo = captura pausada
        self._lock = threading.Lock()
        self._entries: list[dict] = []

    def add(self, entry: dict) -> dict:
        with self._lock:
            entry["id"] = len(self._entries) + 1
            self._entries.append(entry)
        return entry

    def all(self) -> list[dict]:
        with self._lock:
            return list(self._entries)

    def window(self, minutes: int) -> list[dict]:
        """Análisis de los últimos `minutes` minutos (0 = toda la sesión)."""
        entries = self.all()
        if not minutes:
            return entries
        cutoff = time.time() - minutes * 60
        return [e for e in entries if e["ts"] >= cutoff]
