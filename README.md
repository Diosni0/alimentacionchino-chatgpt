# 🤖 Bot de Twitch con IA - Versión Limpia y Elegante

**Bot de Twitch inteligente con integración de OpenAI, optimizado para rendimiento y simplicidad.**

## 🌟 Características Principales

- **🧠 IA Avanzada**: Integración completa con OpenAI (GPT-5 Chat)
- **⚡ Ultra Optimizado**: Cache inteligente, rate limiting adaptativo, gestión eficiente de memoria
- **🎭 Personalidad Completa**: Sistema de contexto avanzado para mantener personalidad consistente
- **👥 Control de Acceso**: Restricción por suscriptores, bypass para moderadores
- **📊 Monitoreo**: Métricas en tiempo real, health checks, logging estructurado
- **🔧 Fácil Configuración**: Setup simple con variables de entorno
- **🚀 Deploy Automático**: Listo para Render.com con configuración incluida

## 🏗️ Arquitectura Limpia

Esta versión ha sido completamente reestructurada para ser:
- ✅ **Simple**: Solo 6 archivos principales, sin duplicados
- ✅ **Elegante**: Código limpio y bien organizado
- ✅ **Potente**: Mantiene todas las optimizaciones avanzadas
- ✅ **Mantenible**: Fácil de entender y modificar

## 📋 Archivos Principales

- **`bot.js`** - Bot principal con toda la lógica optimizada
- **`server.js`** - Servidor Express con API REST
- **`config.js`** - Configuración centralizada y validada
- **`file_context.txt`** - Contexto y personalidad del bot
- **`package.json`** - Dependencias y scripts
- **`render.yaml`** - Configuración de despliegue

---

## 🚀 Instalación y Configuración

### 1. Hacer Fork del Repositorio

Inicia sesión en GitHub y haz fork de este repositorio para obtener tu propia copia.

### 2. Configurar el Contexto del Bot

Abre `file_context.txt` y personaliza toda la información de fondo para tu bot. Este contenido se incluirá en cada solicitud a la IA.

### 3. Crear Cuenta en OpenAI

Crea una cuenta en [OpenAI](https://platform.openai.com) y configura límites de facturación si es necesario.

### 4. Obtener API Key de OpenAI

Genera una clave API en la [página de claves API](https://platform.openai.com/account/api-keys) y guárdala de forma segura.

### 5. Desplegar en Render

Render te permite ejecutar tu bot 24/7 de forma gratuita. Sigue estos pasos:

#### 5.1. Desplegar en Render

Haz clic en el botón para desplegar:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### 5.2. Iniciar Sesión con GitHub

Inicia sesión con tu cuenta de GitHub y selecciona tu repositorio forkeado para el despliegue.

### 6. Configurar Variables de Entorno

Ve a la pestaña de variables/environment en tu despliegue de Render y configura las siguientes variables:

#### 6.1. Variables Obligatorias

- `OPENAI_API_KEY`: Tu clave API de OpenAI

#### 6.2. Variables de Integración con Twitch

- `TWITCH_USER`: Nombre de usuario del bot (ej: `MIAKhalifaV2Bot`)
- `TWITCH_AUTH`: Token OAuth para tu bot de Twitch
  - Ve a https://twitchapps.com/tmi/ y haz clic en "Connect with Twitch"
  - Copia el token de la página y pégalo en la variable TWITCH_AUTH
  - ⚠️ **ESTE TOKEN PUEDE EXPIRAR DESPUÉS DE UNOS DÍAS** ⚠️

**Para funciones de suscriptores, también necesitas:**
- `TWITCH_CLIENT_ID`: ID de cliente de tu aplicación de Twitch
- `TWITCH_CLIENT_SECRET`: Secreto de cliente de tu aplicación de Twitch
  - Crea una nueva aplicación en https://dev.twitch.tv/console
  - Obtén tu Client ID y Client Secret

#### 6.3. Variables de Configuración del Bot

- `CHANNELS`: Lista de canales de Twitch donde funcionará el bot (separados por comas)
- `COMMAND_NAME`: (por defecto: `!gpt`) Comando que activa el bot. Puedes configurar múltiples comandos separándolos con comas (ej: `!gpt,!ia,!mia`)
- `SEND_USERNAME`: (por defecto: `true`) Si incluir el nombre de usuario en el mensaje enviado a OpenAI
- `ENABLE_TTS`: (por defecto: `false`) Si habilitar Text-to-Speech
- `COOLDOWN_DURATION`: (por defecto: `10`) Duración del cooldown en segundos entre respuestas

#### 6.4. Control de Acceso por Suscriptores

- `SUBSCRIBERS_ONLY`: (por defecto: `false`) Si restringir el uso del bot solo a suscriptores
- `MODERATORS_BYPASS`: (por defecto: `true`) Si los moderadores pueden saltarse las restricciones de suscriptor

#### 6.5. Configuración Avanzada de OpenAI

- `MODEL_NAME`: (por defecto: `gpt-5-chat-latest`) Modelo de OpenAI a usar
- `TEMPERATURE`: (por defecto: `1.0`) Controla la aleatoriedad en la primera interacción
- `SECOND_TEMPERATURE`: (por defecto: `1.3`) Aumenta creatividad a partir de la segunda interacción del mismo usuario
- `TOP_P`: (por defecto: `1.0`)
- `SECOND_TOP_P`: (por defecto: `1.0`)
- `MAX_TOKENS`: (por defecto: `200`) Número máximo de tokens en la respuesta (alias: `MAX_COMPLETION_TOKENS`)
- `FREQUENCY_PENALTY`: (por defecto: `0.5`)
- `PRESENCE_PENALTY`: (por defecto: `0.0`)
- `HISTORY_LENGTH`: (por defecto: `5`)

---

## 💬 Uso del Bot

### Comandos

Puedes interactuar con el bot usando comandos en el chat de Twitch. Por defecto, el comando es `!gpt`. Puedes cambiarlo en las variables de entorno.

### Ejemplo

Para usar el comando `!gpt`:

```twitch
!gpt ¿Cómo está el clima hoy?
```

El bot responderá con un mensaje generado por OpenAI.

### Control de Suscriptores

Si `SUBSCRIBERS_ONLY` está habilitado:
- Solo los suscriptores del canal pueden usar el bot
- Los moderadores pueden saltarse esta restricción si `MODERATORS_BYPASS` está habilitado
- Los no suscriptores recibirán un mensaje explicando la restricción

### Endpoints de API

El bot proporciona varios endpoints de API:

- `GET /gpt/:text` - Generar una respuesta (para integraciones externas)
- `GET /metrics` - Obtener métricas del bot
- `GET /health` - Verificar estado de salud del bot
- `POST /clear-cache` - Limpiar cache del bot

---

## 🎛️ Ajuste Fino de Parámetros de OpenAI

Sugerencias:
- Si quieres más creatividad: sube `SECOND_TEMPERATURE` a `1.5` y/o baja `FREQUENCY_PENALTY` a `0.2`.
- Si quieres respuestas más concisas: baja `SECOND_TEMPERATURE` a `1.1` y `TOP_P` a `0.9`.

---

## 📊 Monitoreo y Métricas

Visita `/metrics` para ver estadísticas de uso y salud.

---

## 🚀 Scripts Disponibles

```bash
npm start
npm run dev
npm test
```

---

## 📄 Licencia

MIT