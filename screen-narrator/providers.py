"""Proveedores de visión: Gemini (gratis con límites) o Claude."""
import base64
import os

SYSTEM_PROMPT = """\
Eres un narrador y analista de pantalla en tiempo real. Recibes 1 a 4 fotogramas \
consecutivos de la pantalla de un usuario (en orden cronológico) y describes lo que \
está haciendo AHORA.

Reglas:
- Identifica la actividad concreta con el mayor detalle que se vea: juego exacto, \
campeón/personaje, rol, mapa, marcador, KDA, fase de la partida; o el sitio web, \
el tema del video, el archivo/lenguaje de código, la búsqueda que se escribe, etc.
- Compara los fotogramas entre sí para detectar ACCIONES: peleas, kills, multikills, \
muertes, objetivos, compras, apuestas, cambios de pestaña, errores.
- Usa el contexto de resúmenes previos para no repetirte: si nada relevante cambió, \
dilo en pocas palabras. Marca cambio_de_actividad solo si cambió de tarea.
- No inventes. Si algo no se lee o no es seguro, di "no se distingue" y baja la confianza.
- Si el usuario aporta "Contexto del usuario", úsalo para desambiguar (juego, campeón, rol), \
pero si la pantalla lo contradice, manda lo que se ve.
- Cuenta solo lo que se ve: para decir "1v5" o "multikill" tiene que haber evidencia \
en los fotogramas (marcador, kill feed, enemigos eliminados), no una suposición.
- Privacidad: nunca transcribas contraseñas, números de tarjeta/cuenta, códigos, \
tokens ni datos personales. Di solo que hay un formulario o dato sensible.
- Sé conciso y directo, sin introducciones tipo "En la pantalla se ve".

Responde SOLO con un objeto JSON con estas claves:
{
  "actividad": "categoría corta, ej. Jugando League of Legends / Viendo YouTube / Programando",
  "detalle": "detalle específico, ej. ADC con Jinx, partida normal, minuto 24 / Documental de una fábrica de jarras de vidrio en China",
  "momento_destacado": "la acción más relevante de estos fotogramas, o null si no hay",
  "importancia": 1-5 (1 = rutina, 3 = algo notable, 5 = jugada o evento épico),
  "confianza": "alta" (se ve claro y legible), "media" o "baja" (poco legible o adivinando),
  "cambio_de_actividad": true o false
}
"""

SESSION_PROMPT = """\
Estos son los resúmenes cronológicos de una sesión de pantalla (una línea por análisis, \
con hora). Escribe en español un resumen final en Markdown con:
1. Una frase general de la sesión.
2. Línea de tiempo agrupada por actividad (hora de inicio - hora de fin, qué hizo).
3. Momentos destacados (los de mayor importancia).
Sé fiel a los datos; no inventes nada que no aparezca.

{history}
"""


class ProviderError(Exception):
    pass


AUTH_MARKERS = ("UNAUTHENTICATED", "API key not valid", "API_KEY_INVALID", "PERMISSION_DENIED",
                "authentication_error", "invalid x-api-key")


def is_auth_error(e: Exception) -> bool:
    code = getattr(e, "code", None) or getattr(e, "status_code", None)
    return code in (401, 403) or any(m in str(e) for m in AUTH_MARKERS)


class GeminiProvider:
    name = "gemini"

    def __init__(self, model: str | None = None):
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise ProviderError("Falta GEMINI_API_KEY (consíguela gratis en https://aistudio.google.com/).")
        from google import genai
        from google.genai import types

        self._types = types
        self.client = genai.Client(api_key=key)
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        # Opcional: un modelo más potente solo para redactar resúmenes (pocas llamadas).
        self.summary_model = os.getenv("GEMINI_SUMMARY_MODEL") or self.model

    def check(self):
        """Llamada barata para validar la clave y el modelo antes de empezar."""
        self.client.models.get(model=self.model)

    def analyze(self, frames: list[bytes], prompt: str) -> str:
        t = self._types
        parts = [t.Part.from_bytes(data=f, mime_type="image/jpeg") for f in frames] + [prompt]
        resp = self.client.models.generate_content(
            model=self.model,
            contents=parts,
            config=t.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        if not resp.text:
            raise ProviderError("Gemini devolvió una respuesta vacía (posible filtro de seguridad).")
        return resp.text

    def text(self, prompt: str) -> str:
        return self.client.models.generate_content(model=self.summary_model, contents=prompt).text or ""


class ClaudeProvider:
    name = "claude"

    def __init__(self, model: str | None = None):
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise ProviderError("Falta ANTHROPIC_API_KEY (https://console.anthropic.com/).")
        import anthropic

        self.client = anthropic.Anthropic()
        # Haiku: análisis cada pocos segundos = muchas llamadas con imágenes; es el más barato.
        self.model = model or os.getenv("CLAUDE_MODEL", "claude-haiku-5-5")
        self.summary_model = os.getenv("CLAUDE_SUMMARY_MODEL") or self.model

    def check(self):
        self.client.models.retrieve(self.model)

    def _create(self, model: str | None = None, **kwargs):
        model = model or self.model
        try:
            resp = self.client.messages.create(
                model=model, max_tokens=2000, output_config={"effort": "low"}, **kwargs
            )
        except TypeError:  # SDK antiguo sin output_config
            resp = self.client.messages.create(model=model, max_tokens=2000, **kwargs)
        if resp.stop_reason == "refusal":
            raise ProviderError("Claude rechazó analizar este fotograma.")
        return "".join(b.text for b in resp.content if b.type == "text")

    def analyze(self, frames: list[bytes], prompt: str) -> str:
        content = []
        for i, f in enumerate(frames, 1):
            content.append({"type": "text", "text": f"Fotograma {i} de {len(frames)}:"})
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": base64.standard_b64encode(f).decode("ascii"),
                    },
                }
            )
        content.append({"type": "text", "text": prompt})
        return self._create(system=SYSTEM_PROMPT, messages=[{"role": "user", "content": content}])

    def text(self, prompt: str) -> str:
        return self._create(model=self.summary_model, messages=[{"role": "user", "content": prompt}])


PROVIDERS = {"gemini": GeminiProvider, "claude": ClaudeProvider}


def make_provider(name: str, model: str | None = None):
    return PROVIDERS[name](model)
