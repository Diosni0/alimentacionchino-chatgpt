# M-IA Khalifa V2 – Telegram Bot con OpenAI

Bot de Telegram con personalidad agresiva, impulsado por OpenAI y diseñado para responder únicamente cuando se le menciona. Este proyecto es una versión nueva y limpia específica para Telegram, manteniendo el mismo “cerebro” (`bot_context.txt`) y el límite de respuesta corto del bot original de Twitch.

## Características

- Respuestas con OpenAI usando el modelo que definas (`gpt-4o-mini` por defecto).
- Personalidad fija controlada por `bot_context.txt` (no lo borres, allí vive la mala leche del bot).
- Responde solo a menciones `@TuBot` o a chats privados, respetando Privacy Mode.
- Control de invitaciones: solo los IDs listados en `ADMIN_USERS` pueden añadirlo a grupos; si otro usuario lo invita, el bot se va insultando.
- Historial corto por chat para mantener contexto sin memorias infinitas.
- Cooldown por usuario para evitar spam.
- Servidor Express con endpoints de salud y métricas listos para Render.

## Requisitos

- Node.js 18.17 o superior.
- Token de bot de Telegram (consigue uno con [@BotFather](https://t.me/BotFather)).
- API Key de OpenAI.
- Tu ID numérico de Telegram (usa `@userinfobot` u otro bot similar).

## Variables de entorno

Crea un archivo `.env` basado en `env.example` (o rellena `.env.render` si vas directo a Render):

```env
TELEGRAM_BOT_TOKEN=tu_token_de_telegram
OPENAI_API_KEY=tu_api_key_de_openai
ADMIN_USERS=123456789            # IDs numéricos, separados por comas
ALLOWED_GROUPS=                  # Opcional: IDs de grupos permitidos
COOLDOWN_SECONDS=10              # Antispam
MODEL_NAME=gpt-4o-mini
TEMPERATURE=1.0
TOP_P=1.0
MAX_TOKENS=250
FREQUENCY_PENALTY=0.0
PRESENCE_PENALTY=0.0
HISTORY_LENGTH=5
MAX_MESSAGE_LENGTH=450           # Conserva el límite del bot original
SEND_USERNAME=true
PORT=3000                        # Usa 10000 en Render
```

> ⚠️ `ADMIN_USERS` es obligatorio: si está vacío, la app no arrancará. Solo esos IDs podrán invitar al bot a grupos.

## Instalación local

```bash
npm install
npm start
```

- El bot inicia polling contra Telegram.
- El servidor HTTP escucha en `http://localhost:3000`.
- Endpoints disponibles:
  - `GET /` – información básica.
  - `GET /health` – estado del servicio.
  - `GET /metrics` – métricas simples (`processed`, `errors`, cache, etc.).

## Despliegue en Render

1. Sube el repo a GitHub y crea un **Web Service** en Render.
2. Configura:
   - `Build Command`: `npm install`
  - `Start Command`: `npm start`
3. Carga las variables de entorno descritas arriba (puedes subir el archivo `.env.render` desde el dashboard).
4. Render asigna su propio puerto (normalmente 10000); el bot usa `PORT` para que Express escuche ese valor.
5. Tras el deploy deberías ver en los logs:
   ```
   🤖 Bot ready as @TuBot
   🌐 HTTP server listening on port 10000
   🚀 Telegram bot started and polling for updates
   ```

## Uso en Telegram

- Añade el bot al grupo desde una cuenta cuyo ID esté en `ADMIN_USERS`.
- Escríbele mencionándolo: `@TuBot qué opinas de esto?`
- También responde si le contestas directamente a un mensaje suyo o le hablas por privado.
- Si alguien no autorizado lo invita, el bot se marcha automáticamente.

## Personaliza la personalidad

Edita `bot_context.txt` (mantén el tono corto y agresivo). Se carga una sola vez al arrancar; reinicia la app si cambias el contexto.

## Desarrollo y contribución

- Usa `npm run dev` con `node --watch` si necesitas recarga rápida (puedes ajustar el script en `package.json`).
- Cualquier mejora debe respetar:
  - Límite de respuesta (`MAX_MESSAGE_LENGTH = 450`).
  - Uso del archivo de contexto.
  - Protección de invitaciones mediante `ADMIN_USERS`.

---

Mantén tus tokens seguros y disfruta del caos con M-IA Khalifa V2. 💣
