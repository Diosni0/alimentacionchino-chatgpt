# ­ƒñû Bot de Twitch con IA - Versi├│n Limpia y Elegante

**Bot de Twitch inteligente con integraci├│n de OpenAI, optimizado para rendimiento y simplicidad.**

## ­ƒîƒ Caracter├¡sticas Principales

- **­ƒºá IA Avanzada**: Integraci├│n completa con OpenAI (GPT-5 Chat)
- **ÔÜí Ultra Optimizado**: Cache inteligente, rate limiting adaptativo, gesti├│n eficiente de memoria
- **­ƒÄ¡ Personalidad Completa**: Sistema de contexto avanzado para mantener personalidad consistente
- **­ƒæÑ Control de Acceso**: Restricci├│n por suscriptores, bypass para moderadores
- **­ƒôè Monitoreo**: M├®tricas en tiempo real, health checks, logging estructurado
- **­ƒöº F├ícil Configuraci├│n**: Setup simple con variables de entorno
- **­ƒÜÇ Deploy Autom├ítico**: Listo para Render.com con configuraci├│n incluida

## ­ƒÅù´©Å Arquitectura Limpia

Esta versi├│n ha sido completamente reestructurada para ser:
- Ô£à **Simple**: Solo 6 archivos principales, sin duplicados
- Ô£à **Elegante**: C├│digo limpio y bien organizado
- Ô£à **Potente**: Mantiene todas las optimizaciones avanzadas
- Ô£à **Mantenible**: F├ícil de entender y modificar

## ­ƒôï Archivos Principales

- **`bot.js`** - Bot principal con toda la l├│gica optimizada
- **`server.js`** - Servidor Express con API REST
- **`config.js`** - Configuraci├│n centralizada y validada
- **`file_context.txt`** - Contexto y personalidad del bot
- **`package.json`** - Dependencias y scripts
- **`render.yaml`** - Configuraci├│n de despliegue

---

## ­ƒÜÇ Instalaci├│n y Configuraci├│n

### 1. Hacer Fork del Repositorio

Inicia sesi├│n en GitHub y haz fork de este repositorio para obtener tu propia copia.

### 2. Configurar el Contexto del Bot

Abre `file_context.txt` y personaliza toda la informaci├│n de fondo para tu bot. Este contenido se incluir├í en cada solicitud a la IA.

### 3. Crear Cuenta en OpenAI

Crea una cuenta en [OpenAI](https://platform.openai.com) y configura l├¡mites de facturaci├│n si es necesario.

### 4. Obtener API Key de OpenAI

Genera una clave API en la [p├ígina de claves API](https://platform.openai.com/account/api-keys) y gu├írdala de forma segura.

### 5. Desplegar en Render

Render te permite ejecutar tu bot 24/7 de forma gratuita. Sigue estos pasos:

#### 5.1. Desplegar en Render

Haz clic en el bot├│n para desplegar:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### 5.2. Iniciar Sesi├│n con GitHub

Inicia sesi├│n con tu cuenta de GitHub y selecciona tu repositorio forkeado para el despliegue.

### 6. Configurar Variables de Entorno

Ve a la pesta├▒a de variables/environment en tu despliegue de Render y configura las siguientes variables:

#### 6.1. Variables Obligatorias

- `OPENAI_API_KEY`: Tu clave API de OpenAI

#### 6.2. Variables de Integraci├│n con Twitch

- `TWITCH_USER`: Nombre de usuario del bot (ej: `MIAKhalifaV2Bot`)
- `TWITCH_AUTH`: Token OAuth para tu bot de Twitch
  - Ve a https://twitchapps.com/tmi/ y haz clic en "Connect with Twitch"
  - Copia el token de la p├ígina y p├®galo en la variable TWITCH_AUTH
  - ÔÜá´©Å **ESTE TOKEN PUEDE EXPIRAR DESPU├ëS DE UNOS D├ìAS** ÔÜá´©Å

**Para funciones de suscriptores, tambi├®n necesitas:**
- `TWITCH_CLIENT_ID`: ID de cliente de tu aplicaci├│n de Twitch
- `TWITCH_CLIENT_SECRET`: Secreto de cliente de tu aplicaci├│n de Twitch
  - Crea una nueva aplicaci├│n en https://dev.twitch.tv/console
  - Obt├®n tu Client ID y Client Secret

#### 6.3. Variables de Configuraci├│n del Bot

- `CHANNELS`: Lista de canales de Twitch donde funcionar├í el bot (separados por comas)
- `COMMAND_NAME`: (por defecto: `!gpt`) Comando que activa el bot. Puedes configurar m├║ltiples comandos separ├índolos con comas (ej: `!gpt,!ia,!mia`)
- `SEND_USERNAME`: (por defecto: `true`) Si incluir el nombre de usuario en el mensaje enviado a OpenAI
- `ENABLE_TTS`: (por defecto: `false`) Si habilitar Text-to-Speech
- `COOLDOWN_DURATION`: (por defecto: `10`) Duraci├│n del cooldown en segundos entre respuestas

#### 6.4. Control de Acceso por Suscriptores

- `SUBSCRIBERS_ONLY`: (por defecto: `false`) Si restringir el uso del bot solo a suscriptores
- `MODERATORS_BYPASS`: (por defecto: `true`) Si los moderadores pueden saltarse las restricciones de suscriptor

#### 6.5. Configuraci├│n Avanzada de OpenAI

- `MODEL_NAME`: (por defecto: `gpt-5-chat-latest`) Modelo de OpenAI a usar
- `TEMPERATURE`: (por defecto: `1.0`) Controla la aleatoriedad en la primera interacci├│n
- `SECOND_TEMPERATURE`: (por defecto: `1.3`) Aumenta creatividad a partir de la segunda interacci├│n del mismo usuario
- `TOP_P`: (por defecto: `1.0`)
- `SECOND_TOP_P`: (por defecto: `1.0`)
- `MAX_TOKENS`: (por defecto: `200`) N├║mero m├íximo de tokens en la respuesta (alias: `MAX_COMPLETION_TOKENS`)
- `FREQUENCY_PENALTY`: (por defecto: `0.5`)
- `PRESENCE_PENALTY`: (por defecto: `0.0`)
- `HISTORY_LENGTH`: (por defecto: `5`)

---

## ­ƒÆ¼ Uso del Bot

### Comandos

Puedes interactuar con el bot usando comandos en el chat de Twitch. Por defecto, el comando es `!gpt`. Puedes cambiarlo en las variables de entorno.

### Ejemplo

Para usar el comando `!gpt`:

```twitch
!gpt ┬┐C├│mo est├í el clima hoy?
```

El bot responder├í con un mensaje generado por OpenAI.

### Control de Suscriptores

Si `SUBSCRIBERS_ONLY` est├í habilitado:
- Solo los suscriptores del canal pueden usar el bot
- Los moderadores pueden saltarse esta restricci├│n si `MODERATORS_BYPASS` est├í habilitado
- Los no suscriptores recibir├ín un mensaje explicando la restricci├│n

### Endpoints de API

El bot proporciona varios endpoints de API:

- `GET /gpt/:text` - Generar una respuesta (para integraciones externas)
- `GET /metrics` - Obtener m├®tricas del bot
- `GET /health` - Verificar estado de salud del bot
- `POST /clear-cache` - Limpiar cache del bot

---

## ­ƒÄø´©Å Ajuste Fino de Par├ímetros de OpenAI

Sugerencias:
- Si quieres m├ís creatividad: sube `SECOND_TEMPERATURE` a `1.5` y/o baja `FREQUENCY_PENALTY` a `0.2`.
- Si quieres respuestas m├ís concisas: baja `SECOND_TEMPERATURE` a `1.1` y `TOP_P` a `0.9`.

---

## ­ƒôè Monitoreo y M├®tricas

Visita `/metrics` para ver estad├¡sticas de uso y salud.

---

## ­ƒÜÇ Scripts Disponibles

```bash
npm start
npm run dev
npm test
```

---

## ­ƒôä Licencia

MIT
