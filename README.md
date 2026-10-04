# Pantalla Contexto

Analizador de pantalla con IA. Compartes tu pantalla (o una ventana/pestaña), **seleccionas la zona que te interesa** y Claude te dice **qué está pasando**: el juego de casino que se está jugando, el partido que se ve en la casa de apuestas, el videojuego, el gráfico de trading, el vídeo...

Pensado para streamers: además del panel de análisis, incluye un **overlay para OBS** que muestra el contexto en directo sobre tu stream.

## Qué hace

- **Captura** la pantalla con la API del navegador (`getDisplayMedia`); nada que instalar en el equipo.
- **Selección de zona**: arrastra un rectángulo sobre la vista previa y solo se envía esa parte. Si no eliges nada, se analiza la pantalla completa.
- **Perfiles de contenido**: automático, casino/slots, apuestas deportivas/partido, videojuego, stream, trading, vídeo, trabajo y general. Cada uno le dice al modelo en qué fijarse (juego y proveedor, marcador y cuotas, HUD, activo y temporalidad...).
- **Resultado estructurado**: título, resumen, datos clave (juego, apuesta, saldo, marcador, cuotas...), una frase lista para pegar en el chat, qué ha cambiado desde el análisis anterior y lo que no se pudo confirmar.
- **Modo automático** cada 5–60 s con **detección de cambios**: si la imagen no cambió, no llama a la API (ahorra coste).
- **Pista opcional** («Champions League», «estoy en un casino online») para orientar al modelo.
- **Overlay para OBS** en `/overlay` con fondo transparente.
- Historial de los últimos 20 análisis.

## Puesta en marcha

Requisitos: Node.js 22.9 o superior y una API key de Anthropic.

```bash
npm install
cp .env.example .env      # y pon tu ANTHROPIC_API_KEY dentro
npm start
```

Abre <http://127.0.0.1:3000>, pulsa **Compartir pantalla**, elige qué compartir, y luego **Analizar ahora** (o activa el modo automático).

### Usarlo en OBS

1. En la app pulsa **Copiar URL del overlay (OBS)** (o usa `http://127.0.0.1:3000/overlay`).
2. En OBS: *Fuentes → + → Navegador* y pega la URL (por ejemplo 800×300).
3. Mantén marcada la casilla **Publicar en el overlay**. Cada análisis nuevo actualiza el overlay en un par de segundos.

`/overlay?entities=0` oculta las etiquetas de datos clave y deja solo título y resumen.

## Configuración

Variables de entorno (en `.env` o exportadas):

| Variable | Por defecto | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Tu clave de la API (obligatoria) |
| `PANTALLA_MODEL` | `claude-opus-5-5` | Modelo a usar. `claude-sonnet-5-5` es más barato y rápido para el modo automático |
| `PANTALLA_EFFORT` | `low` | Esfuerzo de razonamiento: `low`, `medium`, `high`, `xhigh`, `max` |
| `PANTALLA_FALLBACKS` | `1` | `0` desactiva el reintento automático en otro modelo cuando la API rechaza una petición por política |
| `PORT` / `HOST` | `3000` / `127.0.0.1` | Dónde escucha el servidor |

## Privacidad y seguridad

- Cada análisis **envía la imagen a la API de Anthropic**. Solo se envía la zona elegida, ya recortada y reducida a un máximo de 1568 px. El servidor **no guarda imágenes**; en memoria solo conserva el último texto publicado para el overlay.
- Elige la zona con cuidado: evita contraseñas, datos bancarios, mensajes privados o información de terceros.
- La API key vive solo en el servidor; el navegador nunca la ve.
- El servidor escucha solo en `127.0.0.1` y rechaza peticiones con un `Host` que no sea localhost (protege contra DNS rebinding y webs que intenten usar tu clave). **No lo expongas a internet** (`HOST=0.0.0.0`) sin ponerle autenticación delante: cualquiera que lo alcance gastaría tu crédito.
- El texto que aparece en la pantalla se trata como contenido a describir, no como instrucciones para el modelo.
- En contenido de apuestas y casino el modelo **solo describe** lo que se ve (juego, ronda, importes, cuotas). No da consejos, pronósticos ni estrategias de apuesta.
- No identifica a personas por su cara; sí puede usar nombres que aparezcan como texto (subtítulos, nombres de usuario).

## Cómo está hecho

```
server.js            arranque: lee el entorno y crea el cliente de Anthropic
src/app.js           servidor HTTP: /api/analyze, /api/latest, /api/config y archivos estáticos
src/analyzer.js      llamada a Claude (imagen + texto, salida JSON con esquema, fallbacks)
src/prompt.js        prompt de sistema, esquema del resultado y texto por petición
src/modes.js         perfiles de contenido e idiomas
src/validate.js      validación de la petición y limpieza del resultado
public/              interfaz (index), overlay de OBS y funciones de captura
test/                pruebas con node:test
```

Sin dependencias de frontend ni de servidor aparte del SDK oficial de Anthropic.

```bash
npm test      # 33 pruebas: validación, servidor, formato de la petición a Claude, geometría de captura
```

## Limitaciones

- Compartir pantalla requiere un navegador de escritorio (Chrome, Edge o Firefox). Los móviles no lo permiten.
- No se captura audio, solo imagen. Si solo te interesa una web, elige «Pestaña» en el diálogo del navegador: así no se comparte nada más de tu escritorio.
- La precisión depende de lo legible que sea la zona: texto pequeño o borroso se marca en «No se pudo confirmar» en lugar de inventarse.
- Cada análisis tarda unos segundos; el modo automático no solapa peticiones.

## Proyectos parecidos

Antes de construir esto busqué lo que ya existe. Ninguno combina selección de zona, perfiles por tipo de contenido y overlay para streamers, pero conviene conocerlos:

- [Screenpipe](https://screenpipe.com): graba pantalla y micro 24/7 en local con OCR y búsqueda; más pensado como «memoria» de lo que has hecho que como contexto en vivo.
- [ScreenMind](https://github.com/ayushh0110/ScreenMind): captura periódica con detección de cambios y análisis 100 % local (Gemma); describe actividad y permite buscar en el historial.
- [Screen Analysis Overlay](https://github.com/PasiKoodaa/Screen-Analysis-Overlay): overlay transparente que analiza capturas con un modelo local (KoboldCPP u Ollama).
- [shadcn-screenshare-ai-analysis](https://github.com/cameronking4/shadcn-screenshare-ai-analysis): componente Next.js que analiza pestañas, ventanas o pantalla con GPT-4o mini.
- [gpt4v-screenshot-analyzer](https://github.com/jeremy-collins/gpt4v-screenshot-analyzer): captura una zona y permite conversar con GPT-4 Vision sobre ella.
- [ScreenAI (Nono81)](https://github.com/Nono81/ScreenAI): atajo de teclado para capturar, anotar y preguntar a Claude, GPT, Gemini u Ollama.
- [Vision Agents de Stream](https://github.com/GetStream/Vision-Agents): framework para construir agentes de visión en tiempo real sobre vídeo.
