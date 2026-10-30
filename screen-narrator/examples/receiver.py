"""Receptor de ejemplo para el webhook del narrador (solo librería estándar).

    python examples/receiver.py            # escucha en http://localhost:9000
    python narrator.py --webhook http://localhost:9000/hook

Si defines WEBHOOK_SECRET (el mismo valor en el narrador y aquí), se verifica la firma.
"""
import hashlib
import hmac
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

SECRET = os.getenv("WEBHOOK_SECRET", "")


class Hook(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if SECRET:
            expected = "sha256=" + hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()
            if not hmac.compare_digest(expected, self.headers.get("X-Narrator-Signature", "")):
                self.send_response(401)
                self.end_headers()
                return
        msg = json.loads(body)
        data = msg["data"]
        if msg["event"] == "analysis":
            print(f"[{data['timestamp']}] {data['actividad']} | {data['detalle']} | {data['momento_destacado']}")
        else:  # "summary" o "session_summary"
            print(f"\n=== {msg['event']} ===\n{data['resumen']}\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Receptor en http://localhost:9000/hook (Ctrl+C para salir)")
    HTTPServer(("127.0.0.1", 9000), Hook).serve_forever()
