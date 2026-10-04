# Pantalla Contexto

Analizador de pantalla con IA, **gratis y ligero**. Compartes tu pantalla (o una ventana/pestaña), **seleccionas la zona que te interesa** y obtienes **qué está pasando**: el juego de casino que se está jugando, el partido que se ve en la casa de apuestas, el videojuego, el gráfico de trading, el vídeo...

Pensado para streamers: además del panel de análisis, incluye un **overlay para OBS** que muestra el contexto en directo sobre tu stream.

## Dos piezas

```
 ┌─ Visor (npm start) ─────────────┐         ┌─ Analizador (npm run analyzer) ─┐
 │ ve la pantalla                  │  HTTP   │ recibe la captura               │
 │ elige zona, vigila cambios      │ ──────► │ la pasa al motor de IA          │
 │ reduce y codifica solo si hace  │ ◄────── │ devuelve el contexto en JSON    │
 │ falta · overlay para OBS        │         │ (puede estar en OTRO equipo)    │
 └─────────────────────────────────┘         └─────────────────────────────────┘
```

- **El visor** es ligero: vigila con una miniatura de 32×18 px y solo envía una captura cuando algo cambió.
- **El analizador** es la parte pesada y se puede poner en otro equipo (uno con más CPU/GPU) para no cargar el PC del stream.

Por defecto no hace falta arrancar el analizador aparte: `npm start` lo lleva dentro. Se separa solo si quieres moverlo de máquina.

## Qué hace

- **Captura** la pantalla con la API del navegador (`getDisplayMedia`); nada que instalar en el equipo.
- **Selección de zona**: arrastra un rectángulo sobre la vista previa y solo se envía esa parte. Si no eliges nada, se analiza la pantalla completa.
- **Perfiles de contenido**: automático, casino/slots, apuestas deportivas/partido, videojuego, stream, trading, vídeo, trabajo y general.
- **Resultado estructurado**: título, resumen, datos clave (juego, apuesta, saldo, marcador, cuotas...) y una frase lista para pegar en el chat. Con los motores completos (Gemini, Claude) añade qué ha cambiado y lo que no se pudo confirmar.
- **Vigilancia automática**: analiza solo cuando la imagen cambia y se estabiliza.
- **Pista opcional** («Champions League», «estoy en un casino online») para orientar al modelo.
- **Overlay para OBS** en `/overlay` con fondo transparente.
- Historial de los últimos 20 análisis.

## Elegir un motor gratis

| | **Ollama** (local) | **Gemini** (nube, nivel gratuito) | **Claude** |
|---|---|---|---|
| Coste | Gratis | Gratis con límites | De pago |
| Privacidad | La imagen **no sale de tu red** | Sale a Google. Según sus términos para servicios gratuitos, el contenido puede usarse para mejorar sus productos (revisa los términos vigentes) | Sale a Anthropic |
| Carga en tu equipo | CPU y RAM mientras analiza | Ninguna | Ninguna |
| Calidad de lectura | Media (modelo pequeño) | Buena | La mejor |
| Límite | Tu hardware | Cuotas por minuto y por día que Google cambia con frecuencia: míralas en [Google AI Studio](https://aistudio.google.com) | Tu presupuesto |

Con `PANTALLA_BACKEND=auto` (por defecto) se usa el primero que esté listo, en este orden: **Ollama → Gemini → Claude**. Siempre gratis antes que de pago.

Recomendación: **Ollama** si te importa la privacidad o quieres no depender de cuotas; **Gemini** si tu equipo va justo de CPU/RAM y lo que muestras no es privado.

## Cómo se ahorra CPU y memoria

Lo que hace la app para gastar poco, sea cual sea el motor:

- **Vigilancia casi gratis**: cada segundo lee una miniatura de 32×18 px. Solo cuando la imagen cambió **y se quedó quieta** recorta, reduce y codifica una captura.
- **Pocos fotogramas**: pide al navegador 2 fps (máximo 5) en lugar de vídeo fluido.
- **Separación mínima** entre análisis (5–60 s) y **refresco opcional** si quieres que se actualice aunque no cambie nada.
- **Imágenes pequeñas**: 768 px de lado largo con Ollama, 1024 con Gemini y 1568 con Claude (`PANTALLA_MAX_SIDE` lo cambia). Menos píxeles = menos tokens = menos tiempo.
- **Una zona pequeña pesa menos**: elige solo el marcador, la mesa o el HUD en lugar de toda la pantalla.
- **Perfil «ligero» para modelos locales**: prompt de ~110 palabras y solo 6 campos de salida. En CPU cada token cuesta tiempo.
- **Ollama descarga el modelo de la RAM** tras `PANTALLA_OLLAMA_KEEP_ALIVE` (60 s por defecto) sin usarse, y `PANTALLA_OLLAMA_THREADS` limita los hilos para dejar núcleos al stream.
- **Un análisis a la vez**: si llega otra captura mientras se procesa una, se rechaza en vez de encolarla.

Medido en Chromium headless con una fuente de vídeo sintética (no es una captura real de pantalla; varía un poco entre ejecuciones):

| | Coste |
|---|---|
| Una lectura de vigilancia (miniatura) | 0,01–0,05 ms |
| Codificar una captura de 1568 px | 17–18 ms |
| Visor vigilando una imagen quieta | 1,2–1,4 ms de hilo principal por segundo (~0,13 % de un núcleo) |

La captura real de pantalla del navegador tiene su propio coste fuera de estas cifras. Por eso se pide a 2 fps; mídelo en tu equipo.

## Puesta en marcha

Requisitos: Node.js 22.9 o superior.

### A · Gratis y local (Ollama)

```bash
# 1) Instala Ollama (https://ollama.com) y descarga un modelo de visión pequeño
ollama pull qwen3-vl:2b

# 2) Arranca la app
npm install
npm start
```

Abre <http://127.0.0.1:3000>. Arriba verás el analizador activo. Si Ollama no está arrancado o falta el modelo, un aviso lo dice y desaparece solo cuando lo arreglas.

### B · Gratis en la nube (Gemini)

Consigue una clave en [Google AI Studio](https://aistudio.google.com), y:

```bash
cp .env.example .env     # pon GEMINI_API_KEY=...
npm install && npm start
```

### C · De pago (Claude)

```bash
cp .env.example .env     # pon ANTHROPIC_API_KEY=...
npm install && npm start
```

### D · Analizador en otro equipo

En el equipo potente (analizador):

```bash
# .env
PANTALLA_ANALYZER_HOST=0.0.0.0
PANTALLA_ANALYZER_TOKEN=un-secreto-largo-y-aleatorio
npm run analyzer
```

En el equipo del stream (visor):

```bash
# .env
PANTALLA_ANALYZER_URL=http://IP-DEL-OTRO-EQUIPO:4000
PANTALLA_ANALYZER_TOKEN=un-secreto-largo-y-aleatorio
npm start
```

El analizador se niega a escuchar fuera de localhost sin token. Las capturas viajan **sin cifrar**: úsalo solo en una red de confianza, o con una VPN (Tailscale, WireGuard) o un túnel SSH.

### Modelos locales

Según guías de terceros (no los he probado aquí): `qwen3-vl:2b` (el de por defecto, orientado a capturas e interfaces), `qwen3-vl:4b`, `gemma3:4b` y `moondream` son los candidatos para equipos con poca memoria; los de 7–8B piden unos 8 GB. Cámbialo con `PANTALLA_OLLAMA_MODEL`. Si `ollama pull` no encuentra la etiqueta, mira la lista de modelos con visión en <https://ollama.com/search?c=vision>. Los modelos con razonamiento tardan más: usa una variante sin él o `PANTALLA_OLLAMA_THINK=0`.

## Usarlo

1. Pulsa **Compartir pantalla** y elige qué compartir (si solo te interesa una web, elige «Pestaña»).
2. **Seleccionar zona** y arrastra sobre la imagen. «Pantalla completa» vuelve a analizarla entera.
3. **Analizar ahora**, o activa **Vigilar automáticamente**: «como mucho cada» fija la separación mínima y «refrescar aunque no cambie» añade un refresco periódico.

### Usarlo en OBS

1. Pulsa **Copiar URL del overlay (OBS)** (o usa `http://127.0.0.1:3000/overlay`).
2. En OBS: *Fuentes → + → Navegador* y pega la URL (por ejemplo 800×300).
3. Mantén marcada **Publicar en el overlay**. Cada análisis nuevo lo actualiza en un par de segundos.

`/overlay?entities=0` oculta las etiquetas de datos clave y deja solo título y resumen.

## Configuración

Copia `.env.example` a `.env`: está comentado variable por variable. Las principales:

| Variable | Por defecto | Para qué |
|---|---|---|
| `PANTALLA_BACKEND` | `auto` | `auto`, `ollama`, `gemini` o `claude` |
| `OLLAMA_HOST` / `PANTALLA_OLLAMA_MODEL` | `127.0.0.1:11434` / `qwen3-vl:2b` | Dónde está Ollama y qué modelo usar |
| `PANTALLA_OLLAMA_KEEP_ALIVE` / `PANTALLA_OLLAMA_THREADS` | `60s` / sin límite | Cuándo liberar la RAM y cuántos hilos usar |
| `GEMINI_API_KEY` / `PANTALLA_GEMINI_MODEL` | — / `gemini-flash-lite-latest` | Clave y modelo de Gemini |
| `ANTHROPIC_API_KEY` / `PANTALLA_CLAUDE_MODEL` | — / `claude-opus-5-5` | Clave y modelo de Claude (`claude-sonnet-5-5` sale más barato) |
| `PANTALLA_MAX_SIDE` | según motor | Lado largo máximo de la imagen enviada |
| `PANTALLA_ANALYZER_URL` / `_TOKEN` | — | Visor: usar un analizador remoto |
| `PANTALLA_ANALYZER_HOST` / `_PORT` | `127.0.0.1` / `4000` | Analizador: dónde escucha |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Dónde escucha el visor |

> Si venías de la versión anterior: `PANTALLA_MODEL`, `PANTALLA_EFFORT` y `PANTALLA_FALLBACKS` son ahora `PANTALLA_CLAUDE_MODEL`, `PANTALLA_CLAUDE_EFFORT` y `PANTALLA_CLAUDE_FALLBACKS`.

## Privacidad y seguridad

- Con **Ollama** la imagen no sale de tu red. Con **Gemini** o **Claude** sí sale: elige la zona con cuidado y evita contraseñas, datos bancarios, mensajes privados o información de terceros.
- Solo se envía la zona elegida, ya recortada y reducida. El servidor **no guarda imágenes**; en memoria solo conserva el último texto publicado para el overlay.
- Las claves viven solo en el servidor; el navegador nunca las ve.
- Por defecto, el visor y el analizador escuchan solo en `127.0.0.1` y rechazan peticiones con un `Host` que no sea localhost (protege contra DNS rebinding y webs que intenten usar tu clave o tu modelo). **No los expongas a internet** sin autenticación y cifrado delante.
- El texto que aparece en la pantalla se trata como contenido a describir, no como instrucciones para el modelo.
- En contenido de apuestas y casino el modelo **solo describe** lo que se ve (juego, ronda, importes, cuotas). No da consejos, pronósticos ni estrategias de apuesta.
- No identifica a personas por su cara; sí puede usar nombres que aparezcan como texto (subtítulos, nombres de usuario).

## Estado de las pruebas

`npm test` ejecuta 86 pruebas: validación, servidor, vigilancia, cada motor contra un servidor simulado, y los procesos reales del visor y del analizador hablando entre sí. Además se probó la interfaz en un navegador real con una pantalla simulada.

**Lo que no se ha podido probar aquí:** ningún modelo real (ni Ollama, ni Gemini, ni Claude con clave) y la captura de una pantalla real. Todo se probó contra servidores simulados, así que **la calidad de los resultados con tu modelo, los nombres exactos de modelos y los límites del nivel gratuito hay que verlos en tu equipo.** Con un modelo pequeño espera nombres de juego y números menos fiables que con Claude: usa la pista opcional y una zona pequeña para ayudarle.

Cuánto se ha podido verificar de cada motor:

| Motor | Formato de la petición |
|---|---|
| Claude | Comprobado contra los tipos del SDK oficial |
| Ollama | Comprobado contra la documentación de su API (`/api/chat`, imágenes, `format`, `keep_alive`, `options`) |
| Gemini | **Escrito de memoria**: desde este entorno no se pudo consultar su documentación. Si la primera llamada falla, el mensaje de error de Google indicará qué campo ajustar (`src/backends/gemini.js`) |

## Cómo está hecho

```
server.js            visor: lee el entorno, crea el motor y sirve la interfaz
analyzer.js          analizador: servicio aparte con el mismo motor
src/app.js           visor: /api/analyze, /api/latest, /api/config y archivos estáticos
src/analyzer-service.js  analizador: /analyze (con token) y /health
src/backends/        motores: ollama, gemini, claude, remote (cliente del analizador) y el selector
src/config.js        lectura y validación de variables de entorno
src/prompt.js        prompts y esquemas de salida (completo y ligero)
src/validate.js      validación de la petición y limpieza del resultado
src/http.js          utilidades HTTP compartidas (límites de tamaño, Host, errores)
public/              interfaz, vigilancia, overlay de OBS y funciones de captura
test/                pruebas con node:test
```

Una única dependencia: el SDK oficial de Anthropic. Ollama y Gemini se llaman por HTTP directo.

## Limitaciones

- Compartir pantalla requiere un navegador de escritorio (Chrome, Edge o Firefox). Los móviles no lo permiten.
- No se captura audio, solo imagen.
- La vigilancia compara una miniatura de 32×18: un cambio pequeño (un dígito del marcador) puede pasar desapercibido si miras la pantalla completa. **Selecciona la zona del marcador** para que cuente, o activa el refresco periódico.
- Cada análisis con un modelo local puede tardar de segundos a decenas de segundos según tu CPU.
- Un modelo local necesita RAM libre mientras analiza (la libera después, según `PANTALLA_OLLAMA_KEEP_ALIVE`).

## Proyectos parecidos

Antes de construir esto busqué lo que ya existe. Ninguno combina selección de zona, perfiles por tipo de contenido y overlay para streamers, pero conviene conocerlos:

- [Screenpipe](https://screenpipe.com): graba pantalla y micro 24/7 en local con OCR y búsqueda; más pensado como «memoria» de lo que has hecho que como contexto en vivo.
- [ScreenMind](https://github.com/ayushh0110/ScreenMind): captura periódica con detección de cambios y análisis 100 % local (Gemma); describe actividad y permite buscar en el historial.
- [Screen Analysis Overlay](https://github.com/PasiKoodaa/Screen-Analysis-Overlay): overlay transparente que analiza capturas con un modelo local (KoboldCPP u Ollama).
- [shadcn-screenshare-ai-analysis](https://github.com/cameronking4/shadcn-screenshare-ai-analysis): componente Next.js que analiza pestañas, ventanas o pantalla con GPT-4o mini.
- [gpt4v-screenshot-analyzer](https://github.com/jeremy-collins/gpt4v-screenshot-analyzer): captura una zona y permite conversar con GPT-4 Vision sobre ella.
- [ScreenAI (Nono81)](https://github.com/Nono81/ScreenAI): atajo de teclado para capturar, anotar y preguntar a Claude, GPT, Gemini u Ollama.
- [Vision Agents de Stream](https://github.com/GetStream/Vision-Agents): framework para construir agentes de visión en tiempo real sobre vídeo.
