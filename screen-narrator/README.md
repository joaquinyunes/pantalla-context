# Screen Narrator

Mira tu pantalla en vivo y te dice qué estás haciendo: *"Jugando League of Legends - ADC con Jinx - se hace un 1v5"*, *"Viendo YouTube - documental de una fábrica de jarras de vidrio en China"*, etc. Funciona con cualquier cosa (juegos, videos, web, código, apuestas...).

## Panel web

Al arrancar se abre **http://localhost:8765** con:
- **Ahora**: lo último que detectó (actividad, detalle, jugada destacada).
- **Resumen** por período: *último minuto*, 5 min, 15 min, 1 hora o toda la sesión. La IA lo redacta a partir de los análisis de esa ventana y se refresca solo cada ~20 s (o con "Actualizar resumen").
- Barra con el **porcentaje de tiempo por actividad** del período elegido.
- **Línea de tiempo** con filtro "Solo destacados" (🔥).
- Botón **Pausar captura**: mientras está pausado no se captura ni se envía nada.

El panel solo escucha en tu propio equipo (127.0.0.1); no es accesible desde otros dispositivos. Opciones: `--port 8800`, `--no-browser`, `--no-web`. Cada resumen del panel es una llamada extra a la IA (máx. una cada 20 s por período).

## Enviar los resúmenes a otro sistema

**A) Push (webhook):** el narrador hace `POST` de JSON a tu URL.

```bash
python narrator.py --webhook https://tu-servidor.com/hook --webhook-summary-every 5
python narrator.py --webhook https://tu-servidor.com/hook --webhook-min-importance 4   # solo jugadas destacadas
```

Eventos (`{"event": ..., "sent_at": <epoch>, "data": {...}}`, cabecera `X-Narrator-Event`):

| event | cuándo | `data` |
|---|---|---|
| `analysis` | cada análisis (filtrable con `--webhook-min-importance`) | `id, timestamp (ISO), actividad, detalle, momento_destacado, importancia 1-5, confianza, cambio_de_actividad, provider, model` |
| `summary` | cada N min con `--webhook-summary-every N` | `periodo_minutos, analisis, resumen, generado, provider, model` |
| `session_summary` | al cerrar con Ctrl+C | `analisis, resumen, inicio, fin, provider, model` |

- Se envía en segundo plano con 3 reintentos (los 4xx salvo 429 no se reintentan); si el destino cae, el narrador sigue y todo queda en `historial.jsonl`.
- Si defines `WEBHOOK_SECRET` en `.env`, cada petición lleva `X-Narrator-Signature: sha256=<HMAC-SHA256 del cuerpo>` para que tu servidor verifique que viene de ti. Ejemplo listo: `python examples/receiver.py`.
- Usa **https** en destinos fuera de tu red: el contenido describe lo que haces en pantalla.

**B) Pull (API):** otro sistema consulta cuando quiera.

| Endpoint | Devuelve |
|---|---|
| `GET /api/latest` | último análisis |
| `GET /api/entries?since_id=40&limit=100` | análisis nuevos desde ese id (para sondeo) |
| `GET /api/summary?minutes=1` | resumen del período (0 = sesión) |
| `GET /api/state`, `/api/health` | estado general |

Por defecto solo escucha en tu PC. Para abrirla a otra máquina hace falta token: `python narrator.py --host 0.0.0.0 --api-token UNA-FRASE-LARGA` y las peticiones llevan `Authorization: Bearer <token>`. En el navegador, abre `http://IP:8765/?token=...` una vez. Abre el puerto solo en redes de confianza (o usa un túnel/VPN).

## Más precisión

- `--context "League of Legends, juego Jinx de ADC"` (o `CONTEXT=` en `.env`): el mayor salto de precisión; evita que adivine juego, campeón o rol.
- `--max-width 1920` y `--interval 3`: más detalle del HUD y menos jugadas perdidas (cuesta más).
- `GEMINI_SUMMARY_MODEL=gemini-2.5-pro`: modelo más potente solo para resúmenes (pocas llamadas).
- `--save-highlights`: guarda una captura de cada jugada de importancia 4-5 en `salida/destacados/`, para comprobar si la IA acertó.
- Cada análisis trae `confianza` (alta/media/baja): filtra o revisa los de confianza baja.

## Qué hace

- Captura **3 fotogramas por ciclo** (cada 5 s por defecto) y los manda juntos a la IA, para que pueda ver *acciones* (una pelea, un multikill) y no solo una foto estática.
- Le pasa los últimos resúmenes como contexto, así no se repite y detecta cambios de actividad.
- **Ahorra llamadas**: si la pantalla no cambió, no analiza (salvo un chequeo cada 60 s).
- Cada análisis trae `importancia` 1-5; las jugadas de 4-5 salen marcadas con 🔥.
- Escribe en `salida/`:
  - `actual.txt` — último resumen (úsalo en OBS como *Texto > Leer desde archivo* para que tu stream lo muestre).
  - `historial.jsonl` — todos los análisis con hora.
  - `resumen_sesion.md` — resumen final de la sesión, generado al presionar Ctrl+C.

## Inicio rápido en Windows

Python 3.12 y las dependencias ya están instalados (entorno en `C:\Users\<tu usuario>\screen-narrator-venv`). Solo falta tu clave: abre `.env`, pega tu clave de Gemini después de `GEMINI_API_KEY=` y guarda. Luego haz doble clic en `iniciar.bat`.

## Instalación manual (Windows / macOS / Linux, Python 3.10+)

```bash
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

Edita `.env` y pega tu clave:
- **Gemini** (gratis con límites): https://aistudio.google.com/ → `GEMINI_API_KEY`
- **Claude** (de pago): https://console.anthropic.com/ → `ANTHROPIC_API_KEY` y `PROVIDER=claude`

## Uso

```bash
python narrator.py --dry-run          # guarda salida/prueba_captura.jpg: lo que vería la IA (sin llamar a la API)
python narrator.py --list-monitors    # ver qué número tiene cada monitor
python narrator.py                    # arrancar (Ctrl+C para terminar y obtener el resumen final)
python narrator.py --provider claude --monitor 2 --interval 4
```

Opciones útiles: `--interval` (segundos por ciclo), `--frames` (1-4), `--monitor`, `--threshold` (sensibilidad al cambio; más bajo = analiza más), `--memory` (resúmenes previos como contexto), `--once` (un solo análisis).

## Privacidad y costos

- **Tu pantalla se envía a Google o Anthropic** según el proveedor. Cierra el gestor de contraseñas, la banca y chats privados antes de empezar, o apunta `--monitor` a un monitor que solo tenga el juego. El prompt le pide no transcribir contraseñas ni datos personales, pero no es una garantía.
- Gemini gratis tiene límite de peticiones por minuto/día; si lo alcanzas verás avisos y el script reintenta. Sube `--interval` si pasa seguido.
- Con Claude el modelo por defecto es `claude-haiku-5-5` (el más barato, pensado para muchas llamadas con imágenes). Puedes cambiarlo con `CLAUDE_MODEL` en `.env`, por ejemplo a `claude-opus-5-5` para más precisión leyendo detalles pequeños (HUD, KDA, cuotas) a mayor costo.
- El modelo de Gemini por defecto es `gemini-2.5-flash`; si Google lo retira, cambia `GEMINI_MODEL`.

## Límites honestos

- La IA ve fotogramas, no video continuo: una jugada que dure menos que el intervalo puede pasarse. Baja `--interval` (p. ej. 3) para captar más.
- Los textos pequeños del HUD pueden leerse mal; con `--max-width 1920` ve más detalle (más costo).
- Puede equivocarse al identificar campeones o situaciones; trata el resultado como narración, no como dato exacto.

## Estructura

```
narrator.py     bucle principal, CLI, salidas
capture.py      captura (mss) y detección de cambios
providers.py    Gemini y Claude + prompt del sistema
store.py        estado compartido (análisis, pausa)
server.py       servidor del panel y API de resúmenes
web/index.html  la página del panel
```
